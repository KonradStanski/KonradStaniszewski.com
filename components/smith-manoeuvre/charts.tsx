import {
  useId,
  useMemo,
  useState,
  type CSSProperties,
  type PointerEvent as ReactPointerEvent,
} from "react";
import { extent, max, min } from "d3-array";
import { scaleLinear } from "d3-scale";
import { area, curveBasis, curveMonotoneX, line } from "d3-shape";
import styles from "./SmithManoeuvrePlanner.module.css";
import {
  SCENARIOS,
  type Assumptions,
  type FanPoint,
  type FanSeries,
  type ProjectionSet,
  type ScenarioKey,
  type SimulationDistribution,
  type YearResult,
  winnerAt,
} from "./model";

const WIDTH = 920;
const MARGIN = { top: 18, right: 22, bottom: 50, left: 70 };

export const formatMoney = (value: number, compact = true) => {
  const absolute = Math.abs(value);
  const sign = value < 0 ? "−" : "";
  if (compact && absolute >= 1_000_000) {
    return `${sign}$${(absolute / 1_000_000).toFixed(absolute >= 10_000_000 ? 1 : 2)}M`;
  }
  if (compact && absolute >= 1_000) return `${sign}$${Math.round(absolute / 1_000)}k`;
  return `${sign}$${Math.round(absolute).toLocaleString("en-CA")}`;
};

const scenarioByKey = Object.fromEntries(
  SCENARIOS.map((scenario) => [scenario.key, scenario])
) as Record<ScenarioKey, (typeof SCENARIOS)[number]>;

const ScenarioLegend = ({
  selected,
  onSelect,
}: {
  selected?: ScenarioKey;
  onSelect?: (key: ScenarioKey) => void;
}) => (
  <div className={styles.legend} aria-label="Projection scenarios">
    {SCENARIOS.map((scenario) => {
      const contents = (
        <>
          <span
            className={styles.legendDot}
            style={{ "--scenario-color": scenario.color } as CSSProperties}
          />
          {scenario.label}
        </>
      );
      return onSelect ? (
        <button
          aria-pressed={scenario.key === selected}
          className={`${styles.legendButton} ${scenario.key === selected ? styles.legendButtonActive : ""}`}
          key={scenario.key}
          onClick={() => onSelect(scenario.key)}
          type="button"
        >
          {contents}
        </button>
      ) : (
        <span className={styles.legendButton} key={scenario.key}>{contents}</span>
      );
    })}
  </div>
);

type FanChartProps = {
  fan: FanSeries;
  selected: ScenarioKey;
  onSelect: (key: ScenarioKey) => void;
  hoverYear: number;
  onHoverYear: (year: number) => void;
  horizon: number;
  trials: number;
};

