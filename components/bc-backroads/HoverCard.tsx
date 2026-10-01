import { RouteLineSample } from "./RouteLineSample";
import type { RouteRecord } from "./types";

export function HoverCard({
  route,
  x,
  y,
}: {
  route: RouteRecord;
  x: number;
  y: number;
}) {
  return (
    <div
      className="hoverCard"
      style={{
        left: `min(calc(100% - 282px), ${x + 18}px)`,
        top: `min(calc(100% - 150px), ${y + 18}px)`,
      }}
    >
      <div className="hoverCardTitle">
        <RouteLineSample kind={route.kind} />
        <strong>{route.name}</strong>
      </div>
      <span>{route.region}</span>
      <p>
        {route.distanceKm ? `${route.distanceKm} km · ` : ""}
        {route.surface}
      </p>
      <em>{route.statusLabel}</em>
      <small>
        {route.geometrySource
          ? `${route.geometryPointCount.toLocaleString()} road points · `
          : "Coarse corridor · "}
        Click to pin details
      </small>
    </div>
  );
}
