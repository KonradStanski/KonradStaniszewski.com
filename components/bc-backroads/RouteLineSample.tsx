import { kindColors } from "./data";
import type { RouteKind } from "./types";

export function RouteLineSample({ kind }: { kind: RouteKind }) {
  return (
    <span
      aria-hidden="true"
      className={`routeLineSample routeLineSample_${kind}`}
      style={{ "--sample-color": kindColors[kind] } as React.CSSProperties}
    />
  );
}
