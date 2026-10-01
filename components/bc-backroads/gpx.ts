import type {
  RouteFeatureCollection,
  RouteKind,
  RouteRecord,
  RouteStatus,
} from "./types";

const GPX_NAMESPACE = "http://www.topografix.com/GPX/1/1";

export function parseRoutesGpx(
  xmlText: string,
  routesById: ReadonlyMap<string, RouteRecord>,
): RouteFeatureCollection {
  const document = new DOMParser().parseFromString(xmlText, "application/xml");
  const parserError = document.querySelector("parsererror");

  if (parserError) {
    throw new Error("Unable to parse local route GPX data.");
  }

  const trackElements = Array.from(
    document.getElementsByTagNameNS(GPX_NAMESPACE, "trk"),
  );

  const features = trackElements.flatMap((track) => {
    const routeId = track.getElementsByTagNameNS(
      "https://konradstaniszewski.com/ns/bc-backroads/1",
      "routeId",
    )[0]?.textContent;

    if (!routeId) return [];

    const route = routesById.get(routeId);
    if (!route) return [];

    const coordinates = Array.from(
      track.getElementsByTagNameNS(GPX_NAMESPACE, "trkpt"),
    ).flatMap((point) => {
      const latitude = Number(point.getAttribute("lat"));
      const longitude = Number(point.getAttribute("lon"));
      return Number.isFinite(latitude) && Number.isFinite(longitude)
        ? ([[longitude, latitude]] as [number, number][])
        : [];
    });

    if (coordinates.length < 2) return [];

    return [
      {
        type: "Feature" as const,
        geometry: {
          type: "LineString" as const,
          coordinates,
        },
        properties: {
          id: route.id,
          name: route.name,
          kind: route.kind as RouteKind,
          region: route.region,
          status: route.status as RouteStatus,
        },
      },
    ];
  });

  return { type: "FeatureCollection", features };
}