export const FanChart = ({
  fan,
  selected,
  onSelect,
  hoverYear,
  onHoverYear,
  horizon,
  trials,
}: FanChartProps) => {
  const clipId = useId().replace(/:/g, "");
  const height = 500;
  const selectedPoints = fan[selected];
  const medianPoints = SCENARIOS.flatMap((scenario) => fan[scenario.key]);
  const yMin = Math.min(
    0,
    min(selectedPoints, (point) => point.p025) ?? 0,
    min(medianPoints, (point) => point.p50) ?? 0
  );
  const yMax = Math.max(
    100_000,
    max(selectedPoints, (point) => point.p975) ?? 0,
    max(medianPoints, (point) => point.p50) ?? 0
  );
  const ySpan = Math.max(100_000, yMax - yMin);
  const yDomain: [number, number] = [
    Math.min(0, yMin - ySpan * 0.03),
    yMax + ySpan * 0.05,
  ];
  const x = scaleLinear().domain([0, horizon]).range([MARGIN.left, WIDTH - MARGIN.right]);
  const y = scaleLinear()
    .domain(yDomain)
    .range([height - MARGIN.bottom, MARGIN.top]);
  const makeBand = (low: keyof FanPoint, high: keyof FanPoint) =>
    area<FanPoint>()
      .x((point) => x(point.year))
      .y0((point) => y(Number(point[low])))
      .y1((point) => y(Number(point[high])))
      .curve(curveMonotoneX);
  const median = line<FanPoint>()
    .x((point) => x(point.year))
    .y((point) => y(point.p50))
    .curve(curveMonotoneX);
  const selectedYear = Math.max(0, Math.min(horizon, Math.round(hoverYear)));
  const hoverX = x(selectedYear);
  const selectedPoint = fan[selected][selectedYear] ?? fan[selected][0];
  const tooltipWidth = 244;
  const tooltipHeight = 126;
  const tooltipX = hoverX > WIDTH * 0.67 ? hoverX - tooltipWidth - 12 : hoverX + 12;
  const tooltipY = Math.max(
    MARGIN.top + 4,
    Math.min(height - MARGIN.bottom - tooltipHeight, y(selectedPoint.p50) - 62)
  );

  const handlePointer = (event: ReactPointerEvent<SVGSVGElement>) => {
    const rectangle = event.currentTarget.getBoundingClientRect();
    const svgX = ((event.clientX - rectangle.left) / rectangle.width) * WIDTH;
    onHoverYear(Math.max(0, Math.min(horizon, Math.round(x.invert(svgX)))));
  };

  return (
    <figure className={styles.chartFrame}>
      <div className={styles.chartHeader}>
        <div>
          <h3>Range of simulated outcomes</h3>
          <div className={styles.chartMeta}>
            After-tax net worth · 2026 dollars · {trials.toLocaleString("en-CA")} shared paths
          </div>
        </div>
      </div>
      <div className={styles.fanLegendRow}>
        <ScenarioLegend onSelect={onSelect} selected={selected} />
        <div className={styles.intervalLegend} aria-label="Prediction intervals for the selected scenario">
          <span><i className={styles.interval95} />95% interval</span>
          <span><i className={styles.interval80} />80% interval</span>
          <span><i className={styles.interval50} />50% interval</span>
          <span><i className={styles.intervalMedian} />Median</span>
        </div>
      </div>
      <svg
        aria-label="Fan chart with nested 50, 80, and 95 percent intervals for after-tax net worth"
        className={styles.chartSvg}
        onPointerLeave={() => onHoverYear(Math.round(horizon * 0.55))}
        onPointerMove={handlePointer}
        role="img"
        viewBox={`0 0 ${WIDTH} ${height}`}
      >
        <defs>
          <clipPath id={clipId}>
            <rect height={height - MARGIN.top - MARGIN.bottom} width={WIDTH - MARGIN.left - MARGIN.right} x={MARGIN.left} y={MARGIN.top} />
          </clipPath>
        </defs>
        {y.ticks(5).map((tick) => (
          <g key={tick}>
            <line className={styles.gridLine} x1={MARGIN.left} x2={WIDTH - MARGIN.right} y1={y(tick)} y2={y(tick)} />
            <text className={styles.axisText} textAnchor="end" x={MARGIN.left - 12} y={y(tick) + 4}>{formatMoney(tick)}</text>
          </g>
        ))}
        <text className={`${styles.axisText} ${styles.axisStrong}`} transform="rotate(-90 14 234)" textAnchor="middle" x={14} y={234}>After-tax net worth</text>
        <g clipPath={`url(#${clipId})`}>
          <path d={makeBand("p025", "p975")(fan[selected]) ?? undefined} fill={scenarioByKey[selected].color} fillOpacity={0.07} />
          <path d={makeBand("p10", "p90")(fan[selected]) ?? undefined} fill={scenarioByKey[selected].color} fillOpacity={0.12} />
          <path d={makeBand("p25", "p75")(fan[selected]) ?? undefined} fill={scenarioByKey[selected].color} fillOpacity={0.2} />
          {SCENARIOS.map((scenario) => (
            <path
              d={median(fan[scenario.key]) ?? undefined}
              fill="none"
              key={scenario.key}
              stroke={scenario.color}
              strokeOpacity={scenario.key === selected ? 1 : 0.62}
              strokeWidth={scenario.key === selected ? 3 : 1.7}
            />
          ))}
        </g>
        <line className={styles.hoverGuide} x1={hoverX} x2={hoverX} y1={MARGIN.top} y2={height - MARGIN.bottom} />
        {SCENARIOS.map((scenario) => {
          const point = fan[scenario.key][selectedYear];
          return <circle cx={hoverX} cy={y(point.p50)} fill={scenario.color} key={scenario.key} r={scenario.key === selected ? 5 : 3.5} stroke="#fff" strokeWidth={1.4} />;
        })}
        {x.ticks(Math.min(7, horizon)).map((tick) => (
          <g key={tick}>
            <line className={styles.axisLine} x1={x(tick)} x2={x(tick)} y1={height - MARGIN.bottom} y2={height - MARGIN.bottom + 5} />
            <text className={styles.axisText} textAnchor={tick === 0 ? "start" : tick === horizon ? "end" : "middle"} x={x(tick)} y={height - 22}>
              {tick === 0 || tick === horizon ? `Age ${fan.rent[0].age + tick}` : fan.rent[0].age + tick}
            </text>
          </g>
        ))}
        <g transform={`translate(${tooltipX} ${tooltipY})`}>
          <rect className={styles.tooltipBox} height={tooltipHeight} rx={2} width={tooltipWidth} />
          <text className={styles.tooltipTitle} x={13} y={21}>Age {selectedPoint.age} · {scenarioByKey[selected].label}</text>
          {[
            ["95% interval", selectedPoint.p025, selectedPoint.p975],
            ["80% interval", selectedPoint.p10, selectedPoint.p90],
            ["50% interval", selectedPoint.p25, selectedPoint.p75],
          ].map(([label, low, high], index) => (
            <g key={String(label)}>
              <text className={styles.tooltipText} x={13} y={42 + index * 21}>{String(label)}</text>
              <text className={styles.tooltipTitle} textAnchor="end" x={tooltipWidth - 13} y={42 + index * 21}>{formatMoney(Number(low))} – {formatMoney(Number(high))}</text>
            </g>
          ))}
          <text className={styles.tooltipText} x={13} y={106}>Median</text>
          <text className={styles.tooltipTitle} textAnchor="end" x={tooltipWidth - 13} y={106}>{formatMoney(selectedPoint.p50)}</text>
        </g>
      </svg>
      <figcaption className={styles.chartCaption}>
        The shaded bands apply to the selected plan. In each trial, all three plans
        experience the same stock and housing returns, which keeps the comparison fair.
      </figcaption>
    </figure>
  );
};

