import { useEffect, useRef, useState } from "react";
import * as maplibregl from "maplibre-gl";
import {
  type ExpressionSpecification,
  type GeoJSONSource,
  type Map as MapLibreMap,
  type MapLayerMouseEvent,
  type MapMouseEvent,
} from "maplibre-gl";
import type { FeatureCollection, LineString } from "geojson";
import { LayersIcon, LocateIcon, MountainIcon } from "./icons";
import type {
  RouteFeatureCollection,
  RouteKind,
} from "./types";

const BASE_STYLE = "https://tiles.openfreemap.org/styles/liberty";
const WORKER_URL = "/maplibre/maplibre-gl-worker.mjs";
const EMPTY_FILTER: ExpressionSpecification = ["==", ["get", "id"], ""];
const layerKinds: RouteKind[] = [
  "primary",
  "candidate",
  "spur",
  "trail-system",
  "constraint",
];

const kindStyles: Record<
  RouteKind,
  { color: string; width: number; dash?: number[] }
> = {
  primary: { color: "#3f887c", width: 2.8 },
  candidate: { color: "#d89525", width: 2.5, dash: [2, 1.7] },
  spur: { color: "#6f8499", width: 2.4, dash: [1, 2] },
  "trail-system": { color: "#75978b", width: 2.2, dash: [1.2, 1.2] },
  constraint: { color: "#ce5e4d", width: 3, dash: [2, 1] },
};

export interface MapHoverState {
  routeId: string;
  x: number;
  y: number;
}

interface MapCanvasProps {
  routeData: RouteFeatureCollection;
  visibleRouteIds: string[];
  selectedRouteId: string | null;
  hoveredRouteId: string | null;
  focusToken: number;
  onHover: (hover: MapHoverState | null) => void;
  onSelect: (routeId: string, focus: boolean) => void;
  onMapClick: () => void;
}

const getVisibleFilter = (ids: string[]): ExpressionSpecification => [
  "in",
  ["get", "id"],
  ["literal", ids],
];

function getFeatureId(event: MapLayerMouseEvent) {
  const id = event.features?.[0]?.properties?.id;
  return typeof id === "string" ? id : null;
}

