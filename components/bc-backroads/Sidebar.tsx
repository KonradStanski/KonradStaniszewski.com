import { BrandMark } from "./BrandMark";
import { kindLabels, regions, routeKinds } from "./data";
import {
  ChevronIcon,
  CloseIcon,
  SearchIcon,
  SlidersIcon,
} from "./icons";
import { RouteLineSample } from "./RouteLineSample";
import type { RouteKind, RouteRecord, RouteRegion } from "./types";

interface SidebarProps {
  routes: RouteRecord[];
  totalCount: number;
  search: string;
  onSearchChange: (value: string) => void;
  activeRegion: "All" | RouteRegion;
  onRegionChange: (region: "All" | RouteRegion) => void;
  activeKinds: ReadonlySet<RouteKind>;
  onToggleKind: (kind: RouteKind) => void;
  selectedRouteId: string | null;
  onSelectRoute: (routeId: string) => void;
  collapsed: boolean;
  onToggleCollapsed: () => void;
  mobileOpen: boolean;
  onCloseMobile: () => void;
}

export function Sidebar({
  routes,
  totalCount,
  search,
  onSearchChange,
  activeRegion,
  onRegionChange,
  activeKinds,
  onToggleKind,
  selectedRouteId,
  onSelectRoute,
  collapsed,
  onToggleCollapsed,
  mobileOpen,
  onCloseMobile,
}: SidebarProps) {
  return (
    <aside
      aria-label="Route browser"
      className={`routeSidebar ${collapsed ? "routeSidebarCollapsed" : ""} ${mobileOpen ? "routeSidebarMobileOpen" : ""}`}
    >
      <div className="sidebarBrandBar">
        <BrandMark compact={collapsed} />
        <button
          aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
          className="sidebarCollapseButton"
          onClick={onToggleCollapsed}
          type="button"
        >
          <ChevronIcon
            className={collapsed ? "collapseChevronReversed" : undefined}
            size={18}
          />
        </button>
        <button
          aria-label="Close route browser"
          className="sidebarMobileClose iconButton"
          onClick={onCloseMobile}
          type="button"
        >
          <CloseIcon size={19} />
        </button>
      </div>

      <div className="sidebarExpandedContent">
        <h1>Routes</h1>
        <label className="routeSearch">
          <SearchIcon size={18} />
          <span className="srOnly">Search routes, towns, regions</span>
          <input
            data-route-search
            onChange={(event) => onSearchChange(event.target.value)}
            placeholder="Search routes, towns, regions"
            type="search"
            value={search}
          />
          <kbd>/</kbd>
        </label>

        <div aria-label="Region" className="regionTabs" role="tablist">
          {regions.map((region) => (
            <button
              aria-selected={activeRegion === region}
              className={activeRegion === region ? "regionTabActive" : undefined}
              key={region}
              onClick={() => onRegionChange(region)}
              role="tab"
              type="button"
            >
              {region === "Lower Mainland" ? "Lower Main." : region}
            </button>
          ))}
        </div>

        <section className="routeFilters">
          <div className="sidebarSectionHeading">
            <span>
              <SlidersIcon size={15} /> Filters
            </span>
            <button
              onClick={() =>
                routeKinds.forEach(({ id }) => {
                  if (!activeKinds.has(id)) onToggleKind(id);
                })
              }
              type="button"
            >
              Show all
            </button>
          </div>
          <div className="routeFilterList">
            {routeKinds.map(({ id, label }) => (
              <button
                aria-pressed={activeKinds.has(id)}
                className={!activeKinds.has(id) ? "routeFilterDisabled" : undefined}
                key={id}
                onClick={() => onToggleKind(id)}
                type="button"
              >
                <RouteLineSample kind={id} />
                <span>{label}</span>
                <span aria-hidden="true" className="routeFilterCheck">
                  {activeKinds.has(id) ? "✓" : ""}
                </span>
              </button>
            ))}
          </div>
        </section>

        <div className="routeListHeading">
          <span>
            Routes <b>{routes.length}</b>
          </span>
          <span>{routes.length === totalCount ? "A–Z" : `${totalCount} total`}</span>
        </div>

        <div className="routeList">
          {routes.length ? (
            routes.map((route) => (
              <button
                aria-current={selectedRouteId === route.id ? "true" : undefined}
                className={`routeListRow ${selectedRouteId === route.id ? "routeListRowSelected" : ""}`}
                key={route.id}
                onClick={() => onSelectRoute(route.id)}
                type="button"
              >
                <RouteLineSample kind={route.kind} />
                <span className="routeListRowBody">
                  <strong>{route.name}</strong>
                  <span>
                    {route.distanceKm ? `${route.distanceKm} km · ` : ""}
                    {route.surface}
                  </span>
                  <small className={`statusText statusText_${route.status}`}>
                    {route.statusLabel}
                    <i> · {kindLabels[route.kind]}</i>
                  </small>
                </span>
                <ChevronIcon className="routeRowChevron" size={16} />
              </button>
            ))
          ) : (
            <div className="routeListEmpty">
              No routes match the current filters.
            </div>
          )}
        </div>
      </div>
    </aside>
  );
}