type DensityCell = { scenario: ScenarioKey; year: number; bin: number; probability: number };

export const TemporalDensityChart = ({
  distribution,
  horizon,
}: {
  distribution: SimulationDistribution;
  horizon: number;
}) => {
  const height = 560;
  const panelHeight = 140;
  const panelGap = 18;
  const bins = 32;
  const allPoints = SCENARIOS.flatMap((scenario) => distribution.fan[scenario.key]);
  const domainMin = Math.min(0, min(allPoints, (point) => point.p025) ?? 0);
  const domainMax = Math.max(100_000, max(allPoints, (point) => point.p975) ?? 0);
  const x = scaleLinear().domain([0, horizon]).range([MARGIN.left, WIDTH - MARGIN.right]);
  const cells = useMemo(() => {
    const result: DensityCell[] = [];
    for (const scenario of SCENARIOS) {
      distribution.samples[scenario.key].forEach((values, year) => {
        const counts = Array.from({ length: bins }, () => 0);
        values.forEach((value) => {
          const normalized = (value - domainMin) / Math.max(1, domainMax - domainMin);
          const bin = Math.max(0, Math.min(bins - 1, Math.floor(normalized * bins)));
          counts[bin] += 1;
        });
        counts.forEach((count, bin) => result.push({ scenario: scenario.key, year, bin, probability: count / Math.max(1, values.length) }));
      });
    }
    return result;
  }, [distribution.samples, domainMax, domainMin]);
  const maxProbability = max(cells, (cell) => cell.probability) ?? 1;
  const cellWidth = (WIDTH - MARGIN.left - MARGIN.right) / (horizon + 1);
  const cellHeight = panelHeight / bins;
  const yTicks = scaleLinear().domain([domainMin, domainMax]).ticks(4);

  return (
    <figure className={`${styles.chartFrame} ${styles.chartSeparated}`}>
      <div className={styles.chartHeader}>
        <div>
          <h3>Where outcomes cluster over time</h3>
          <div className={styles.chartMeta}>Share of trials in each wealth range · same scale for all three plans</div>
        </div>
        <div className={styles.densityKey}><span />Higher probability</div>
      </div>
      <svg aria-label="Temporal density heatmaps for after-tax net worth in each scenario" className={styles.chartSvg} role="img" viewBox={`0 0 ${WIDTH} ${height}`}>
        {SCENARIOS.map((scenario, scenarioIndex) => {
          const panelTop = 20 + scenarioIndex * (panelHeight + panelGap);
          const medianPath = line<FanPoint>()
            .x((point) => x(point.year) + cellWidth / 2)
            .y((point) => panelTop + panelHeight - ((point.p50 - domainMin) / Math.max(1, domainMax - domainMin)) * panelHeight)
            .curve(curveMonotoneX);
          return (
            <g key={scenario.key}>
              <rect className={styles.densityPanel} height={panelHeight} width={WIDTH - MARGIN.left - MARGIN.right} x={MARGIN.left} y={panelTop} />
              {cells.filter((cell) => cell.scenario === scenario.key).map((cell) => (
                <rect
                  fill={scenario.color}
                  fillOpacity={Math.pow(cell.probability / maxProbability, 0.55) * 0.92}
                  height={cellHeight + 0.2}
                  key={`${cell.year}-${cell.bin}`}
                  width={cellWidth + 0.2}
                  x={MARGIN.left + cell.year * cellWidth}
                  y={panelTop + panelHeight - (cell.bin + 1) * cellHeight}
                />
              ))}
              <path d={medianPath(distribution.fan[scenario.key]) ?? undefined} fill="none" stroke={scenario.color} strokeWidth={1.6} />
              <text className={styles.densityScenarioLabel} textAnchor="end" x={MARGIN.left - 12} y={panelTop + 18}>{scenario.shortLabel}</text>
              {yTicks.map((tick) => (
                <text className={styles.axisText} key={tick} textAnchor="end" x={MARGIN.left - 12} y={panelTop + panelHeight - ((tick - domainMin) / Math.max(1, domainMax - domainMin)) * panelHeight + 4}>{formatMoney(tick)}</text>
              ))}
            </g>
          );
        })}
        {[0, Math.round(horizon / 3), Math.round((horizon * 2) / 3), horizon].map((tick) => (
          <text className={styles.axisText} key={tick} textAnchor={tick === 0 ? "start" : tick === horizon ? "end" : "middle"} x={x(tick)} y={height - 24}>Year {tick}</text>
        ))}
        <text className={`${styles.axisText} ${styles.axisStrong}`} textAnchor="middle" x={(MARGIN.left + WIDTH - MARGIN.right) / 2} y={height - 6}>Years from model start</text>
      </svg>
      <figcaption className={styles.chartCaption}>
        Each column groups the simulated results for one year. Darker cells contain
        more trials. This makes uneven or separate clusters visible when a fan chart
        would hide them.
      </figcaption>
    </figure>
  );
};