export function MapCanvas({
  routeData,
  visibleRouteIds,
  selectedRouteId,
  hoveredRouteId,
  focusToken,
  onHover,
  onSelect,
  onMapClick,
}: MapCanvasProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<MapLibreMap | null>(null);
  const initialVisibleRouteIdsRef = useRef(visibleRouteIds);
  const [mapReady, setMapReady] = useState(false);
  const [tilted, setTilted] = useState(false);

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;

    // A hot reload can preserve the previous ready flag while replacing the map.
    // Reset it before creating a style that has not loaded yet.
    setMapReady(false);
    maplibregl.setWorkerUrl(WORKER_URL);

    const map = new maplibregl.Map({
      container: containerRef.current,
      style: BASE_STYLE,
      center: [-121.85, 50.15],
      zoom: 5.1,
      attributionControl: {
        compact: true,
      },
      cooperativeGestures: false,
      pitchWithRotate: true,
      maxPitch: 65,
    });

    map.addControl(
      new maplibregl.NavigationControl({
        showCompass: false,
        visualizePitch: false,
      }),
      "top-right",
    );

    const handlePointerMove = (event: MapLayerMouseEvent) => {
      const routeId = getFeatureId(event);
      if (!routeId) return;
      map.getCanvas().style.cursor = "pointer";
      onHover({ routeId, x: event.point.x, y: event.point.y });
    };

    const handlePointerLeave = () => {
      map.getCanvas().style.cursor = "";
      onHover(null);
    };

    const handleRouteClick = (event: MapLayerMouseEvent) => {
      const routeId = getFeatureId(event);
      if (!routeId) return;
      event.preventDefault();
      onSelect(routeId, false);
    };

    map.on("load", () => {
      map.addSource("bc-backroads-routes", {
        type: "geojson",
        data: routeData as FeatureCollection<LineString>,
      });

      layerKinds.forEach((kind) => {
        const style = kindStyles[kind];
        map.addLayer({
          id: `route-${kind}`,
          type: "line",
          source: "bc-backroads-routes",
          filter: ["==", ["get", "kind"], kind],
          layout: {
            "line-cap": "round",
            "line-join": "round",
          },
          paint: {
            "line-color": style.color,
            "line-width": [
              "interpolate",
              ["linear"],
              ["zoom"],
              4,
              style.width,
              9,
              style.width + 2,
            ],
            "line-opacity": kind === "constraint" ? 0.9 : 0.78,
            ...(style.dash ? { "line-dasharray": style.dash } : {}),
          },
        });
      });

      map.addLayer({
        id: "route-selected-casing",
        type: "line",
        source: "bc-backroads-routes",
        filter: EMPTY_FILTER,
        layout: { "line-cap": "round", "line-join": "round" },
        paint: {
          "line-color": "#fff4dc",
          "line-width": ["interpolate", ["linear"], ["zoom"], 4, 7, 9, 11],
          "line-opacity": 0.9,
          "line-blur": 1.2,
        },
      });

      map.addLayer({
        id: "route-selected",
        type: "line",
        source: "bc-backroads-routes",
        filter: EMPTY_FILTER,
        layout: { "line-cap": "round", "line-join": "round" },
        paint: {
          "line-color": "#ed9d18",
          "line-width": ["interpolate", ["linear"], ["zoom"], 4, 4, 9, 7],
          "line-opacity": 1,
        },
      });

      map.addLayer({
        id: "route-hovered",
        type: "line",
        source: "bc-backroads-routes",
        filter: EMPTY_FILTER,
        layout: { "line-cap": "round", "line-join": "round" },
        paint: {
          "line-color": "#f8c65e",
          "line-width": 5,
          "line-opacity": 0.95,
        },
      });

      map.addLayer({
        id: "route-hit-area",
        type: "line",
        source: "bc-backroads-routes",
        filter: getVisibleFilter(initialVisibleRouteIdsRef.current),
        layout: { "line-cap": "round", "line-join": "round" },
        paint: {
          "line-color": "rgba(0,0,0,0)",
          "line-width": 16,
        },
      });

      map.on("mousemove", "route-hit-area", handlePointerMove);
      map.on("mouseleave", "route-hit-area", handlePointerLeave);
      map.on("click", "route-hit-area", handleRouteClick);
      setMapReady(true);
    });

    map.on("click", (event: MapMouseEvent) => {
      if (!map.getLayer("route-hit-area")) {
        onMapClick();
        return;
      }
      const hit = map.queryRenderedFeatures(event.point, {
        layers: ["route-hit-area"],
      });
      if (!hit.length) onMapClick();
    });

    mapRef.current = map;

    return () => {
      map.remove();
      mapRef.current = null;
    };
  }, [onHover, onMapClick, onSelect, routeData]);

  useEffect(() => {
    const map = mapRef.current;
    if (
      !mapReady ||
      !map?.isStyleLoaded() ||
      !map.getLayer("route-hit-area")
    ) {
      return;
    }

    const source = map.getSource("bc-backroads-routes") as
      | GeoJSONSource
      | undefined;
    source?.setData(routeData as FeatureCollection<LineString>);

    const visibleFilter = getVisibleFilter(visibleRouteIds);
    map.setFilter("route-hit-area", visibleFilter);
    layerKinds.forEach((kind) => {
      map.setFilter(`route-${kind}`, [
        "all",
        ["==", ["get", "kind"], kind],
        visibleFilter,
      ]);
    });
  }, [mapReady, routeData, visibleRouteIds]);

  useEffect(() => {
    const map = mapRef.current;
    if (
      !mapReady ||
      !map?.isStyleLoaded() ||
      !map.getLayer("route-selected-casing") ||
      !map.getLayer("route-selected")
    ) {
      return;
    }
    const selectedFilter: ExpressionSpecification = selectedRouteId
      ? ["==", ["get", "id"], selectedRouteId]
      : EMPTY_FILTER;
    map.setFilter("route-selected-casing", selectedFilter);
    map.setFilter("route-selected", selectedFilter);
  }, [mapReady, selectedRouteId]);

  useEffect(() => {
    const map = mapRef.current;
    if (
      !mapReady ||
      !map?.isStyleLoaded() ||
      !map.getLayer("route-hovered")
    ) {
      return;
    }
    map.setFilter(
      "route-hovered",
      hoveredRouteId
        ? ["==", ["get", "id"], hoveredRouteId]
        : EMPTY_FILTER,
    );
  }, [hoveredRouteId, mapReady]);

  useEffect(() => {
    const map = mapRef.current;
    if (!mapReady || !map || !selectedRouteId || focusToken === 0) return;

    const feature = routeData.features.find(
      (candidate) => candidate.properties.id === selectedRouteId,
    );
    if (!feature) return;

    const [first, ...rest] = feature.geometry.coordinates;
    const bounds = rest.reduce(
      (value, coordinate) => value.extend(coordinate),
      new maplibregl.LngLatBounds(first, first),
    );
    const mobile = window.matchMedia("(max-width: 760px)").matches;

    map.fitBounds(bounds, {
      padding: mobile
        ? { top: 100, right: 54, bottom: 380, left: 38 }
        : { top: 100, right: 330, bottom: 100, left: 90 },
      maxZoom: 9,
      duration: 750,
    });
  }, [focusToken, mapReady, routeData, selectedRouteId]);

  const toggleTilt = () => {
    const map = mapRef.current;
    if (!map) return;
    const nextTilted = !tilted;
    setTilted(nextTilted);
    map.easeTo({ pitch: nextTilted ? 48 : 0, duration: 500 });
  };

  const locateUser = () => {
    if (!navigator.geolocation) return;
    navigator.geolocation.getCurrentPosition(({ coords }) => {
      mapRef.current?.easeTo({
        center: [coords.longitude, coords.latitude],
        zoom: 9,
        duration: 700,
      });
    });
  };

  return (
    <div className="mapCanvasWrap">
      <div aria-label="Interactive BC adventure route map" className="mapCanvas" ref={containerRef} />
      <div className="fieldMapControls">
        <button
          aria-label="Locate me"
          className="mapToolButton"
          onClick={locateUser}
          title="Locate me"
          type="button"
        >
          <LocateIcon size={20} />
        </button>
        <button
          aria-label="Tilt terrain view"
          aria-pressed={tilted}
          className="mapToolButton"
          onClick={toggleTilt}
          title="Tilt terrain view"
          type="button"
        >
          {tilted ? <LayersIcon size={20} /> : <MountainIcon size={20} />}
        </button>
      </div>
    </div>
  );
}
