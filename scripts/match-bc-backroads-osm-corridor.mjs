import { readFile, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const routeId = process.argv.find((argument) => /^[A-Z]{2}-\d{2}$/.test(argument));
const applyChanges = process.argv.includes("--apply");
const inputPath = process.argv
  .find((argument) => argument.startsWith("--input="))
  ?.split("=")[1];
const radiusMetres = Number(
  process.argv.find((argument) => argument.startsWith("--radius="))?.split("=")[1] ??
    3_500,
);

if (!routeId) {
  throw new Error(
    "Usage: node scripts/match-bc-backroads-osm-corridor.mjs ROUTE_ID [--input=file.json] [--radius=3500] [--apply]",
  );
}

const scriptDirectory = dirname(fileURLToPath(import.meta.url));
const projectRoot = join(scriptDirectory, "..");
const manifestPath = join(projectRoot, "data/bc-backroads/routes.json");
const routes = JSON.parse(await readFile(manifestPath, "utf8"));
const route = routes.find((candidate) => candidate.id === routeId);

if (!route) throw new Error(`Unknown route ${routeId}.`);

const excludedHighways = new Set([
  "bridleway",
  "construction",
  "corridor",
  "cycleway",
  "escape",
  "footway",
  "path",
  "pedestrian",
  "platform",
  "proposed",
  "raceway",
  "steps",
]);

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

class MinHeap {
  values = [];

  push(value) {
    this.values.push(value);
    let index = this.values.length - 1;
    while (index > 0) {
      const parent = Math.floor((index - 1) / 2);
      if (this.values[parent][0] <= value[0]) break;
      this.values[index] = this.values[parent];
      index = parent;
    }
    this.values[index] = value;
  }

  pop() {
    if (!this.values.length) return null;
    const first = this.values[0];
    const last = this.values.pop();
    if (!this.values.length) return first;

    let index = 0;
    while (true) {
      const left = index * 2 + 1;
      const right = left + 1;
      if (left >= this.values.length) break;
      const child =
        right < this.values.length && this.values[right][0] < this.values[left][0]
          ? right
          : left;
      if (this.values[child][0] >= last[0]) break;
      this.values[index] = this.values[child];
      index = child;
    }
    this.values[index] = last;
    return first;
  }
}

const polyline = route.coordinates
  .map(([longitude, latitude]) => `${latitude},${longitude}`)
  .join(",");
const query = `[out:json][timeout:180];way(around:${radiusMetres},${polyline})["highway"];out tags geom;`;
let overpass;

if (inputPath) {
  overpass = JSON.parse(await readFile(inputPath, "utf8"));
} else {
  const response = await fetch("https://overpass-api.de/api/interpreter", {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      "User-Agent": "BC-Backroads-route-research/1.0",
    },
    body: new URLSearchParams({ data: query }),
  });

  if (!response.ok) throw new Error(`Overpass returned ${response.status}.`);
  overpass = await response.json();
}
const nodes = new Map();
const adjacency = new Map();

const addEdge = (from, to, coordinateFrom, coordinateTo, tags) => {
  const edges = adjacency.get(from) ?? [];
  edges.push({
    to,
    distance: distanceMetres(coordinateFrom, coordinateTo),
    name: tags.name ?? tags.ref ?? "unnamed road",
    highway: tags.highway,
  });
  adjacency.set(from, edges);
};

for (const way of overpass.elements) {
  const tags = way.tags ?? {};
  if (
    excludedHighways.has(tags.highway) ||
    [tags.access, tags.motor_vehicle, tags.motorcycle].some((value) =>
      ["no", "private"].includes(value),
    ) ||
    !Array.isArray(way.geometry)
  ) {
    continue;
  }

  const wayNodes = way.geometry.map((point) =>
    `${point.lon.toFixed(7)},${point.lat.toFixed(7)}`,
  );
  wayNodes.forEach((nodeId, index) => {
    const point = way.geometry[index];
    nodes.set(nodeId, [point.lon, point.lat]);
  });

  for (let index = 1; index < wayNodes.length; index += 1) {
    const from = wayNodes[index - 1];
    const to = wayNodes[index];
    const coordinateFrom = nodes.get(from);
    const coordinateTo = nodes.get(to);
    addEdge(from, to, coordinateFrom, coordinateTo, tags);
    addEdge(to, from, coordinateTo, coordinateFrom, tags);
  }
}

const componentByNode = new Map();
const componentNodes = [];

for (const nodeId of nodes.keys()) {
  if (componentByNode.has(nodeId)) continue;
  const componentId = componentNodes.length;
  const members = [];
  const pending = [nodeId];
  componentByNode.set(nodeId, componentId);
  while (pending.length) {
    const current = pending.pop();
    members.push(current);
    for (const edge of adjacency.get(current) ?? []) {
      if (componentByNode.has(edge.to)) continue;
      componentByNode.set(edge.to, componentId);
      pending.push(edge.to);
    }
  }
  componentNodes.push(members);
}

const bestByComponent = componentNodes.map(() =>
  route.coordinates.map(() => ({ nodeId: null, distance: Infinity })),
);

