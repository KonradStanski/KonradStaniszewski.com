import { copyFileSync, mkdirSync } from "node:fs";
import { createRequire } from "node:module";
import path from "node:path";

const require = createRequire(import.meta.url);
const distributionDirectory = path.join(
  path.dirname(require.resolve("maplibre-gl/package.json")),
  "dist",
);
const destinationDirectory = path.join(
  process.cwd(),
  "public",
  "maplibre",
);

mkdirSync(destinationDirectory, { recursive: true });

for (const file of ["maplibre-gl-worker.mjs", "maplibre-gl-shared.mjs"]) {
  copyFileSync(
    path.join(distributionDirectory, file),
    path.join(destinationDirectory, file),
  );
}

