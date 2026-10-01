import { localGpxUrl } from "./data";
import {
  AlertIcon,
  BikeIcon,
  CalendarIcon,
  CloseIcon,
  DownloadIcon,
  ExternalIcon,
  ShieldIcon,
} from "./icons";
import { RouteLineSample } from "./RouteLineSample";
import type { RouteRecord } from "./types";

interface RouteDetailProps {
  route: RouteRecord;
  onClose?: () => void;
  compact?: boolean;
}

export function RouteDetail({ route, onClose, compact = false }: RouteDetailProps) {
  return (
    <article className={compact ? "routeDetail routeDetailCompact" : "routeDetail"}>
      <header className="routeDetailHeader">
        <div className="routeDetailTitle">
          <RouteLineSample kind={route.kind} />
          <h2>{route.name}</h2>
        </div>
        {onClose ? (
          <button
            aria-label="Close route details"
            className="iconButton iconButtonQuiet"
            onClick={onClose}
            type="button"
          >
            <CloseIcon size={17} />
          </button>
        ) : null}
      </header>

      <div className="routeDetailQuickFacts">
        <span>{route.distanceKm ? `${route.distanceKm} km` : "Distance varies"}</span>
        <span>{route.surface}</span>
      </div>

      <dl className="routeFactList">
        <div>
          <dt>
            <AlertIcon size={17} />
            Status
          </dt>
          <dd className={`statusText statusText_${route.status}`}>
            {route.statusLabel}
          </dd>
        </div>
        <div>
          <dt>
            <BikeIcon size={17} />
            Bike class
          </dt>
          <dd>{route.bikeClass}</dd>
        </div>
        <div>
          <dt>
            <CalendarIcon size={17} />
            Season
          </dt>
          <dd>{route.season}</dd>
        </div>
        <div>
          <dt>
            <ShieldIcon size={17} />
            Confidence
          </dt>
          <dd>{route.confidence}</dd>
        </div>
      </dl>

      <p className="routeDescription">{route.description}</p>

      <div className="routeDetailActions">
        <a href={route.sourceUrl} rel="noreferrer" target="_blank">
          <ExternalIcon size={17} />
          {route.sourceLabel}
        </a>
        <a download href={localGpxUrl(route)}>
          <DownloadIcon size={17} />
          Download overview GPX
        </a>
      </div>

      <p className="routeGeometryNote">
        {route.geometrySource
          ? `Road-following line from OpenStreetMap (${route.geometryPointCount.toLocaleString()} geometry points). It is an independently authored overview, not an access or open-status guarantee.`
          : route.geometryPolicy === "link-only"
          ? "The publisher track is link-only. The local GPX is an independently authored, generalized overview."
          : "Local GPX is a coarse corridor overview, not turn-by-turn navigation."}
      </p>
      <p className="routeDisclaimer">
        Conditions, gates and closures can change without notice.
      </p>
    </article>
  );
}
