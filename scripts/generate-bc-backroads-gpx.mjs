import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const scriptDirectory = dirname(fileURLToPath(import.meta.url));
const projectRoot = join(scriptDirectory, "..");
const manifestPath = join(projectRoot, "data/bc-backroads/routes.json");
const metadataPath = join(
  projectRoot,
  "data/bc-backroads/routes-metadata.json",
);
const outputDirectory = join(
  projectRoot,
  "public/data/bc-backroads/routes",
);

const routes = JSON.parse(await readFile(manifestPath, "utf8"));

const escapeXml = (value) =>
  String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&apos;");

const trackPoints = (route) =>
  route.coordinates
    .map(
      ([longitude, latitude]) =>
        `      <trkpt lat="${latitude}" lon="${longitude}" />`,
    )
    .join("\n");

const routeTrack = (route, indent = "  ") => `${indent}<trk>
${indent}  <name>${escapeXml(route.name)}</name>
${indent}  <type>${escapeXml(route.kind)}</type>
${indent}  <extensions>
${indent}    <bcbr:routeId>${escapeXml(route.id)}</bcbr:routeId>
${indent}    <bcbr:geometryPolicy>${escapeXml(route.geometryPolicy)}</bcbr:geometryPolicy>
${route.geometrySource ? `${indent}    <bcbr:geometrySource>${escapeXml(route.geometrySource)}</bcbr:geometrySource>\n${indent}    <bcbr:geometryUpdatedAt>${escapeXml(route.geometryUpdatedAt)}</bcbr:geometryUpdatedAt>\n${indent}    <bcbr:pointCount>${route.geometryPointCount ?? route.coordinates.length}</bcbr:pointCount>` : `${indent}    <bcbr:geometrySource>Coarse corridor overview</bcbr:geometrySource>\n${indent}    <bcbr:pointCount>${route.coordinates.length}</bcbr:pointCount>`}
${indent}  </extensions>
${indent}  <trkseg>
${trackPoints(route)}
${indent}  </trkseg>
${indent}</trk>`;

const gpxDocument = (body, title, description, includesOsmGeometry) => `<?xml version="1.0" encoding="UTF-8"?>
<gpx version="1.1"
  creator="BC Backroads research map"
  xmlns="http://www.topografix.com/GPX/1/1"
  xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
  xmlns:bcbr="https://konradstaniszewski.com/ns/bc-backroads/1"
  xsi:schemaLocation="http://www.topografix.com/GPX/1/1 http://www.topografix.com/GPX/1/1/gpx.xsd">
  <metadata>
    <name>${escapeXml(title)}</name>
    <desc>${escapeXml(description)}</desc>
${includesOsmGeometry ? `    <copyright author="OpenStreetMap contributors">
      <year>2026</year>
      <license>https://opendatacommons.org/licenses/odbl/1-0/</license>
    </copyright>\n` : ""}    <time>2026-09-09T00:00:00Z</time>
  </metadata>
${body}
</gpx>
`;

await mkdir(outputDirectory, { recursive: true });

const routeMetadata = routes.map(
  ({ coordinates, controlPoints: _controlPoints, ...route }) => ({
    ...route,
    geometryPointCount: route.geometryPointCount ?? coordinates.length,
  }),
);

await writeFile(
  metadataPath,
  `${JSON.stringify(routeMetadata, null, 2)}\n`,
  "utf8",
);

await Promise.all(
  routes.map(async (route) => {
    const geometryDescription = route.geometrySource
      ? "Road geometry derived from OpenStreetMap contributors under ODbL; route selection is an independently authored research overview."
      : "Coarse corridor geometry; not a turn-by-turn track.";
    const description = `${route.description} ${geometryDescription} Verify land access, closures, gates, weather and field signage.`;
    const contents = gpxDocument(
      routeTrack(route),
      `${route.id} · ${route.name}`,
      description,
      Boolean(route.geometrySource),
    );

    await writeFile(
      join(outputDirectory, `${route.slug}.gpx`),
      contents,
      "utf8",
    );
  }),
);

const combinedTracks = routes
  .map((route) => routeTrack(route))
  .join("\n");

await writeFile(
  join(projectRoot, "public/data/bc-backroads/routes.gpx"),
  gpxDocument(
    combinedTracks,
    "BC Backroads route research overview",
    `${routes.length} route and area overviews. Road-matched records use OpenStreetMap geometry under ODbL; other records remain coarse corridors. Not for turn-by-turn navigation. Verify all access and conditions.`,
    routes.some((route) => route.geometrySource),
  ),
  "utf8",
);

console.log(
  `Generated lightweight route metadata, ${routes.length} individual GPX files and routes.gpx.`,
);