const kernelDensity = (values: number[], domain: [number, number], points = 48) => {
  const [low, high] = domain;
  const bandwidth = Math.max(1, (high - low) / 18);
  return Array.from({ length: points }, (_, index) => {
    const x = low + ((high - low) * index) / (points - 1);
    const density = values.reduce((sum, value) => {
      const u = (x - value) / bandwidth;
      return sum + Math.exp(-0.5 * u * u);
    }, 0) / Math.max(1, values.length * bandwidth * Math.sqrt(2 * Math.PI));
    return { x, density };
  });
};

export const RidgelineChart = ({
  distribution,
  horizon,
}: {
  distribution: SimulationDistribution;
  horizon: number;
}) => {
  const ridgeYears = Array.from(
    { length: Math.floor(horizon / 5) },
    (_, index) => (index + 1) * 5
  );
  if (ridgeYears[ridgeYears.length - 1] !== horizon) ridgeYears.push(horizon);
  const height = 100 + ridgeYears.length * 44;
  const gap = 24;
  const innerWidth = WIDTH - MARGIN.left - MARGIN.right;
  const panelWidth = (innerWidth - gap * (SCENARIOS.length - 1)) / SCENARIOS.length;
  const milestoneBounds = ridgeYears.flatMap((year) =>
    SCENARIOS.flatMap((scenario) => {
      const point = distribution.fan[scenario.key][year];
      return point ? [point.p025, point.p975] : [];
    })
  );
  const rawExtent = extent(milestoneBounds);
  const domain: [number, number] = [Math.min(0, rawExtent[0] ?? 0), rawExtent[1] ?? 1];
  const panelData = useMemo(
    () =>
      SCENARIOS.map((scenario) => ({
        scenario,
        ridges: ridgeYears.map((year) => ({
          year,
          values: kernelDensity(distribution.samples[scenario.key][year] ?? [], domain),
          median: distribution.fan[scenario.key][year]?.p50 ?? 0,
        })),
      })),
    [distribution, horizon]
  );

  return (
    <figure className={`${styles.chartFrame} ${styles.chartSeparated}`}>
      <div className={styles.chartHeader}>
        <div>
          <h3>How outcome distributions change over time</h3>
          <div className={styles.chartMeta}>Five-year intervals · vertical marker shows the median · same dollar scale in every panel</div>
        </div>
      </div>
      <svg aria-label="Ridgeline plots of after-tax net worth at selected horizons" className={styles.chartSvg} role="img" viewBox={`0 0 ${WIDTH} ${height}`}>
        {panelData.map(({ scenario, ridges }, panelIndex) => {
          const panelX = MARGIN.left + panelIndex * (panelWidth + gap);
          const x = scaleLinear().domain(domain).range([panelX, panelX + panelWidth]);
          const ticks = x.ticks(4);
          const finalBaseline = 70 + (ridges.length - 1) * 44;
          return (
            <g key={scenario.key}>
              <text
                className={styles.ridgeTitle}
                fill={scenario.color}
                textAnchor="middle"
                x={panelX + panelWidth / 2}
                y={21}
              >
                {scenario.label}
              </text>
              {ticks.map((tick) => (
                <line
                  className={styles.gridLine}
                  key={tick}
                  x1={x(tick)}
                  x2={x(tick)}
                  y1={38}
                  y2={finalBaseline}
                />
              ))}
              {ridges.map(({ year, values, median }, ridgeIndex) => {
                const baseline = 70 + ridgeIndex * 44;
                const densityMax = max(values, (item) => item.density) ?? 1;
                const yScale = scaleLinear().domain([0, densityMax]).range([0, 34]);
                const ridge = area<{ x: number; density: number }>()
                  .x((point) => x(point.x))
                  .y0(baseline)
                  .y1((point) => baseline - yScale(point.density))
                  .curve(curveBasis);
                return (
                  <g key={year}>
                    <line className={styles.axisLine} x1={panelX} x2={panelX + panelWidth} y1={baseline} y2={baseline} />
                    <path
                      d={ridge(values) ?? undefined}
                      fill={scenario.color}
                      fillOpacity={0.15 + (year / horizon) * 0.2}
                      stroke={scenario.color}
                      strokeWidth={1.5}
                    />
                    <line
                      className={styles.ridgeMedian}
                      x1={x(median)}
                      x2={x(median)}
                      y1={baseline - 34}
                      y2={baseline}
                    />
                    <text className={styles.ridgeYearLabel} x={panelX + 4} y={baseline - 5}>
                      Year {year}
                    </text>
                  </g>
                );
              })}
              {ticks.map((tick, index) => (
                <text
                  className={styles.axisText}
                  key={tick}
                  textAnchor={index === 0 ? "start" : index === ticks.length - 1 ? "end" : "middle"}
                  x={x(tick)}
                  y={height - 14}
                >
                  {formatMoney(tick)}
                </text>
              ))}
            </g>
          );
        })}
      </svg>
      <figcaption className={styles.chartCaption}>
        Each row shows the distribution at one point in time. Curves moving to the
        right indicate higher wealth; wider curves indicate more uncertainty. The
        vertical marker shows the median outcome for that row.
      </figcaption>
    </figure>
  );
};

