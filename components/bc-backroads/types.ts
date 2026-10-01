export type RouteRegion = "Lower Mainland" | "Island" | "Rockies";
export type RouteKind =
  | "primary"
  | "candidate"
  | "spur"
  | "trail-system"
  | "constraint";
export type RouteStatus =
  | "open-reported"
  | "verify"
  | "seasonal"
  | "closed"
  | "historical";
export type ConfidenceGrade = "A" | "B" | "C";
export type GeometryPolicy = "overview" | "link-only";

export type Coordinate = [number, number];

export interface RouteRecord {
  id: string;
  slug: string;
  name: string;
  region: RouteRegion;
  kind: RouteKind;
  distanceKm: number | null;
  surface: string;
  bikeClass: string;
  season: string;
  status: RouteStatus;
  statusLabel: string;
  confidence: ConfidenceGrade;
  description: string;
  sourceLabel: string;
  sourceUrl: string;
  geometryPolicy: GeometryPolicy;
  coordinates?: Coordinate[];
  controlPoints?: Coordinate[];
  geometrySource?: string;
  geometrySourceUrl?: string;
  geometryUpdatedAt?: string;
  geometryPointCount: number;
}

export interface RouteFeatureProperties {
  id: string;
  name: string;
  kind: RouteKind;
  region: RouteRegion;
  status: RouteStatus;
}

export interface RouteFeatureCollection {
  type: "FeatureCollection";
  features: Array<{
    type: "Feature";
    geometry: {
      type: "LineString";
      coordinates: Coordinate[];
    };
    properties: RouteFeatureProperties;
  }>;
}
