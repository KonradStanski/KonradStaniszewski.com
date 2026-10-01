import routeManifest from "@/data/bc-backroads/routes-metadata.json";
import type { RouteKind, RouteRecord, RouteRegion } from "./types";

export const routes = routeManifest as RouteRecord[];

export const routesById = new Map(routes.map((route) => [route.id, route]));

export const regions: Array<"All" | RouteRegion> = [
  "All",
  "Lower Mainland",
  "Island",
  "Rockies",
];

export const routeKinds: Array<{
  id: RouteKind;
  label: string;
  color: string;
}> = [
  { id: "primary", label: "Primary", color: "#4c9487" },
  { id: "candidate", label: "Candidates", color: "#d79a2c" },
  { id: "spur", label: "Spurs", color: "#71859b" },
  { id: "trail-system", label: "Trail systems", color: "#91aa9b" },
  { id: "constraint", label: "Constraints", color: "#d26854" },
];

export const kindLabels = Object.fromEntries(
  routeKinds.map(({ id, label }) => [id, label]),
) as Record<RouteKind, string>;

export const kindColors = Object.fromEntries(
  routeKinds.map(({ id, color }) => [id, color]),
) as Record<RouteKind, string>;

export const localGpxUrl = (route: RouteRecord) =>
  `/data/bc-backroads/routes/${route.slug}.gpx`;