type OwnerScenario = "home" | "smith";

export const MortgagePaymentChart = ({ projection }: { projection: ProjectionSet }) => {
  const [selected, setSelected] = useState<OwnerScenario>("home");
  const results = projection[selected].results;
  const height = 390;
  const x = scaleLinear().domain([0, Math.max(1, results.length - 1)]).range([MARGIN.left, WIDTH - MARGIN.right]);
  const annualMax = Math.max(1, max(results, (result) => result.annualMortgageInterest + result.annualMortgagePrincipal) ?? 1);
  const balanceMax = Math.max(1, max(results, (result) => result.mortgage) ?? 1);
  const annualY = scaleLinear().domain([0, annualMax]).nice(4).range([height - MARGIN.bottom, MARGIN.top]);
  const balanceY = scaleLinear().domain([0, balanceMax]).nice(4).range([height - MARGIN.bottom, MARGIN.top]);
  const barWidth = Math.max(5, ((WIDTH - MARGIN.left - MARGIN.right) / Math.max(1, results.length - 1)) * 0.72);
  const balanceLine = line<YearResult>().x((result) => x(result.year)).y((result) => balanceY(result.mortgage)).curve(curveMonotoneX);

  return (
    <figure className={`${styles.chartFrame} ${styles.chartSeparated}`}>
      <div className={styles.chartHeader}>
        <div>
          <h3>Mortgage payments: principal and interest</h3>
          <div className={styles.chartMeta}>Annual scheduled principal and interest · nominal dollars</div>
        </div>
        <div className={styles.legend} aria-label="Choose an ownership strategy">
          {(["home", "smith"] as OwnerScenario[]).map((key) => (
            <button aria-pressed={selected === key} className={`${styles.legendButton} ${selected === key ? styles.legendButtonActive : ""}`} key={key} onClick={() => setSelected(key)} type="button">
              {scenarioByKey[key].label}
            </button>
          ))}
        </div>
      </div>
      <div className={styles.intervalLegend}>
        <span><i className={styles.principalKey} />Scheduled principal</span>
        <span><i className={styles.interestKey} />Mortgage interest</span>
        <span><i className={styles.balanceKey} />Mortgage balance</span>
      </div>
      <svg aria-label={`Annual mortgage principal and interest for ${scenarioByKey[selected].label}`} className={styles.chartSvg} role="img" viewBox={`0 0 ${WIDTH} ${height}`}>
        {annualY.ticks(4).map((tick) => (
          <g key={tick}>
            <line className={styles.gridLine} x1={MARGIN.left} x2={WIDTH - MARGIN.right} y1={annualY(tick)} y2={annualY(tick)} />
            <text className={styles.axisText} textAnchor="end" x={MARGIN.left - 11} y={annualY(tick) + 4}>{formatMoney(tick)}</text>
          </g>
        ))}
        {results.map((result) => {
          const principalTop = annualY(result.annualMortgagePrincipal);
          const totalTop = annualY(result.annualMortgagePrincipal + result.annualMortgageInterest);
          return (
            <g key={result.year}>
              <rect fill="#9fb2c7" height={Math.max(0, annualY(0) - principalTop)} width={barWidth} x={x(result.year) - barWidth / 2} y={principalTop} />
              <rect fill="#d45532" height={Math.max(0, principalTop - totalTop)} width={barWidth} x={x(result.year) - barWidth / 2} y={totalTop} />
            </g>
          );
        })}
        <path d={balanceLine(results) ?? undefined} fill="none" stroke="#071423" strokeWidth={2.2} />
        {balanceY.ticks(4).map((tick) => <text className={styles.axisText} key={tick} textAnchor="end" x={WIDTH - MARGIN.right} y={balanceY(tick) - 5}>{formatMoney(tick)}</text>)}
        {[0, Math.round((results.length - 1) / 2), results.length - 1].map((tick) => <text className={styles.axisText} key={tick} textAnchor={tick === 0 ? "start" : tick === results.length - 1 ? "end" : "middle"} x={x(tick)} y={height - 20}>Age {results[tick].age}</text>)}
        <text className={`${styles.axisText} ${styles.axisStrong}`} transform="rotate(-90 15 182)" textAnchor="middle" x={15} y={182}>Annual payment</text>
      </svg>
      <figcaption className={styles.chartCaption}>
        Principal transfers cash to home equity. Interest is an expense. The Smith path can reduce the mortgage faster when it recycles tax savings.
      </figcaption>
    </figure>
  );
};

