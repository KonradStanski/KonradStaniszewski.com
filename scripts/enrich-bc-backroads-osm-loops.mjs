import { readFile, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const applyChanges = process.argv.includes("--apply");
const requestedRouteIds = new Set(
  process.argv.slice(2).filter((argument) => /^[A-Z]{2}-\d{2}$/.test(argument)),
);

if (!requestedRouteIds.size) {
  throw new Error(
    "Usage: node scripts/enrich-bc-backroads-osm-loops.mjs ROUTE_ID [ROUTE_ID ...] [--apply]",
  );
}

const scriptDirectory = dirname(fileURLToPath(import.meta.url));
const projectRoot = join(scriptDirectory, "..");
const manifestPath = join(projectRoot, "data/bc-backroads/routes.json");
const auditPath = join(projectRoot, "research/bc-backroads-geometry-audit.json");
const routerUrl = process.env.BCBR_OSRM_URL ?? "https://router.project-osrm.org";
const routes = JSON.parse(await readFile(manifestPath, "utf8"));

const radians = (degrees) => (degrees * Math.PI) / 180;
const distanceMetres = ([longitudeA, latitudeA], [longitudeB, latitudeB]) => {
  const earthRadius = 6_371_000;
  const latitudeDelta = radians(latitudeB - latitudeA);
  const longitudeDelta = radians(longitudeB - longitudeA);
  const value =
    Math.sin(latitudeDelta / 2) ** 2 +
    Math.cos(radians(latitudeA)) *
      Math.cos(radians(latitudeB)) *
      Math.sin(longitudeDelta / 2) ** 2;
  return earthRadius * 2 * Math.atan2(Math.sqrt(value), Math.sqrt(1 - value));
};

const roundCoordinate = ([longitude, latitude]) => [
  Number(longitude.toFixed(6)),
  Number(latitude.toFixed(6)),
];

const results = [];

for (const routeId of requestedRouteIds) {
  const route = routes.find((candidate) => candidate.id === routeId);
  if (!route) throw new Error(`Unknown route ${routeId}.`);

  const controlPoints = route.controlPoints ?? route.coordinates;
  const closureDistanceMetres = distanceMetres(
    controlPoints[0],
    controlPoints.at(-1),
  );

  if (closureDistanceMetres > 2_000) {
    results.push({
      id: route.id,
      name: route.name,
      accepted: false,
      reason: `Control line is not closed (${Math.round(closureDistanceMetres)} m endpoint gap).`,
    });
    continue;
  }

  const uniqueStops = controlPoints.slice(0, -1);
  const coordinatePath = uniqueStops
    .map(([longitude, latitude]) => `${longitude},${latitude}`)
    .join(";");
  const url = new URL(`/trip/v1/driving/${coordinatePath}`, routerUrl);
  url.searchParams.set("roundtrip", "true");
  url.searchParams.set("source", "first");
  url.searchParams.set("destination", "any");
  url.searchParams.set("overview", "full");
  url.searchParams.set("geometries", "geojson");
  url.searchParams.set("steps", "false");

  try {
    const response = await fetch(url, {
      headers: { "User-Agent": "BC-Backroads-route-research/1.0" },
    });
    const data = await response.json();
    const candidate = data.trips?.[0];

    if (!response.ok || data.code !== "Ok" || !candidate?.geometry?.coordinates) {
      results.push({
        id: route.id,
        name: route.name,
        accepted: false,
        reason: data.message ?? `Router returned ${response.status}.`,
      });
      continue;
    }

    const coordinates = candidate.geometry.coordinates.map(roundCoordinate);
    const routedDistanceKm = candidate.distance / 1000;
    const publishedRatio = route.distanceKm
      ? routedDistanceKm / route.distanceKm
      : null;
    const maxWaypointSnapMetres = Math.max(
      ...data.waypoints.map((waypoint) => waypoint.distance ?? Infinity),
    );
    const outputClosureMetres = distanceMetres(
      coordinates[0],
      coordinates.at(-1),
    );
    const plausibleDistance =
      publishedRatio === null ||
      (publishedRatio >= 0.6 && publishedRatio <= 1.4);
    const accepted =
      coordinates.length >= 25 &&
      maxWaypointSnapMetres <= 2_000 &&
      outputClosureMetres <= 100 &&
      plausibleDistance;
    const reason = accepted
      ? "Closed OSM road circuit optimized from unordered loop stops."
      : [
          coordinates.length < 25 ? `only ${coordinates.length} points` : null,
          maxWaypointSnapMetres > 2_000
            ? `waypoint snap ${Math.round(maxWaypointSnapMetres)} m`
            : null,
          outputClosureMetres > 100
            ? `output endpoint gap ${Math.round(outputClosureMetres)} m`
            : null,
          !plausibleDistance
            ? `published-distance ratio ${publishedRatio.toFixed(2)}`
            : null,
        ]
          .filter(Boolean)
          .join("; ");

    if (accepted && applyChanges) {
      route.controlPoints ??= route.coordinates;
      route.coordinates = coordinates;
      route.geometrySource = "OpenStreetMap optimized loop routing";
      route.geometrySourceUrl = "https://www.openstreetmap.org/copyright";
      route.geometryUpdatedAt = "2026-09-09";
      route.geometryPointCount = coordinates.length;
    }

    results.push({
      id: route.id,
      name: route.name,
      accepted,
      reason,
      originalPointCount: controlPoints.length,
      candidatePointCount: coordinates.length,
      routedDistanceKm: Number(routedDistanceKm.toFixed(1)),
      publishedDistanceKm: route.distanceKm,
      publishedRatio:
        publishedRatio === null ? null : Number(publishedRatio.toFixed(2)),
      maxWaypointSnapMetres: Math.round(maxWaypointSnapMetres),
      outputClosureMetres: Math.round(outputClosureMetres),
      stopOrder: data.waypoints
        .map((waypoint, inputIndex) => ({
          inputIndex,
          tripIndex: waypoint.waypoint_index,
        }))
        .sort((a, b) => a.tripIndex - b.tripIndex)
        .map(({ inputIndex }) => inputIndex),
    });
  } catch (error) {
    results.push({
      id: route.id,
      name: route.name,
      accepted: false,
      reason: error instanceof Error ? error.message : String(error),
    });
  }
}

if (applyChanges) {
  await writeFile(manifestPath, `${JSON.stringify(routes, null, 2)}\n`, "utf8");
  try {
    const audit = JSON.parse(await readFile(auditPath, "utf8"));
    audit.loopMatching = {
      generatedAt: "2026-09-09",
      method: "OSRM Trip closed-circuit optimization",
      results,
    };
    audit.currentRoadMatchedCount = routes.filter(
      (route) => route.geometrySource,
    ).length;
    await writeFile(auditPath, `${JSON.stringify(audit, null, 2)}\n`, "utf8");
  } catch (error) {
    if (error?.code !== "ENOENT") throw error;
  }
}

console.table(
  results.map((result) => ({
    id: result.id,
    accepted: result.accepted,
    points: result.candidatePointCount ?? "–",
    snapM: result.maxWaypointSnapMetres ?? "–",
    routedKm: result.routedDistanceKm ?? "–",
    ratio: result.publishedRatio ?? "–",
    stopOrder: result.stopOrder?.join("→") ?? "–",
    reason: result.reason,
  })),
);
