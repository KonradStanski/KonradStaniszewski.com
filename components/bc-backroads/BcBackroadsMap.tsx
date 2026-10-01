import { useCallback, useDeferredValue, useEffect, useMemo, useState } from "react";
import { BrandMark } from "./BrandMark";
import { routeKinds, routes, routesById } from "./data";
import { parseRoutesGpx } from "./gpx";
import { HoverCard } from "./HoverCard";
import { RouteListIcon, SearchIcon, SlidersIcon } from "./icons";
import { MapCanvas, type MapHoverState } from "./MapCanvas";
import { RouteDetail } from "./RouteDetail";
import { RouteLineSample } from "./RouteLineSample";
import { Sidebar } from "./Sidebar";
import type {
  RouteFeatureCollection,
  RouteKind,
  RouteRegion,
} from "./types";
import styles from "./BcBackroadsMap.module.css";

const initialKinds = new Set<RouteKind>(routeKinds.map(({ id }) => id));

export default function BcBackroadsMap() {
  const [routeData, setRouteData] = useState<RouteFeatureCollection | null>(null);
  const [dataError, setDataError] = useState<string | null>(null);
  const [selectedRouteId, setSelectedRouteId] = useState<string | null>("LM-01");
  const [hover, setHover] = useState<MapHoverState | null>(null);
  const [search, setSearch] = useState("");
  const deferredSearch = useDeferredValue(search);
  const [activeRegion, setActiveRegion] = useState<"All" | RouteRegion>("All");
  const [activeKinds, setActiveKinds] = useState<Set<RouteKind>>(initialKinds);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [mobileBrowserOpen, setMobileBrowserOpen] = useState(false);
  const [mobileDetailOpen, setMobileDetailOpen] = useState(true);
  const [focusToken, setFocusToken] = useState(0);

  useEffect(() => {
    const controller = new AbortController();

    fetch("/data/bc-backroads/routes.gpx", { signal: controller.signal })
      .then((response) => {
        if (!response.ok) throw new Error(`GPX request failed (${response.status})`);
        return response.text();
      })
      .then((xml) => setRouteData(parseRoutesGpx(xml, routesById)))
      .catch((error: unknown) => {
        if (error instanceof DOMException && error.name === "AbortError") return;
        setDataError(error instanceof Error ? error.message : "Unable to load route GPX data.");
      });

    return () => controller.abort();
  }, []);

  const filteredRoutes = useMemo(() => {
    const normalizedSearch = deferredSearch.trim().toLocaleLowerCase();
    return routes
      .filter((route) => activeRegion === "All" || route.region === activeRegion)
      .filter((route) => activeKinds.has(route.kind))
      .filter((route) => {
        if (!normalizedSearch) return true;
        return [
          route.name,
          route.region,
          route.surface,
          route.bikeClass,
          route.statusLabel,
          route.description,
        ].some((value) => value.toLocaleLowerCase().includes(normalizedSearch));
      })
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [activeKinds, activeRegion, deferredSearch]);

  const visibleRouteIds = useMemo(
    () => filteredRoutes.map((route) => route.id),
    [filteredRoutes],
  );
  const selectedRoute = selectedRouteId
    ? routesById.get(selectedRouteId) ?? null
    : null;
  const hoveredRoute = hover ? routesById.get(hover.routeId) ?? null : null;

  const toggleKind = useCallback((kind: RouteKind) => {
    setActiveKinds((current) => {
      const next = new Set(current);
      if (next.has(kind)) next.delete(kind);
      else next.add(kind);
      return next;
    });
  }, []);

  const selectRoute = useCallback((routeId: string, focus = true) => {
    setSelectedRouteId(routeId);
    setMobileBrowserOpen(false);
    setMobileDetailOpen(true);
    if (focus) setFocusToken((token) => token + 1);
  }, []);

  const handleHover = useCallback((nextHover: MapHoverState | null) => {
    setHover(nextHover);
  }, []);

  const handleMapClick = useCallback(() => {
    setMobileBrowserOpen(false);
    setMobileDetailOpen(false);
  }, []);

  useEffect(() => {
    const focusSearch = (event: KeyboardEvent) => {
      if (event.key !== "/" || event.metaKey || event.ctrlKey || event.altKey) return;
      const target = event.target as HTMLElement | null;
      if (target?.matches("input, textarea, select, [contenteditable='true']")) return;
      event.preventDefault();
      document.querySelector<HTMLInputElement>("[data-route-search]")?.focus();
    };
    window.addEventListener("keydown", focusSearch);
    return () => window.removeEventListener("keydown", focusSearch);
  }, []);

  if (dataError) {
    return (
      <main className={styles.loadingState}>
        <BrandMark />
        <h1>Route data could not be loaded</h1>
        <p>{dataError}</p>
      </main>
    );
  }

  if (!routeData) {
    return (
      <main className={styles.loadingState}>
        <BrandMark />
        <div className={styles.loadingLine} />
        <p>Loading 69 local route overviews…</p>
      </main>
    );
  }

  return (
    <main
      className={`${styles.app} ${sidebarCollapsed ? styles.appSidebarCollapsed : ""}`}
    >
      <Sidebar
        activeKinds={activeKinds}
        activeRegion={activeRegion}
        collapsed={sidebarCollapsed}
        mobileOpen={mobileBrowserOpen}
        onCloseMobile={() => setMobileBrowserOpen(false)}
        onRegionChange={setActiveRegion}
        onSearchChange={setSearch}
        onSelectRoute={(routeId) => selectRoute(routeId, true)}
        onToggleCollapsed={() => setSidebarCollapsed((value) => !value)}
        onToggleKind={toggleKind}
        routes={filteredRoutes}
        search={search}
        selectedRouteId={selectedRouteId}
        totalCount={routes.length}
      />

      <header className="mobileTopBar">
        <BrandMark compact />
        <div>
          <button
            aria-label="Search routes"
            className="iconButton"
            onClick={() => setMobileBrowserOpen(true)}
            type="button"
          >
            <SearchIcon size={21} />
          </button>
          <button
            aria-label="Filter routes"
            className="iconButton"
            onClick={() => setMobileBrowserOpen(true)}
            type="button"
          >
            <SlidersIcon size={21} />
          </button>
        </div>
      </header>

      <section className="mapStage">
        <MapCanvas
          focusToken={focusToken}
          hoveredRouteId={hover?.routeId ?? null}
          onHover={handleHover}
          onMapClick={handleMapClick}
          onSelect={selectRoute}
          routeData={routeData}
          selectedRouteId={selectedRouteId}
          visibleRouteIds={visibleRouteIds}
        />

        {hoveredRoute && hover ? (
          <HoverCard route={hoveredRoute} x={hover.x} y={hover.y} />
        ) : null}

        {selectedRoute ? (
          <div className="desktopRouteDetail">
            <RouteDetail
              onClose={() => setSelectedRouteId(null)}
              route={selectedRoute}
            />
          </div>
        ) : null}

        <div className="mapLegend" aria-label="Route legend">
          {routeKinds.map(({ id, label }) => (
            <span key={id}>
              <RouteLineSample kind={id} /> {label}
            </span>
          ))}
        </div>
      </section>

      <section
        className={`mobileRouteSheet ${mobileDetailOpen ? "mobileRouteSheetOpen" : ""}`}
      >
        <button
          aria-expanded={mobileDetailOpen}
          className="mobileSheetHandle"
          onClick={() => setMobileDetailOpen((value) => !value)}
          type="button"
        >
          <span aria-hidden="true" />
          <span>
            <RouteListIcon size={18} /> {filteredRoutes.length} routes
          </span>
          <span>{activeRegion === "All" ? "All regions" : activeRegion}</span>
        </button>
        {mobileDetailOpen && selectedRoute ? (
          <RouteDetail compact route={selectedRoute} />
        ) : null}
      </section>

      <a
        className="allGpxDownload"
        download
        href="/data/bc-backroads/routes.gpx"
      >
        Download all overview GPX
      </a>
    </main>
  );
}