export const DebtConversionChart = ({ projection }: { projection: ProjectionSet }) => {
  const smith = projection.smith.results;
  const home = projection.home.results;
  const height = 340;
  const maximum = Math.max(1, max([...smith, ...home], (result) => Math.max(result.mortgage, result.heloc)) ?? 1);
  const x = scaleLinear().domain([0, Math.max(1, smith.length - 1)]).range([MARGIN.left, WIDTH - MARGIN.right]);
  const y = scaleLinear().domain([0, maximum]).nice(4).range([height - MARGIN.bottom, MARGIN.top]);
  const makeLine = (value: (result: YearResult) => number) => line<YearResult>().x((result) => x(result.year)).y((result) => y(value(result))).curve(curveMonotoneX);

  return (
    <figure className={`${styles.chartFrame} ${styles.chartSeparated}`}>
      <div className={styles.chartHeader}>
        <div>
          <h3>Mortgage and investment-loan balances</h3>
          <div className={styles.chartMeta}>Outstanding debt using the input assumptions</div>
        </div>
      </div>
      <div className={styles.intervalLegend}>
        <span><i className={styles.smithMortgageKey} />Smith mortgage</span>
        <span><i className={styles.helocKey} />Smith HELOC</span>
        <span><i className={styles.homeMortgageKey} />Conventional mortgage</span>
      </div>
      <svg aria-label="Mortgage and deductible HELOC balances under the Smith Manoeuvre" className={styles.chartSvg} role="img" viewBox={`0 0 ${WIDTH} ${height}`}>
        {y.ticks(4).map((tick) => (
          <g key={tick}>
            <line className={styles.gridLine} x1={MARGIN.left} x2={WIDTH - MARGIN.right} y1={y(tick)} y2={y(tick)} />
            <text className={styles.axisText} textAnchor="end" x={MARGIN.left - 11} y={y(tick) + 4}>{formatMoney(tick)}</text>
          </g>
        ))}
        <path d={makeLine((result) => result.mortgage)(smith) ?? undefined} fill="none" stroke="#d45532" strokeWidth={2.5} />
        <path d={makeLine((result) => result.heloc)(smith) ?? undefined} fill="none" stroke="#08756f" strokeDasharray="7 5" strokeWidth={2.5} />
        <path d={makeLine((result) => result.mortgage)(home) ?? undefined} fill="none" stroke="#6f7d90" strokeDasharray="2 4" strokeWidth={1.8} />
        {[0, Math.round((smith.length - 1) / 2), smith.length - 1].map((tick) => <text className={styles.axisText} key={tick} textAnchor={tick === 0 ? "start" : tick === smith.length - 1 ? "end" : "middle"} x={x(tick)} y={height - 19}>Age {smith[tick].age}</text>)}
      </svg>
      <figcaption className={styles.chartCaption}>
        The Smith Manoeuvre converts debt. It does not eliminate debt. The HELOC must remain traceable to eligible investments.
      </figcaption>
    </figure>
  );
};

