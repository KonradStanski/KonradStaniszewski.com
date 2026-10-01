import { readFile, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const scriptDirectory = dirname(fileURLToPath(import.meta.url));
const projectRoot = join(scriptDirectory, "..");
const manifestPath = join(projectRoot, "data/bc-backroads/routes.json");
const auditPath = join(
  projectRoot,
  "research/bc-backroads-geometry-audit.json",
);
const applyChanges = process.argv.includes("--apply");
const routerUrl = process.env.BCBR_OSRM_URL ?? "https://router.project-osrm.org";
const routerExcludedRouteIds = new Set([
  "VI-14", // Khyber is a technical alternate, not a car-routing problem.
  "VI-01", // Sparse loop controls produce incorrect cross-island connectors.
  "VI-02", // Keep closed-loop topology coarse until it is independently traced.
  "VI-13", // Sparse loop controls produce incorrect North Island connectors.
  "VI-20", // Historical loop alignment needs manual access-aware tracing.
  "VI-22", // Historical circuit alignment needs manual access-aware tracing.
  "VI-24", // Bicycle intelligence overlay contains non-motorized segments.
  "VI-25", // Bicycle intelligence overlay contains non-motorized segments.
  "RI-13", // EVADRS is a bundle of routes, not one continuous line.
  "RI-14", // Koocanusa is a designated network, not one continuous line.
  "RI-17", // Research record explicitly has no verified through connection.
  "RI-07", // Whipsaw is a technical 4x4 trail; car routing can choose a bypass.
  "RI-12", // Closed-loop controls are insufficient to select the intended roads.
]);

const routes = JSON.parse(await readFile(manifestPath, "utf8"));

const sleep = (milliseconds) =>
  new Promise((resolve) => setTimeout(resolve, milliseconds));

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

const lineDistanceMetres = (coordinates) =>
  coordinates
    .slice(1)
    .reduce(
      (total, coordinate, index) =>
        total + distanceMetres(coordinates[index], coordinate),
      0,
    );

const roundCoordinate = ([longitude, latitude]) => [
  Number(longitude.toFixed(6)),
  Number(latitude.toFixed(6)),
];

const results = [];

for (const route of routes) {
  const originalPointCount = route.coordinates.length;
  const coarseDistanceKm = lineDistanceMetres(route.coordinates) / 1000;

  if (
    route.kind === "trail-system" ||
    route.kind === "constraint" ||
    routerExcludedRouteIds.has(route.id)
  ) {
    results.push({
      id: route.id,
      name: route.name,
      accepted: false,
      reason: routerExcludedRouteIds.has(route.id)
        ? "Skipped by route-specific safety rule; car routing would misrepresent this record."
        : `Skipped ${route.kind}; a road router cannot represent an area or closure reliably.`,
      originalPointCount,
    });
    continue;
  }

  const coordinatePath = route.coordinates
    .map(([longitude, latitude]) => `${longitude},${latitude}`)
    .join(";");
  const url = new URL(`/route/v1/driving/${coordinatePath}`, routerUrl);
  url.searchParams.set("overview", "full");
  url.searchParams.set("geometries", "geojson");
  url.searchParams.set("steps", "false");

  try {
    const response = await fetch(url, {
      headers: { "User-Agent": "BC-Backroads-route-research/1.0" },
    });
    const data = await response.json();
    const candidate = data.routes?.[0];

    if (!response.ok || data.code !== "Ok" || !candidate?.geometry?.coordinates) {
      results.push({
        id: route.id,
        name: route.name,
        accepted: false,
        reason: data.message ?? `Router returned ${response.status}.`,
        originalPointCount,
      });
      await sleep(300);
      continue;
    }

    const coordinates = candidate.geometry.coordinates.map(roundCoordinate);
    const routedDistanceKm = candidate.distance / 1000;
    const maxWaypointSnapMetres = Math.max(
      ...data.waypoints.map((waypoint) => waypoint.distance ?? Infinity),
    );
    const expectedRatio = route.distanceKm
      ? routedDistanceKm / route.distanceKm
      : null;
    const coarseRatio = routedDistanceKm / Math.max(coarseDistanceKm, 0.1);
    const plausibleDistance =
      expectedRatio === null
        ? coarseRatio >= 0.85 && coarseRatio <= 2.0
        : expectedRatio >= 0.6 && expectedRatio <= 1.4;
    const accepted =
      coordinates.length >= 25 &&
      maxWaypointSnapMetres <= 2_000 &&
      plausibleDistance;

    const reason = accepted
      ? "Road-matched to OpenStreetMap geometry."
      : [
          maxWaypointSnapMetres > 2_000
            ? `waypoint snap ${Math.round(maxWaypointSnapMetres)} m`
            : null,
          expectedRatio === null &&
          (coarseRatio < 0.85 || coarseRatio > 2.0)
            ? `coarse-distance ratio ${coarseRatio.toFixed(2)}`
            : null,
          expectedRatio !== null &&
          (expectedRatio < 0.6 || expectedRatio > 1.4)
            ? `published-distance ratio ${expectedRatio.toFixed(2)}`
            : null,
          coordinates.length < 25 ? `only ${coordinates.length} points` : null,
        ]
          .filter(Boolean)
          .join("; ");

    if (accepted && applyChanges) {
      route.controlPoints ??= route.coordinates;
      route.coordinates = coordinates;
      route.geometrySource = "OpenStreetMap road routing";
      route.geometrySourceUrl = "https://www.openstreetmap.org/copyright";
      route.geometryUpdatedAt = "2026-09-09";
      route.geometryPointCount = coordinates.length;
    }

    results.push({
      id: route.id,
      name: route.name,
      accepted,
      reason,
      originalPointCount,
      candidatePointCount: coordinates.length,
      coarseDistanceKm: Number(coarseDistanceKm.toFixed(1)),
      routedDistanceKm: Number(routedDistanceKm.toFixed(1)),
      publishedDistanceKm: route.distanceKm,
      maxWaypointSnapMetres: Math.round(maxWaypointSnapMetres),
    });
  } catch (error) {
    results.push({
      id: route.id,
      name: route.name,
      accepted: false,
      reason: error instanceof Error ? error.message : String(error),
      originalPointCount,
    });
  }

  await sleep(300);
}

const acceptedResults = results.filter((result) => result.accepted);
const audit = {
  generatedAt: "2026-09-09",
  mode: applyChanges ? "apply" : "dry-run",
  router: routerUrl,
  acceptanceRules: {
    minimumPoints: 25,
    maximumWaypointSnapMetres: 2_000,
    coarseDistanceRatioWhenNoPublishedDistance: [0.85, 2.0],
    publishedDistanceRatio: [0.6, 1.4],
    excludedKinds: ["trail-system", "constraint"],
    excludedRouteIds: [...routerExcludedRouteIds],
  },
  acceptedCount: acceptedResults.length,
  totalCount: routes.length,
  results,
};

if (applyChanges) {
  await writeFile(manifestPath, `${JSON.stringify(routes, null, 2)}\n`, "utf8");
  await writeFile(auditPath, `${JSON.stringify(audit, null, 2)}\n`, "utf8");
}

console.log(
  `${applyChanges ? "Applied" : "Would apply"} OSM road geometry to ${acceptedResults.length}/${routes.length} routes.`,
);
console.table(
  results.map((result) => ({
    id: result.id,
    accepted: result.accepted,
    points: result.candidatePointCount ?? result.originalPointCount,
    snapM: result.maxWaypointSnapMetres ?? "–",
    routedKm: result.routedDistanceKm ?? "–",
    reason: result.reason,
  })),
);