for (const [nodeId, nodeCoordinate] of nodes) {
  const componentId = componentByNode.get(nodeId);
  route.coordinates.forEach((coordinate, waypointIndex) => {
    const candidateDistance = distanceMetres(coordinate, nodeCoordinate);
    if (candidateDistance < bestByComponent[componentId][waypointIndex].distance) {
      bestByComponent[componentId][waypointIndex] = {
        nodeId,
        distance: candidateDistance,
      };
    }
  });
}

const chosenComponent = bestByComponent
  .map((waypoints, componentId) => ({
    componentId,
    waypoints,
    score:
      Math.max(...waypoints.map(({ distance }) => distance)) * 2 +
      waypoints.reduce((sum, { distance }) => sum + distance, 0),
  }))
  .sort((a, b) => a.score - b.score)[0];

const shortestPath = (start, end) => {
  const queue = new MinHeap();
  const distances = new Map([[start, 0]]);
  const previous = new Map();
  queue.push([0, start]);

  while (queue.values.length) {
    const [distance, nodeId] = queue.pop();
    if (distance !== distances.get(nodeId)) continue;
    if (nodeId === end) break;

    for (const edge of adjacency.get(nodeId) ?? []) {
      const nextDistance = distance + edge.distance;
      if (nextDistance >= (distances.get(edge.to) ?? Infinity)) continue;
      distances.set(edge.to, nextDistance);
      previous.set(edge.to, { nodeId, edge });
      queue.push([nextDistance, edge.to]);
    }
  }

  if (!distances.has(end)) return null;
  const path = [];
  let current = end;
  while (current !== start) {
    const entry = previous.get(current);
    if (!entry) return null;
    path.push({ nodeId: current, edge: entry.edge });
    current = entry.nodeId;
  }
  path.push({ nodeId: start, edge: null });
  return path.reverse();
};

const snappedWaypoints = chosenComponent.waypoints;
const combinedPath = [];

for (let index = 1; index < snappedWaypoints.length; index += 1) {
  const segment = shortestPath(
    snappedWaypoints[index - 1].nodeId,
    snappedWaypoints[index].nodeId,
  );
  if (!segment) {
    throw new Error(
      `No connected OSM road path between waypoints ${index} and ${index + 1}.`,
    );
  }
  combinedPath.push(...(index === 1 ? segment : segment.slice(1)));
}

const coordinates = combinedPath.map(({ nodeId }) => nodes.get(nodeId));
const routedDistanceKm =
  combinedPath.reduce((total, item) => total + (item.edge?.distance ?? 0), 0) /
  1000;
const maxWaypointSnapMetres = Math.max(
  ...snappedWaypoints.map(({ distance }) => distance),
);
const publishedRatio = route.distanceKm
  ? routedDistanceKm / route.distanceKm
  : null;
const roadNames = new Map();

for (const { edge } of combinedPath) {
  if (!edge) continue;
  roadNames.set(edge.name, (roadNames.get(edge.name) ?? 0) + edge.distance);
}

const summary = {
  routeId,
  name: route.name,
  radiusMetres,
  downloadedWays: overpass.elements.length,
  graphNodes: nodes.size,
  graphComponents: componentNodes.length,
  chosenComponentNodes: componentNodes[chosenComponent.componentId].length,
  pointCount: coordinates.length,
  routedDistanceKm: Number(routedDistanceKm.toFixed(1)),
  publishedDistanceKm: route.distanceKm,
  publishedRatio:
    publishedRatio === null ? null : Number(publishedRatio.toFixed(2)),
  maxWaypointSnapMetres: Math.round(maxWaypointSnapMetres),
  topRoads: [...roadNames]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 15)
    .map(([name, distance]) => ({
      name,
      distanceKm: Number((distance / 1000).toFixed(1)),
    })),
};

console.log(JSON.stringify(summary, null, 2));

if (applyChanges) {
  const plausibleDistance =
    publishedRatio === null || (publishedRatio >= 0.6 && publishedRatio <= 1.5);
  if (
    coordinates.length < 25 ||
    maxWaypointSnapMetres > 3_000 ||
    !plausibleDistance
  ) {
    throw new Error(
      `Refusing to apply implausible corridor match (points=${coordinates.length}, snap=${Math.round(maxWaypointSnapMetres)} m, published ratio=${publishedRatio?.toFixed(2) ?? "n/a"}).`,
    );
  }

  route.controlPoints ??= route.coordinates;
  route.coordinates = coordinates.map(([longitude, latitude]) => [
    Number(longitude.toFixed(6)),
    Number(latitude.toFixed(6)),
  ]);
  route.geometrySource = "OpenStreetMap corridor matching";
  route.geometrySourceUrl = "https://www.openstreetmap.org/copyright";
  route.geometryUpdatedAt = "2026-09-09";
  route.geometryPointCount = route.coordinates.length;
  await writeFile(manifestPath, `${JSON.stringify(routes, null, 2)}\n`, "utf8");
  console.log(`Applied ${route.coordinates.length} OSM road points to ${routeId}.`);
}