type HeatmapProps = { assumptions: Assumptions; horizon: number };

export const OutcomeHeatmap = ({ assumptions, horizon }: HeatmapProps) => {
  const equityReturns = useMemo(() => Array.from({ length: 9 }, (_, index) => 2 + index), []);
  const homeReturns = useMemo(() => Array.from({ length: 8 }, (_, index) => index), []);
  const cells = useMemo(
    () => homeReturns.flatMap((homeReturn) => equityReturns.map((equityReturn) => ({ equityReturn, homeReturn, winner: winnerAt(assumptions, equityReturn, homeReturn, horizon) }))),
    [assumptions, equityReturns, homeReturns, horizon]
  );
  const [hovered, setHovered] = useState<(typeof cells)[number] | null>(null);
  const width = 640;
  const height = 450;
  const margin = { top: 20, right: 26, bottom: 66, left: 62 };
  const cellWidth = (width - margin.left - margin.right) / equityReturns.length;
  const cellHeight = (height - margin.top - margin.bottom) / homeReturns.length;
  const currentEquity = Math.max(2, Math.min(10, Math.round(assumptions.equityReturn)));
  const currentHome = Math.max(0, Math.min(7, Math.round(assumptions.homeAppreciation)));

  return (
    <figure>
      <svg aria-label={`Deterministic sensitivity map after ${horizon} years`} className={styles.chartSvg} role="img" viewBox={`0 0 ${width} ${height}`}>
        {cells.map((cell) => {
          const column = equityReturns.indexOf(cell.equityReturn);
          const row = homeReturns.length - 1 - homeReturns.indexOf(cell.homeReturn);
          const isCurrent = cell.equityReturn === currentEquity && cell.homeReturn === currentHome;
          return (
            <rect
              aria-label={`${cell.equityReturn}% equity return, ${cell.homeReturn}% home appreciation: ${scenarioByKey[cell.winner].label} has the highest modeled net worth`}
              className={styles.heatmapCell}
              fill={scenarioByKey[cell.winner].color}
              height={cellHeight}
              key={`${cell.equityReturn}-${cell.homeReturn}`}
              onBlur={() => setHovered(null)}
              onFocus={() => setHovered(cell)}
              onMouseEnter={() => setHovered(cell)}
              onMouseLeave={() => setHovered(null)}
              rx={1}
              stroke={isCurrent ? "#071423" : undefined}
              strokeWidth={isCurrent ? 4 : undefined}
              tabIndex={0}
              width={cellWidth}
              x={margin.left + column * cellWidth}
              y={margin.top + row * cellHeight}
            />
          );
        })}
        {equityReturns.map((equityReturn, index) => <text className={styles.axisText} key={equityReturn} textAnchor="middle" x={margin.left + (index + 0.5) * cellWidth} y={height - 41}>{equityReturn}%</text>)}
        {[0, 2, 4, 6, 7].map((homeReturn) => {
          const row = homeReturns.length - 1 - homeReturns.indexOf(homeReturn);
          return <text className={styles.axisText} key={homeReturn} textAnchor="end" x={margin.left - 10} y={margin.top + (row + 0.5) * cellHeight + 4}>{homeReturn}%</text>;
        })}
        <text className={`${styles.axisText} ${styles.axisStrong}`} textAnchor="middle" x={(margin.left + width - margin.right) / 2} y={height - 11}>Expected equity return</text>
        <text className={`${styles.axisText} ${styles.axisStrong}`} textAnchor="middle" transform={`rotate(-90 17 ${(margin.top + height - margin.bottom) / 2})`} x={17} y={(margin.top + height - margin.bottom) / 2}>Home appreciation</text>
        {hovered ? (
          <g transform={`translate(${width - 229} 30)`}>
            <rect className={styles.tooltipBox} height={65} rx={2} width={205} />
            <text className={styles.tooltipTitle} x={12} y={21}>{scenarioByKey[hovered.winner].label}</text>
            <text className={styles.tooltipText} x={12} y={40}>Equities {hovered.equityReturn}% · Home {hovered.homeReturn}%</text>
            <text className={styles.tooltipText} x={12} y={55}>Highest modeled value after {horizon} years</text>
          </g>
        ) : null}
      </svg>
      <ScenarioLegend />
      <figcaption className={styles.chartCaption}>
        This is a deterministic two-factor sensitivity map. It is not a time-density heatmap. The outline marks the nearest current assumptions.
      </figcaption>
    </figure>
  );
};
