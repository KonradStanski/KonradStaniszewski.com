import { readFile, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const routeIds = new Set(
  process.argv.slice(2).filter((argument) => /^[A-Z]{2}-\d{2}$/.test(argument)),
);

if (!routeIds.size) {
  throw new Error(
    "Usage: node scripts/restore-bc-backroads-control-points.mjs ROUTE_ID [ROUTE_ID ...]",
  );
}

const scriptDirectory = dirname(fileURLToPath(import.meta.url));
const projectRoot = join(scriptDirectory, "..");
const manifestPath = join(projectRoot, "data/bc-backroads/routes.json");
const auditPath = join(projectRoot, "research/bc-backroads-geometry-audit.json");
const routes = JSON.parse(await readFile(manifestPath, "utf8"));
const restored = [];

for (const route of routes) {
  if (!routeIds.has(route.id)) continue;
  if (!route.controlPoints) {
    throw new Error(`${route.id} has no preserved control points to restore.`);
  }

  route.coordinates = route.controlPoints;
  delete route.controlPoints;
  delete route.geometrySource;
  delete route.geometrySourceUrl;
  delete route.geometryUpdatedAt;
  delete route.geometryPointCount;
  restored.push(route.id);
}

if (restored.length !== routeIds.size) {
  const missing = [...routeIds].filter((routeId) => !restored.includes(routeId));
  throw new Error(`Routes not restored: ${missing.join(", ")}`);
}

await writeFile(manifestPath, `${JSON.stringify(routes, null, 2)}\n`, "utf8");

try {
  const audit = JSON.parse(await readFile(auditPath, "utf8"));
  audit.generatedAt = "2026-09-09";
  audit.acceptedCount = audit.results.filter((result) => {
    if (!restored.includes(result.id)) return result.accepted;
    result.accepted = false;
    result.reason =
      "Restored to coarse control points after rendered QA found unreliable loop topology.";
    return false;
  }).length;
  await writeFile(auditPath, `${JSON.stringify(audit, null, 2)}\n`, "utf8");
} catch (error) {
  if (error?.code !== "ENOENT") throw error;
}

console.log(`Restored coarse control points for: ${restored.join(", ")}`);
