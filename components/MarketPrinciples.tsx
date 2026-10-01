import { useMemo, useState } from "react";
import { area as d3Area, curveBasis, line as d3Line, scaleLinear, scaleLog } from "d3";
import { cx } from "@/lib/utils";

const MARKET_BLUE = "#1557d5";
const ACTIVE_AMBER = "#e89500";

const panelClass = cx(
  "not-prose my-10 overflow-hidden border-y py-6 sm:py-8",
  "border-zinc-200 dark:border-zinc-700"
);

const formatMoney = (value: number) =>
  new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(value);

const expectationExamples = [
  {
    company: "Company A",
    expected: 50,
    actual: 30,
    surprise: -20,
    surpriseResult: "20 percentage points below expectations",
    priceResponse: "The stock can fall",
    contrast: "even though profit grew",
  },
  {
    company: "Company B",
    expected: -50,
    actual: -20,
    surprise: 30,
    surpriseResult: "30 percentage points above expectations",
    priceResponse: "The stock can rise",
    contrast: "even though profit fell",
  },
];

export function ExpectationsComparison() {
  return (
    <figure className={panelClass} aria-label="Two examples showing that business performance must be compared with investor expectations">
      <div className="hidden grid-cols-[1fr_2rem_1fr_2rem_1fr] gap-3 px-6 pb-3 text-xs font-semibold uppercase tracking-wide text-zinc-500 lg:grid dark:text-zinc-400">
        <p className="m-0">Assumption reflected in price</p>
        <span />
        <p className="m-0">Earnings release</p>
        <span />
        <p className="m-0">Possible repricing</p>
      </div>
      <div className="space-y-3">
        {expectationExamples.map((example) => (
          <div key={example.company} className="border border-zinc-200 bg-white px-4 py-5 sm:px-6 dark:border-zinc-700 dark:bg-zinc-900">
            <p className="mb-4 mt-0 font-serif text-xl font-semibold text-zinc-950 dark:text-zinc-50">
              {example.company}
            </p>
            <ExpectationRepricingRow {...example} />
          </div>
        ))}
      </div>
      <div className="mt-5 border-l-4 border-zinc-900 bg-zinc-100 px-4 py-4 dark:border-zinc-100 dark:bg-zinc-800">
        <p className="m-0 text-sm font-semibold text-zinc-950 dark:text-zinc-50">
          For this trade, the edge has to exist before the earnings release.
        </p>
        <p className="mb-0 mt-1 text-sm leading-6 text-zinc-700 dark:text-zinc-200">
          An investor buying before the release needs information or analysis that produces a better earnings forecast than the assumptions reflected in the price. Once the results become public, other traders can act on them. Knowing that a company is growing, or repeating a public analyst target, does not provide an edge.
        </p>
      </div>
      <figcaption className="mt-4 text-xs leading-5 text-zinc-500 dark:text-zinc-400">
        All else equal, prices respond to the difference between reported results and the expectations already embedded in the price.
      </figcaption>
    </figure>
  );
}

function ExpectationRepricingRow({
  expected,
  actual,
  surprise,
  surpriseResult,
  priceResponse,
  contrast,
}: {
  expected: number;
  actual: number;
  surprise: number;
  surpriseResult: string;
  priceResponse: string;
  contrast: string;
}) {
  const formatPercent = (value: number) => `${value > 0 ? "+" : "−"}${Math.abs(value)}%`;
  const positiveSurprise = surprise > 0;

  return (
    <div className="grid gap-3 lg:grid-cols-[1fr_2rem_1fr_2rem_1fr] lg:items-stretch">
      <div className="bg-zinc-100 px-4 py-4 dark:bg-zinc-800">
        <p className="m-0 text-xs font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400 lg:hidden">
          Assumption reflected in price
        </p>
        <p className="mb-0 mt-2 text-sm text-zinc-600 dark:text-zinc-300">Simplified price assumption</p>
        <p className="mb-0 mt-1 font-mono text-2xl font-semibold tabular-nums text-zinc-950 dark:text-zinc-50">
          Profit {formatPercent(expected)}
        </p>
        <p className="mb-0 mt-2 text-xs leading-5 text-zinc-500 dark:text-zinc-400">
          Buyers and sellers have already traded on this expectation.
        </p>
      </div>

      <div className="flex items-center justify-center text-xl text-zinc-400 dark:text-zinc-500" aria-hidden="true">
        <span className="lg:hidden">↓</span><span className="hidden lg:inline">→</span>
      </div>

      <div className="bg-zinc-100 px-4 py-4 dark:bg-zinc-800">
        <p className="m-0 text-xs font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400 lg:hidden">
          Earnings release
        </p>
        <p className="mb-0 mt-2 text-sm text-zinc-600 dark:text-zinc-300">Reported earnings</p>
        <p className="mb-0 mt-1 font-mono text-2xl font-semibold tabular-nums text-zinc-950 dark:text-zinc-50">
          Profit {formatPercent(actual)}
        </p>
        <p className={cx(
          "mb-0 mt-2 text-xs font-semibold leading-5",
          positiveSurprise
            ? "text-blue-700 dark:text-blue-400"
            : "text-amber-700 dark:text-amber-400"
        )}>
          {surpriseResult}
        </p>
      </div>

      <div className="flex items-center justify-center text-xl text-zinc-400 dark:text-zinc-500" aria-hidden="true">
        <span className="lg:hidden">↓</span><span className="hidden lg:inline">→</span>
      </div>

      <div className={cx(
        "border-l-4 px-4 py-4",
        positiveSurprise
          ? "border-blue-700 bg-blue-50 dark:border-blue-400 dark:bg-blue-950/30"
          : "border-amber-600 bg-amber-50 dark:border-amber-400 dark:bg-amber-950/30"
      )}>
        <p className="m-0 text-xs font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400 lg:hidden">
          Possible repricing
        </p>
        <p className={cx(
          "mb-0 mt-2 text-xl font-semibold",
          positiveSurprise
            ? "text-blue-800 dark:text-blue-300"
            : "text-amber-800 dark:text-amber-300"
        )}>
          {priceResponse} {positiveSurprise ? "↑" : "↓"}
        </p>
        <p className="mb-0 mt-2 text-xs leading-5 text-zinc-600 dark:text-zinc-300">
          {contrast}.
        </p>
      </div>
    </div>
  );
}

const monteCarloAssumptions = {
  startingValue: 10_000,
  years: 30,
  expectedReturn: 0.08,
  marketVolatility: 0.18,
  pickerSpecificVolatility: 0.20,
  timeStepsPerYear: 12,
  visiblePaths: 15,
  distributionPaths: 20_000,
};

type MonteCarloPoint = {
  year: number;
  index: number;
  picker: number;
};

type MonteCarloEnding = {
  index: number;
  picker: number;
};

const seededRandom = (seed: number) => {
  let state = seed >>> 0;
  return () => {
    state += 0x6d2b79f5;
    let value = state;
    value = Math.imul(value ^ (value >>> 15), value | 1);
    value ^= value + Math.imul(value ^ (value >>> 7), value | 61);
    return ((value ^ (value >>> 14)) >>> 0) / 4_294_967_296;
  };
};

const standardNormal = (random: () => number) => {
  const first = Math.max(random(), Number.EPSILON);
  const second = random();
  return Math.sqrt(-2 * Math.log(first)) * Math.cos(2 * Math.PI * second);
};

const lognormalParameters = (mean: number, standardDeviation: number) => {
  const sigmaSquared = Math.log1p((standardDeviation / mean) ** 2);
  return {
    mu: Math.log(mean) - sigmaSquared / 2,
    sigma: Math.sqrt(sigmaSquared),
  };
};

const marketReturnParameters = lognormalParameters(
  1 + monteCarloAssumptions.expectedReturn,
  monteCarloAssumptions.marketVolatility
);
const pickerShockParameters = lognormalParameters(
  1,
  monteCarloAssumptions.pickerSpecificVolatility
);
const marketStepParameters = {
  mu: marketReturnParameters.mu / monteCarloAssumptions.timeStepsPerYear,
  sigma: marketReturnParameters.sigma / Math.sqrt(monteCarloAssumptions.timeStepsPerYear),
};
const pickerStepParameters = {
  mu: pickerShockParameters.mu / monteCarloAssumptions.timeStepsPerYear,
  sigma: pickerShockParameters.sigma / Math.sqrt(monteCarloAssumptions.timeStepsPerYear),
};

const simulatePairedPath = (random: () => number) => {
  let index = monteCarloAssumptions.startingValue;
  let picker = monteCarloAssumptions.startingValue;
  const points: MonteCarloPoint[] = [{ year: 0, index, picker }];
  const totalSteps = monteCarloAssumptions.years * monteCarloAssumptions.timeStepsPerYear;

  for (let step = 1; step <= totalSteps; step += 1) {
    const marketMultiplier = Math.exp(
      marketStepParameters.mu + marketStepParameters.sigma * standardNormal(random)
    );
    const pickerSpecificMultiplier = Math.exp(
      pickerStepParameters.mu + pickerStepParameters.sigma * standardNormal(random)
    );
    index *= marketMultiplier;
    picker *= marketMultiplier * pickerSpecificMultiplier;
    points.push({
      year: step / monteCarloAssumptions.timeStepsPerYear,
      index,
      picker,
    });
  }

  return points;
};

const simulatePairedEnding = (random: () => number) => {
  const marketMultiplier = Math.exp(
    marketReturnParameters.mu * monteCarloAssumptions.years
      + marketReturnParameters.sigma * Math.sqrt(monteCarloAssumptions.years) * standardNormal(random)
  );
  const pickerSpecificMultiplier = Math.exp(
    pickerShockParameters.mu * monteCarloAssumptions.years
      + pickerShockParameters.sigma * Math.sqrt(monteCarloAssumptions.years) * standardNormal(random)
  );
  const index = monteCarloAssumptions.startingValue * marketMultiplier;
  return {
    index,
    picker: index * pickerSpecificMultiplier,
  } satisfies MonteCarloEnding;
};

const visibleMonteCarloPaths = (() => {
  const random = seededRandom(0x5eed2026);
  return Array.from(
    { length: monteCarloAssumptions.visiblePaths },
    () => simulatePairedPath(random)
  );
})();

const monteCarloEndings = (() => {
  const random = seededRandom(0xc0ffee26);
  return Array.from(
    { length: monteCarloAssumptions.distributionPaths },
    () => simulatePairedEnding(random)
  );
})();

const quantile = (sortedValues: number[], probability: number) => {
  const position = (sortedValues.length - 1) * probability;
  const lower = Math.floor(position);
  const upper = Math.ceil(position);
  const weight = position - lower;
  return sortedValues[lower] * (1 - weight) + sortedValues[upper] * weight;
};

const indexEndingValues = monteCarloEndings.map((ending) => ending.index).sort((a, b) => a - b);
const pickerEndingValues = monteCarloEndings.map((ending) => ending.picker).sort((a, b) => a - b);
const pickerBelowPairedIndex = monteCarloEndings.filter(
  (ending) => ending.picker < ending.index
).length / monteCarloEndings.length;

const formatCompactMoney = (value: number) => {
  if (value >= 1_000_000) return `$${(value / 1_000_000).toFixed(value >= 10_000_000 ? 0 : 1)}m`;
  if (value >= 1_000) return `$${Math.round(value / 1_000)}k`;
  return formatMoney(value);
};

export function NoEdgeMonteCarlo() {
  const [highlightedSeries, setHighlightedSeries] = useState<"index" | "picker" | null>(null);
  const pathChart = { width: 1040, height: 640, left: 72, right: 156, top: 32, bottom: 68 };
  const pathPlotBottom = pathChart.height - pathChart.bottom;
  const pathPlotRight = pathChart.width - pathChart.right;
  const pathValues = visibleMonteCarloPaths.flatMap((path) =>
    path.flatMap((point) => [point.index, point.picker])
  );
  const terminalLowerBound = Math.min(
    quantile(indexEndingValues, 0.005),
    quantile(pickerEndingValues, 0.005)
  );
  const terminalUpperBound = Math.max(
    quantile(indexEndingValues, 0.995),
    quantile(pickerEndingValues, 0.995)
  );
  const pathMinimum = Math.max(1, Math.min(Math.min(...pathValues) * 0.8, terminalLowerBound));
  const pathMaximum = Math.max(Math.max(...pathValues) * 1.2, terminalUpperBound);
  const pathX = scaleLinear()
    .domain([0, monteCarloAssumptions.years])
    .range([pathChart.left, pathChart.width - pathChart.right]);
  const pathY = scaleLog()
    .domain([pathMinimum, pathMaximum])
    .range([pathPlotBottom, pathChart.top]);
  const pathXTicks = [0, 10, 20, 30];
  const pathYTicks = pathY.ticks().filter((tick) => {
    const magnitude = 10 ** Math.floor(Math.log10(tick));
    const leadingDigit = tick / magnitude;
    return leadingDigit === 1 || leadingDigit === 5;
  });
  const indexPath = (path: MonteCarloPoint[]) => d3Line<MonteCarloPoint>()
    .x((point) => pathX(point.year))
    .y((point) => pathY(point.index))(path) ?? "";
  const pickerPath = (path: MonteCarloPoint[]) => d3Line<MonteCarloPoint>()
    .x((point) => pathX(point.year))
    .y((point) => pathY(point.picker))(path) ?? "";

  const buildTerminalDensity = (values: number[]) => {
    const binCount = 56;
    const minimumLogWealth = Math.log(pathMinimum);
    const maximumLogWealth = Math.log(pathMaximum);
    const binWidth = (maximumLogWealth - minimumLogWealth) / binCount;
    const counts = Array.from({ length: binCount }, () => 0);

    for (const value of values) {
      const bin = Math.floor((Math.log(value) - minimumLogWealth) / binWidth);
      if (bin >= 0 && bin < binCount) counts[bin] += 1;
    }

    return [
      { wealth: pathMinimum, probability: 0 },
      ...counts.map((count, index) => ({
        wealth: Math.exp(minimumLogWealth + (index + 0.5) * binWidth),
        probability: count / values.length,
      })),
      { wealth: pathMaximum, probability: 0 },
    ];
  };
  const indexTerminalDensity = buildTerminalDensity(indexEndingValues);
  const pickerTerminalDensity = buildTerminalDensity(pickerEndingValues);
  const terminalDensityMaximum = Math.max(
    ...indexTerminalDensity.map((point) => point.probability),
    ...pickerTerminalDensity.map((point) => point.probability)
  );
  const terminalDensityX = scaleLinear()
    .domain([0, terminalDensityMaximum])
    .range([pathPlotRight, pathChart.width - 18]);
  const terminalDensityArea = (points: Array<{ wealth: number; probability: number }>) =>
    d3Area<(typeof points)[number]>()
      .curve(curveBasis)
      .x0(pathPlotRight)
      .x1((point) => terminalDensityX(point.probability))
      .y((point) => pathY(point.wealth))(points) ?? "";
  const terminalDensityLine = (points: Array<{ wealth: number; probability: number }>) =>
    d3Line<(typeof points)[number]>()
      .curve(curveBasis)
      .x((point) => terminalDensityX(point.probability))
      .y((point) => pathY(point.wealth))(points) ?? "";

  const indexIsDimmed = highlightedSeries === "picker";
  const pickerIsDimmed = highlightedSeries === "index";
  const indexFullPathOpacity = indexIsDimmed ? 0.035 : highlightedSeries === "index" ? 0.7 : 0.24;
  const pickerFullPathOpacity = pickerIsDimmed ? 0.035 : highlightedSeries === "picker" ? 0.7 : 0.26;

  return (
    <figure className={panelClass} aria-label="Monte Carlo comparison of a diversified market portfolio and a no-edge stock picker">
      <div>
        <div className="overflow-x-auto">
          <svg
            viewBox={`0 0 ${pathChart.width} ${pathChart.height}`}
            className="min-w-[900px]"
            role="img"
            aria-label={`Fifteen simulated paths for a broad index and fifteen paths for a no-edge picker over thirty years, shown on a logarithmic dollar scale. Curves aligned with year thirty show ending-value distributions from 20,000 simulations. The picker finishes below its paired index in ${Math.round(pickerBelowPairedIndex * 100)} percent of simulations.`}
          >
            {pathYTicks.map((tick) => (
              <g key={tick}>
                <line x1={pathChart.left} x2={pathPlotRight} y1={pathY(tick)} y2={pathY(tick)} className="stroke-zinc-200 dark:stroke-zinc-700" />
                <text x={pathChart.left - 10} y={pathY(tick) + 4} textAnchor="end" className="fill-zinc-500 text-[11px] dark:fill-zinc-400">
                  {formatCompactMoney(tick)}
                </text>
              </g>
            ))}
            {pathXTicks.map((tick) => (
              <g key={tick}>
                <line x1={pathX(tick)} x2={pathX(tick)} y1={pathPlotBottom} y2={pathPlotBottom + 6} className="stroke-zinc-400 dark:stroke-zinc-500" />
                <text x={pathX(tick)} y={pathChart.height - 26} textAnchor="middle" className="fill-zinc-500 text-[11px] dark:fill-zinc-400">
                  {tick}
                </text>
              </g>
            ))}
            <line x1={pathChart.left} x2={pathPlotRight} y1={pathPlotBottom} y2={pathPlotBottom} className="stroke-zinc-400 dark:stroke-zinc-500" />
            <line x1={pathPlotRight} x2={pathPlotRight} y1={pathChart.top} y2={pathPlotBottom} className="stroke-zinc-300 dark:stroke-zinc-600" />
            <text x={pathPlotRight + 12} y={pathChart.top + 12} className="fill-zinc-500 text-[11px] font-semibold dark:fill-zinc-400">
              Ending distribution
            </text>
            <line
              x1={pathChart.left}
              x2={pathPlotRight}
              y1={pathY(monteCarloAssumptions.startingValue)}
              y2={pathY(monteCarloAssumptions.startingValue)}
              className="stroke-zinc-600 dark:stroke-zinc-300"
              strokeDasharray="6 5"
            />
            <text
              x={pathPlotRight - 6}
              y={pathY(monteCarloAssumptions.startingValue) - 8}
              textAnchor="end"
              className="fill-zinc-600 text-[11px] font-semibold dark:fill-zinc-300"
            >
              Starting value · {formatCompactMoney(monteCarloAssumptions.startingValue)}
            </text>
            {visibleMonteCarloPaths.map((path, index) => (
              <path
                key={`index-${index}`}
                d={indexPath(path)}
                fill="none"
                stroke={MARKET_BLUE}
                strokeWidth={highlightedSeries === "index" ? 2 : 1.25}
                strokeOpacity={indexFullPathOpacity}
                className="transition-[stroke-opacity,stroke-width] duration-150"
                pointerEvents="none"
              />
            ))}
            {visibleMonteCarloPaths.map((path, index) => (
              <path
                key={`picker-${index}`}
                d={pickerPath(path)}
                fill="none"
                stroke={ACTIVE_AMBER}
                strokeWidth={highlightedSeries === "picker" ? 2 : 1.25}
                strokeOpacity={pickerFullPathOpacity}
                className="transition-[stroke-opacity,stroke-width] duration-150"
                pointerEvents="none"
              />
            ))}
            <path
              d={terminalDensityArea(indexTerminalDensity)}
              fill={MARKET_BLUE}
              fillOpacity={indexIsDimmed ? 0.025 : highlightedSeries === "index" ? 0.24 : 0.13}
              className="transition-[fill-opacity] duration-150"
              onMouseEnter={() => setHighlightedSeries("index")}
              onMouseLeave={() => setHighlightedSeries(null)}
            />
            <path
              d={terminalDensityLine(indexTerminalDensity)}
              fill="none"
              stroke={MARKET_BLUE}
              strokeWidth={highlightedSeries === "index" ? 3 : 2.2}
              strokeOpacity={indexIsDimmed ? 0.15 : 1}
              className="transition-[stroke-opacity,stroke-width] duration-150"
              onMouseEnter={() => setHighlightedSeries("index")}
              onMouseLeave={() => setHighlightedSeries(null)}
            />
            <path
              d={terminalDensityArea(pickerTerminalDensity)}
              fill={ACTIVE_AMBER}
              fillOpacity={pickerIsDimmed ? 0.025 : highlightedSeries === "picker" ? 0.24 : 0.13}
              className="transition-[fill-opacity] duration-150"
              onMouseEnter={() => setHighlightedSeries("picker")}
              onMouseLeave={() => setHighlightedSeries(null)}
            />
            <path
              d={terminalDensityLine(pickerTerminalDensity)}
              fill="none"
              stroke={ACTIVE_AMBER}
              strokeWidth={highlightedSeries === "picker" ? 3 : 2.2}
              strokeOpacity={pickerIsDimmed ? 0.15 : 1}
              className="transition-[stroke-opacity,stroke-width] duration-150"
              onMouseEnter={() => setHighlightedSeries("picker")}
              onMouseLeave={() => setHighlightedSeries(null)}
            />
            {visibleMonteCarloPaths.map((path, index) => (
              <path
                key={`index-interaction-${index}`}
                d={indexPath(path)}
                fill="none"
                stroke="transparent"
                strokeWidth={8}
                pointerEvents="stroke"
                aria-hidden="true"
                onMouseEnter={() => setHighlightedSeries("index")}
                onMouseLeave={() => setHighlightedSeries(null)}
              />
            ))}
            {visibleMonteCarloPaths.map((path, index) => (
              <path
                key={`picker-interaction-${index}`}
                d={pickerPath(path)}
                fill="none"
                stroke="transparent"
                strokeWidth={8}
                pointerEvents="stroke"
                aria-hidden="true"
                onMouseEnter={() => setHighlightedSeries("picker")}
                onMouseLeave={() => setHighlightedSeries(null)}
              />
            ))}
            <text x={pathChart.left + (pathChart.width - pathChart.left - pathChart.right) / 2} y={pathChart.height - 4} textAnchor="middle" className="fill-zinc-500 text-[11px] dark:fill-zinc-400">
              Years
            </text>
            <text x={14} y={pathChart.top + (pathPlotBottom - pathChart.top) / 2} transform={`rotate(-90 14 ${pathChart.top + (pathPlotBottom - pathChart.top) / 2})`} textAnchor="middle" className="fill-zinc-500 text-[11px] dark:fill-zinc-400">
              Portfolio value · logarithmic scale
            </text>
          </svg>
        </div>
        <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-2 text-sm text-zinc-600 dark:text-zinc-300">
          <button
            type="button"
            aria-pressed={highlightedSeries === "index"}
            className={cx(
              "flex items-center gap-2 rounded-sm px-2 py-1 transition-opacity focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-700 dark:focus-visible:outline-blue-400",
              indexIsDimmed && "opacity-35"
            )}
            onMouseEnter={() => setHighlightedSeries("index")}
            onMouseLeave={() => setHighlightedSeries(null)}
            onFocus={() => setHighlightedSeries("index")}
            onBlur={() => setHighlightedSeries(null)}
            onClick={() => setHighlightedSeries("index")}
          >
            <span className="inline-block h-2.5 w-2.5 bg-blue-700 dark:bg-blue-400" />
            Broad index
          </button>
          <button
            type="button"
            aria-pressed={highlightedSeries === "picker"}
            className={cx(
              "flex items-center gap-2 rounded-sm px-2 py-1 transition-opacity focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-amber-600",
              pickerIsDimmed && "opacity-35"
            )}
            onMouseEnter={() => setHighlightedSeries("picker")}
            onMouseLeave={() => setHighlightedSeries(null)}
            onFocus={() => setHighlightedSeries("picker")}
            onBlur={() => setHighlightedSeries(null)}
            onClick={() => setHighlightedSeries("picker")}
          >
            <span className="inline-block h-2.5 w-2.5 bg-amber-500" />
            No-edge picker
          </button>
          <span className="text-xs text-zinc-500 dark:text-zinc-400">Hover any path, curve, or label to isolate that approach.</span>
        </div>
        <p className="mb-0 mt-4 text-sm leading-6 text-zinc-700 dark:text-zinc-200">
          Across 20,000 simulations, the no-edge picker finishes below the same market path in {Math.round(pickerBelowPairedIndex * 100)}% of cases.
        </p>
      </div>

      <figcaption className="mt-5 border-t border-zinc-200 pt-4 text-xs leading-5 text-zinc-500 dark:border-zinc-700 dark:text-zinc-400">
        Model inputs: $10,000 starting wealth, 30 years, 8% expected annual return for both approaches, 18% annual market volatility, and an additional independent 20% company-specific volatility for the picker. Returns are independently simulated each month and no additional costs are applied.
      </figcaption>
    </figure>
  );
}

const oneYearOutcomes = [
  { path: "+28%", probability: "50%", wealth: 12_800 },
  { path: "−12%", probability: "50%", wealth: 8_800 },
];

const twoYearOutcomes = [
  { path: "+28%, +28%", probability: "25%", wealth: 16_384 },
  { path: "one of each", probability: "50%", wealth: 11_264 },
  { path: "−12%, −12%", probability: "25%", wealth: 7_744 },
];

export function WorkedDistributionExamples() {
  return (
    <section className={panelClass} aria-label="Worked one-year and two-year stock-picking outcome distributions">
      <div className="grid gap-10 lg:grid-cols-2 lg:gap-12">
        <WorkedOutcomeTable
          heading="After one year"
          indexWealth={10_800}
          outcomes={oneYearOutcomes}
          expectedWealth={10_800}
          formula="½($12,800) + ½($8,800) = $10,800"
        />
        <WorkedOutcomeTable
          heading="After two years"
          indexWealth={11_664}
          outcomes={twoYearOutcomes}
          expectedWealth={11_664}
          formula="¼($16,384) + ½($11,264) + ¼($7,744) = $11,664"
        />
      </div>
      <p className="mb-0 mt-8 border-t border-zinc-200 pt-5 text-sm leading-6 text-zinc-700 dark:border-zinc-700 dark:text-zinc-200">
        After two years, the picker&apos;s expected wealth still equals the index. Yet 75% of picker paths finish behind it.
      </p>
    </section>
  );
}

function WorkedOutcomeTable({
  heading,
  indexWealth,
  outcomes,
  expectedWealth,
  formula,
}: {
  heading: string;
  indexWealth: number;
  outcomes: Array<{ path: string; probability: string; wealth: number }>;
  expectedWealth: number;
  formula: string;
}) {
  return (
    <div>
      <h3 className="m-0 font-serif text-2xl font-semibold text-zinc-950 dark:text-zinc-50">{heading}</h3>
      <p className="mb-0 mt-2 text-sm text-zinc-600 dark:text-zinc-300">
        Index: <span className="font-mono font-semibold text-blue-700 dark:text-blue-400">{formatMoney(indexWealth)}</span>
      </p>
      <table className="mt-4 w-full border-collapse text-left text-sm">
        <thead>
          <tr className="border-b border-zinc-300 text-xs text-zinc-500 dark:border-zinc-600 dark:text-zinc-400">
            <th className="py-2 pr-3 font-medium">Picker path</th>
            <th className="px-3 py-2 text-right font-medium">Probability</th>
            <th className="py-2 pl-3 text-right font-medium">Wealth</th>
          </tr>
        </thead>
        <tbody>
          {outcomes.map((outcome) => (
            <tr key={outcome.path} className="border-b border-zinc-200 dark:border-zinc-700">
              <td className="py-3 pr-3 text-zinc-800 dark:text-zinc-200">{outcome.path}</td>
              <td className="px-3 py-3 text-right font-mono tabular-nums text-zinc-600 dark:text-zinc-300">{outcome.probability}</td>
              <td className="py-3 pl-3 text-right font-mono font-semibold tabular-nums text-amber-700 dark:text-amber-400">
                {formatMoney(outcome.wealth)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      <p className="mb-0 mt-4 font-mono text-xs leading-5 text-zinc-700 dark:text-zinc-200">{formula}</p>
      <p className="mb-0 mt-1 text-xs text-zinc-500 dark:text-zinc-400">
        Expected picker wealth = {formatMoney(expectedWealth)}
      </p>
    </div>
  );
}

type DistributionPoint = {
  wins: number;
  probability: number;
  wealth: number;
};

const combinations = (n: number, k: number) => {
  let result = 1;
  for (let i = 1; i <= k; i += 1) result = (result * (n - k + i)) / i;
  return result;
};

function getDistribution(years: number) {
  const startingValue = 10_000;
  const marketWealth = startingValue * 1.08 ** years;
  const points: DistributionPoint[] = Array.from({ length: years + 1 }, (_, wins) => ({
    wins,
    probability: combinations(years, wins) / 2 ** years,
    wealth: startingValue * 1.28 ** wins * 0.88 ** (years - wins),
  }));

  const meanWealth = points.reduce((sum, point) => sum + point.probability * point.wealth, 0);
  const geometricMeanWealth = startingValue * Math.sqrt(1.28 * 0.88) ** years;

  const behindProbability = points
    .filter((point) => point.wealth < marketWealth)
    .reduce((sum, point) => sum + point.probability, 0);
  const belowIndexWealthContribution = points
    .filter((point) => point.wealth < marketWealth)
    .reduce((sum, point) => sum + point.probability * point.wealth, 0) / meanWealth;

  return {
    points,
    marketWealth,
    meanWealth,
    geometricMeanWealth,
    behindProbability,
    belowIndexWealthContribution,
  };
}

function weightedWealthQuantile(points: DistributionPoint[], quantile: number) {
  let cumulativeProbability = 0;
  for (const point of points) {
    cumulativeProbability += point.probability;
    if (cumulativeProbability >= quantile) return point.wealth;
  }
  return points[points.length - 1].wealth;
}

const formatMultiple = (value: number) =>
  `${value.toFixed(value < 2 ? 1 : 0)}×`;

export function OutcomeDistribution() {
  const [years, setYears] = useState(30);
  const distribution = useMemo(() => getDistribution(years), [years]);

  const chart = {
    width: 880,
    height: 405,
    left: 48,
    right: 22,
    pickerTop: 165,
    bottom: 52,
  };
  const innerWidth = chart.width - chart.left - chart.right;
  const pickerBottom = chart.height - chart.bottom;
  const pickerHeight = pickerBottom - chart.pickerTop;
  const medianWealth = weightedWealthQuantile(distribution.points, 0.5);
  const medianRatio = medianWealth / distribution.marketWealth;
  const percentile99Wealth = weightedWealthQuantile(distribution.points, 0.99);
  const maxDisplayedRatio = Math.max(1.25, (percentile99Wealth / distribution.marketWealth) * 1.08);
  const displayedPoints = distribution.points.filter(
    (point) => point.wealth / distribution.marketWealth <= maxDisplayedRatio
  );
  const tailProbability = 1 - displayedPoints.reduce((sum, point) => sum + point.probability, 0);
  const maxProbability = Math.max(...displayedPoints.map((point) => point.probability));
  const x = scaleLinear()
    .domain([0, maxDisplayedRatio])
    .range([chart.left, chart.width - chart.right]);
  const y = scaleLinear()
    .domain([0, maxProbability])
    .nice(4)
    .range([pickerBottom, chart.pickerTop]);
  const yTicks = y.ticks(4).filter((tick) => tick > 0);
  const distributionPath = d3Line<DistributionPoint>()
    .x((point) => x(point.wealth / distribution.marketWealth))
    .y((point) => y(point.probability))(displayedPoints) ?? "";
  const marketX = x(1);
  const medianX = x(medianRatio);

  const ticks = [...x.ticks(5), 1]
    .sort((a, b) => a - b)
    .filter((value, index, values) => index === 0 || Math.abs(value - values[index - 1]) > 0.01);

  return (
    <section className={panelClass} aria-label="Index and stock-picker distributions in the simplified no-edge toy model">
      <div className="mb-5 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-wrap gap-x-5 gap-y-2 text-sm text-zinc-600 dark:text-zinc-300">
          <span><span className="mr-2 inline-block h-2.5 w-2.5 bg-blue-700 dark:bg-blue-400" />Toy index: fixed +8% each year</span>
          <span><span className="mr-2 inline-block h-2.5 w-2.5 bg-amber-500" />Toy picker: independent 50/50 result each year</span>
        </div>
        <div className="inline-flex self-start border border-zinc-300 dark:border-zinc-600" aria-label="Investment horizon">
          {[2, 10, 30].map((option) => (
            <button
              key={option}
              type="button"
              onClick={() => setYears(option)}
              className={cx(
                "px-4 py-2 text-sm font-medium transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600",
                option === years
                  ? "bg-blue-700 text-white"
                  : "bg-white text-zinc-700 hover:bg-zinc-50 dark:bg-zinc-900 dark:text-zinc-200 dark:hover:bg-zinc-800"
              )}
              aria-pressed={option === years}
            >
              {option} {option === 1 ? "year" : "years"}
            </button>
          ))}
        </div>
      </div>

      <div className="flex flex-col">
        <div className="order-2 overflow-x-auto sm:order-1">
          <svg
            viewBox={`0 0 ${chart.width} ${chart.height}`}
            className="min-w-[640px] sm:min-w-[720px]"
            role="img"
            aria-label={`In the toy model after ${years} years, the index has one possible outcome at ${formatMoney(distribution.marketWealth)}. The picker has the same expected wealth and a wider distribution; ${Math.round(distribution.behindProbability * 100)} percent of picker paths finish below the index.`}
          >
          <text x={chart.left} y={18} className="fill-zinc-700 text-[12px] font-semibold dark:fill-zinc-200">
            Toy index distribution
          </text>
          <line
            x1={chart.left}
            y1={105}
            x2={chart.width - chart.right}
            y2={105}
            className="stroke-zinc-200 dark:stroke-zinc-700"
          />
          <line
            x1={marketX}
            y1={48}
            x2={marketX}
            y2={105}
            stroke={MARKET_BLUE}
            strokeWidth={3}
          />
          <circle cx={marketX} cy={48} r={5} fill={MARKET_BLUE} />
          <text x={marketX} y={38} textAnchor="middle" fill={MARKET_BLUE} className="text-[13px] font-bold">
            100% at {formatMoney(distribution.marketWealth)}
          </text>
          <text x={chart.left} y={137} className="fill-zinc-700 text-[12px] font-semibold dark:fill-zinc-200">
            Toy stock-picker distribution
          </text>
          {yTicks.map((tick) => (
            <g key={tick}>
              <line
                x1={chart.left}
                y1={y(tick)}
                x2={chart.width - chart.right}
                y2={y(tick)}
                className="stroke-zinc-200 dark:stroke-zinc-700"
              />
              <text
                x={chart.left - 8}
                y={y(tick) + 4}
                textAnchor="end"
                className="fill-zinc-500 text-[11px] dark:fill-zinc-400"
              >
                {`${Math.round(tick * 100)}%`}
              </text>
            </g>
          ))}
          <line
            x1={chart.left}
            y1={pickerBottom}
            x2={chart.width - chart.right}
            y2={pickerBottom}
            className="stroke-zinc-300 dark:stroke-zinc-600"
          />
          <path
            d={distributionPath}
            fill="none"
            stroke={ACTIVE_AMBER}
            strokeWidth={2}
            strokeOpacity={0.28}
          />
          {displayedPoints.map((point) => {
            const wealthRatio = point.wealth / distribution.marketWealth;
            const pointY = y(point.probability);
            const markerRadius = 3 + 6 * Math.sqrt(point.probability / maxProbability);
            const opacity = wealthRatio < 1 ? 0.95 : 0.65;
            return (
              <g key={point.wins}>
                <line
                  x1={x(wealthRatio)}
                  y1={pickerBottom}
                  x2={x(wealthRatio)}
                  y2={pointY}
                  stroke={ACTIVE_AMBER}
                  strokeWidth={2}
                  opacity={opacity}
                />
                <circle
                  cx={x(wealthRatio)}
                  cy={pointY}
                  r={markerRadius}
                  fill={ACTIVE_AMBER}
                  opacity={opacity}
                  stroke="white"
                  strokeWidth={1.5}
                >
                  <title>{`${(point.probability * 100).toFixed(1)}% finish at ${formatMultiple(wealthRatio)} the index, or ${formatMoney(point.wealth)}`}</title>
                </circle>
              </g>
            );
          })}
          <line
            x1={marketX}
            y1={chart.pickerTop}
            x2={marketX}
            y2={pickerBottom}
            stroke={MARKET_BLUE}
            strokeWidth={2.5}
          />
          <text x={marketX} y={chart.pickerTop - 8} textAnchor="middle" fill={MARKET_BLUE} className="text-[12px] font-bold">
            Index outcome and picker mean: 1×
          </text>
          <line
            x1={medianX}
            y1={chart.pickerTop}
            x2={medianX}
            y2={pickerBottom}
            className="stroke-zinc-600 dark:stroke-zinc-300"
            strokeWidth={2}
            strokeDasharray="5 5"
          />
          <text
            x={medianX + (medianRatio > 0.75 ? -8 : 8)}
            y={chart.pickerTop + 15}
            textAnchor={medianRatio > 0.75 ? "end" : "start"}
            className="fill-zinc-700 text-[11px] font-semibold dark:fill-zinc-200"
          >
            Median picker: {formatMultiple(medianRatio)}
          </text>
          {tailProbability > 0.0001 && (
            <text
              x={chart.width - chart.right}
              y={chart.pickerTop + 15}
              textAnchor="end"
              className="fill-amber-700 text-[11px] font-semibold dark:fill-amber-400"
            >
              {(tailProbability * 100).toFixed(1)}% continues right →
            </text>
          )}
          {ticks.map((tick) => (
            <g key={tick}>
              <line
                x1={x(tick)}
                y1={pickerBottom}
                x2={x(tick)}
                y2={pickerBottom + 6}
                className="stroke-zinc-400 dark:stroke-zinc-500"
              />
              <text
                x={x(tick)}
                y={chart.height - 18}
                textAnchor={tick === 0 ? "start" : tick === ticks[ticks.length - 1] ? "end" : "middle"}
                className="fill-zinc-500 text-[11px] dark:fill-zinc-400"
              >
                {formatMultiple(tick)}
              </text>
            </g>
          ))}
          <text
            x={chart.left + innerWidth / 2}
            y={chart.height - 1}
            textAnchor="middle"
            className="fill-zinc-500 text-[11px] dark:fill-zinc-400"
          >
            Ending wealth as a multiple of the index (linear scale)
          </text>
          <text
            x={12}
            y={chart.pickerTop + pickerHeight / 2}
            transform={`rotate(-90 12 ${chart.pickerTop + pickerHeight / 2})`}
            textAnchor="middle"
            className="fill-zinc-500 text-[11px] dark:fill-zinc-400"
          >
            Picker outcome probability
          </text>
          </svg>
        </div>

        <div className="order-1 mb-4 grid grid-cols-2 gap-px bg-zinc-200 sm:order-2 sm:mb-0 sm:mt-4 sm:grid-cols-4 dark:bg-zinc-700">
          <Stat label="Expected annual return" value="+8% for both" color="blue" />
          <Stat label="Expected ending wealth" value={formatMoney(distribution.meanWealth)} color="blue" />
          <Stat label="Median picker outcome" value={formatMoney(medianWealth)} color="amber" />
          <Stat
            label="Picker paths below index"
            value={`${Math.round(distribution.behindProbability * 100)}%`}
            color="amber"
          />
        </div>
      </div>
      <TailContributionChart
        behindProbability={distribution.behindProbability}
        belowIndexWealthContribution={distribution.belowIndexWealthContribution}
      />
      <p className="mb-0 mt-4 text-xs leading-5 text-zinc-500 dark:text-zinc-400">
        Each dot is an attainable ending value in the toy model, and its stem shows the probability of that outcome. The faint connecting line is only a visual guide; outcomes between the dots are not possible under these assumptions. The chart stops near the 99th percentile so rare extreme outcomes do not compress the rest of the distribution.
      </p>
    </section>
  );
}

function TailContributionChart({
  behindProbability,
  belowIndexWealthContribution,
}: {
  behindProbability: number;
  belowIndexWealthContribution: number;
}) {
  const rows = [
    { label: "Share of picker paths", below: behindProbability },
    { label: "Share of mean ending wealth", below: belowIndexWealthContribution },
  ];

  return (
    <div className="mt-8 border-t border-zinc-200 pt-6 dark:border-zinc-700">
      <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
        <h4 className="m-0 font-serif text-xl font-semibold text-zinc-950 dark:text-zinc-50">
          A few large outcomes keep the average high
        </h4>
        <div className="flex gap-4 text-xs text-zinc-600 dark:text-zinc-300">
          <span><span className="mr-1.5 inline-block h-2.5 w-2.5 bg-zinc-300 dark:bg-zinc-600" />Below index</span>
          <span><span className="mr-1.5 inline-block h-2.5 w-2.5 bg-amber-500" />At or above index</span>
        </div>
      </div>
      <div className="space-y-4">
        {rows.map((row) => {
          const above = 1 - row.below;
          return (
            <div key={row.label} className="grid gap-2 sm:grid-cols-[12rem_1fr] sm:items-center">
              <p className="m-0 text-sm font-medium text-zinc-700 dark:text-zinc-200">{row.label}</p>
              <div className="flex h-8 overflow-hidden" aria-label={`${row.label}: ${(row.below * 100).toFixed(1)} percent below the index and ${(above * 100).toFixed(1)} percent at or above it`}>
                <div
                  className="flex items-center justify-center bg-zinc-300 text-xs font-semibold text-zinc-800 dark:bg-zinc-600 dark:text-zinc-100"
                  style={{ width: `${row.below * 100}%` }}
                >
                  {(row.below * 100).toFixed(1)}%
                </div>
                <div
                  className="flex items-center justify-center bg-amber-500 text-xs font-semibold text-zinc-950"
                  style={{ width: `${above * 100}%` }}
                >
                  {(above * 100).toFixed(1)}%
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function Stat({ label, value, color }: { label: string; value: string; color: "blue" | "amber" }) {
  return (
    <div className="bg-white px-2 py-4 sm:px-4 sm:py-5 dark:bg-zinc-900">
      <p className="m-0 text-xs font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">{label}</p>
      <p className={cx(
        "mb-0 mt-1 font-serif text-lg font-semibold tabular-nums sm:text-2xl",
        color === "blue" ? "text-blue-700 dark:text-blue-400" : "text-amber-700 dark:text-amber-400"
      )}>
        {value}
      </p>
    </div>
  );
}

const pickerMeanGrowthAfterCost = 1.08 * 0.99;
const pickerGeometricGrowthAfterCost = Math.sqrt(1.28 * 0.88) * 0.99;
const thirtyYearTrend = Array.from({ length: 31 }, (_, year) => ({
  year,
  index: 10_000 * 1.08 ** year,
  activeMeanAfterCost: 10_000 * pickerMeanGrowthAfterCost ** year,
  activeGeometricAfterCost: 10_000 * pickerGeometricGrowthAfterCost ** year,
}));

export function ThirtyYearComparison() {
  const chart = {
    width: 880,
    height: 380,
    left: 64,
    right: 230,
    top: 24,
    bottom: 52,
  };
  const plotRight = chart.width - chart.right;
  const plotBottom = chart.height - chart.bottom;
  const innerWidth = plotRight - chart.left;
  const innerHeight = plotBottom - chart.top;
  const x = scaleLinear().domain([0, 30]).range([chart.left, plotRight]);
  const y = scaleLinear().domain([0, 110_000]).nice(4).range([plotBottom, chart.top]);
  const xTicks = x.ticks(3);
  const yTicks = y.ticks(3);
  const pathFor = (key: "index" | "activeMeanAfterCost" | "activeGeometricAfterCost") =>
    d3Line<(typeof thirtyYearTrend)[number]>()
      .x((point) => x(point.year))
      .y((point) => y(point[key]))(thirtyYearTrend) ?? "";
  const final = thirtyYearTrend[thirtyYearTrend.length - 1];

  return (
    <figure className={panelClass} aria-label="Thirty-year wealth paths for an index and a zero-alpha stock picker">
      <div className="overflow-x-auto">
        <svg
          viewBox={`0 0 ${chart.width} ${chart.height}`}
          className="min-w-[720px]"
          role="img"
          aria-label={`Starting with $10,000, the index and mean picker before costs reach ${formatMoney(final.index)}. With a one percent annual fee on the picker, mean picker wealth reaches ${formatMoney(final.activeMeanAfterCost)} and the geometric-mean path reaches ${formatMoney(final.activeGeometricAfterCost)}.`}
        >
          {yTicks.map((tick) => (
            <g key={tick}>
              <line
                x1={chart.left}
                y1={y(tick)}
                x2={plotRight}
                y2={y(tick)}
                className="stroke-zinc-200 dark:stroke-zinc-700"
              />
              <text
                x={chart.left - 10}
                y={y(tick) + 4}
                textAnchor="end"
                className="fill-zinc-500 text-[11px] dark:fill-zinc-400"
              >
                {tick === 0 ? "$0" : `$${tick / 1000}k`}
              </text>
            </g>
          ))}
          {xTicks.map((tick) => (
            <g key={tick}>
              <line
                x1={x(tick)}
                y1={plotBottom}
                x2={x(tick)}
                y2={plotBottom + 6}
                className="stroke-zinc-400 dark:stroke-zinc-500"
              />
              <text
                x={x(tick)}
                y={chart.height - 20}
                textAnchor="middle"
                className="fill-zinc-500 text-[11px] dark:fill-zinc-400"
              >
                {tick}
              </text>
            </g>
          ))}
          <line x1={chart.left} y1={plotBottom} x2={plotRight} y2={plotBottom} className="stroke-zinc-400 dark:stroke-zinc-500" />
          <path d={pathFor("index")} fill="none" stroke={MARKET_BLUE} strokeWidth={3} />
          <path d={pathFor("activeMeanAfterCost")} fill="none" stroke={ACTIVE_AMBER} strokeWidth={3} />
          <path
            d={pathFor("activeGeometricAfterCost")}
            fill="none"
            className="stroke-zinc-500 dark:stroke-zinc-300"
            strokeWidth={2}
            strokeDasharray="6 5"
          />

          <TrendLabel
            x={plotRight + 14}
            y={y(final.index) - 8}
            color={MARKET_BLUE}
            lines={["Index = mean picker", "before costs", formatMoney(final.index)]}
          />
          <TrendLabel
            x={plotRight + 14}
            y={y(final.activeMeanAfterCost) - 8}
            color={ACTIVE_AMBER}
            lines={["Mean picker", "after 1% fee", formatMoney(final.activeMeanAfterCost)]}
          />
          <TrendLabel
            x={plotRight + 14}
            y={y(final.activeGeometricAfterCost) - 8}
            lines={["Geometric-mean path", "after 1% fee", formatMoney(final.activeGeometricAfterCost)]}
          />
          <text
            x={chart.left + innerWidth / 2}
            y={chart.height - 1}
            textAnchor="middle"
            className="fill-zinc-500 text-[11px] dark:fill-zinc-400"
          >
            Years
          </text>
        </svg>
      </div>
      <figcaption className="mt-4 text-xs leading-5 text-zinc-500 dark:text-zinc-400">
        The 1% annual fee is illustrative and is applied to the picker&apos;s assets after each year&apos;s return. The geometric-mean path compounds at √(1.28 × 0.88) × 0.99 − 1 ≈ 5.1%; the mean is kept higher by relatively rare large outcomes.
      </figcaption>
    </figure>
  );
}

function TrendLabel({
  x,
  y,
  lines,
  color,
}: {
  x: number;
  y: number;
  lines: string[];
  color?: string;
}) {
  return (
    <text
      x={x}
      y={y}
      style={color ? { fill: color } : undefined}
      className={cx("text-[12px] font-semibold", color == null && "fill-zinc-700 dark:fill-zinc-200")}
    >
      {lines.map((line, index) => (
        <tspan key={line} x={x} dy={index === 0 ? 0 : 16}>{line}</tspan>
      ))}
    </text>
  );
}

const professionalFundAlpha = [
  { label: "Equal-weight · 3-factor", gross: 0.36, net: -0.93 },
  { label: "Equal-weight · 4-factor", gross: 0.39, net: -0.92 },
  { label: "Value-weight · 3-factor", gross: 0.13, net: -0.81 },
  { label: "Value-weight · 4-factor", gross: -0.05, net: -1.0 },
];

const formatSignedPercent = (value: number, digits = 2) =>
  `${value > 0 ? "+" : value < 0 ? "−" : ""}${Math.abs(value).toFixed(digits)}%`;

export function ProfessionalFundCostEvidence() {
  const width = 880;
  const height = 340;
  const left = 205;
  const right = 38;
  const top = 54;
  const bottom = 56;
  const x = scaleLinear().domain([-1.1, 0.5]).range([left, width - right]);
  const rowGap = 58;
  const xTicks = [-1, -0.5, 0, 0.5];

  return (
    <figure className={panelClass} aria-label="Gross and net annual alpha for portfolios of active U.S. equity mutual funds">
      <div className="mb-5 flex flex-wrap gap-x-6 gap-y-2 text-sm text-zinc-600 dark:text-zinc-300">
        <span><span className="mr-2 inline-block h-2.5 w-2.5 rounded-full bg-blue-700 align-middle dark:bg-blue-400" />Before fund expenses</span>
        <span><span className="mr-2 inline-block h-2.5 w-2.5 rounded-full bg-amber-500 align-middle" />Return received by investors</span>
      </div>
      <div className="overflow-x-auto">
        <svg
          viewBox={`0 0 ${width} ${height}`}
          className="min-w-[700px]"
          role="img"
          aria-label="Across four weighting and factor-model combinations, estimated annual alpha was close to zero before fund expenses and ranged from minus 0.81 to minus 1 percent after expenses."
        >
          <text x={left} y={20} className="fill-zinc-700 text-[12px] font-semibold dark:fill-zinc-200">
            Estimated annual alpha after adjusting for market factors
          </text>
          {xTicks.map((tick) => (
            <g key={tick}>
              <line
                x1={x(tick)}
                y1={top - 12}
                x2={x(tick)}
                y2={height - bottom}
                className={tick === 0 ? "stroke-zinc-500 dark:stroke-zinc-400" : "stroke-zinc-200 dark:stroke-zinc-700"}
                strokeWidth={tick === 0 ? 2 : 1}
              />
              <text
                x={x(tick)}
                y={height - 28}
                textAnchor="middle"
                className="fill-zinc-500 text-[11px] dark:fill-zinc-400"
              >
                {formatSignedPercent(tick, 1)}
              </text>
            </g>
          ))}
          {professionalFundAlpha.map((row, index) => {
            const rowY = top + index * rowGap;
            return (
              <g key={row.label}>
                <text
                  x={left - 14}
                  y={rowY + 4}
                  textAnchor="end"
                  className="fill-zinc-700 text-[12px] font-medium dark:fill-zinc-200"
                >
                  {row.label}
                </text>
                <line x1={x(row.net)} y1={rowY} x2={x(row.gross)} y2={rowY} className="stroke-zinc-300 dark:stroke-zinc-600" strokeWidth={3} />
                <circle cx={x(row.gross)} cy={rowY} r={6} fill={MARKET_BLUE} />
                <circle cx={x(row.net)} cy={rowY} r={6} fill={ACTIVE_AMBER} />
                <text x={x(row.gross) + 10} y={rowY + 4} textAnchor="start" fill={MARKET_BLUE} className="text-[11px] font-semibold">
                  {formatSignedPercent(row.gross)}
                </text>
                <text x={x(row.net) - 10} y={rowY + 4} textAnchor="end" fill={ACTIVE_AMBER} className="text-[11px] font-semibold">
                  {formatSignedPercent(row.net)}
                </text>
              </g>
            );
          })}
          <text
            x={left + (width - right - left) / 2}
            y={height - 3}
            textAnchor="middle"
            className="fill-zinc-500 text-[11px] dark:fill-zinc-400"
          >
            Annual alpha
          </text>
        </svg>
      </div>
      <figcaption className="mt-3 text-xs leading-5 text-zinc-500 dark:text-zinc-400">
        Active U.S. equity mutual funds, January 1984 through September 2006. Gross returns add fund expense ratios back to investor returns but remain after trading costs. The gross estimates were not statistically distinguishable from zero. Equal-weight results describe the average fund; value-weight results describe the aggregate invested dollar. Source: Fama and French (2010), Table II.
      </figcaption>
      <table className="sr-only">
        <caption>Annual benchmark-adjusted alpha for active U.S. equity mutual funds</caption>
        <thead><tr><th>Portfolio and model</th><th>Before fund expenses</th><th>Return received by investors</th></tr></thead>
        <tbody>
          {professionalFundAlpha.map((row) => (
            <tr key={`table-${row.label}`}><td>{row.label}</td><td>{formatSignedPercent(row.gross)}</td><td>{formatSignedPercent(row.net)}</td></tr>
          ))}
        </tbody>
      </table>
    </figure>
  );
}

type RetailReturnMode = "gross" | "net";

const retailReturnQuantiles = [
  { percentile: 1, gross: -4.32, net: -4.86 },
  { percentile: 5, gross: -2.12, net: -2.45 },
  { percentile: 10, gross: -1.34, net: -1.60 },
  { percentile: 25, gross: -0.57, net: -0.73 },
  { percentile: 50, gross: -0.01, net: -0.14 },
  { percentile: 75, gross: 0.66, net: 0.50 },
  { percentile: 90, gross: 1.62, net: 1.40 },
  { percentile: 95, gross: 2.41, net: 2.15 },
  { percentile: 99, gross: 4.86, net: 4.44 },
];

const retailBeatRate: Record<RetailReturnMode, number> = {
  gross: 49.3,
  net: 43.4,
};

const percentileLabel = (percentile: number) => {
  if (percentile === 1) return "1st";
  if (percentile === 99) return "99th";
  return `${percentile}th`;
};

const formatPercentagePoints = (value: number) =>
  `${value > 0 ? "+" : value < 0 ? "−" : ""}${Math.abs(value).toFixed(value === 0 ? 0 : 2)} pp`;

const formatAnnualizedGap = (value: number) =>
  `${value >= 0 ? "+" : "−"}${Math.abs(value).toFixed(1)} pp`;

const formatOneDecimalPercent = (value: number) =>
  `${value >= 0 ? "+" : "−"}${Math.abs(value).toFixed(1)}%`;

const approximateAnnualGap = (monthlyGap: number) => monthlyGap * 12;

function RetailStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-white px-4 py-4 dark:bg-zinc-900">
      <p className="m-0 text-xs font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
        {label}
      </p>
      <p className="mb-0 mt-2 text-sm font-semibold leading-5 text-zinc-900 dark:text-zinc-100">
        {value}
      </p>
    </div>
  );
}

export function RetailPerformanceEvidence() {
  const [mode, setMode] = useState<RetailReturnMode>("net");
  const width = 880;
  const height = 390;
  const left = 70;
  const right = 28;
  const top = 50;
  const bottom = 62;
  const plotBottom = height - bottom;
  const x = scaleLinear().domain([1, 99]).range([left, width - right]);
  const y = scaleLinear().domain([-5, 5]).range([plotBottom, top]);
  const trailingShare = 100 - retailBeatRate[mode];
  const points = [
    ...retailReturnQuantiles.map((point) => ({
      percentile: point.percentile,
      value: point[mode],
    })),
    { percentile: trailingShare, value: 0 },
  ].sort((a, b) => a.percentile - b.percentile);
  const linePath = d3Line<(typeof points)[number]>()
    .x((point) => x(point.percentile))
    .y((point) => y(point.value))(points) ?? "";
  const areaPath = d3Area<(typeof points)[number]>()
    .x((point) => x(point.percentile))
    .y0(y(0))
    .y1((point) => y(point.value))(points) ?? "";
  const xTicks = [1, 25, 50, 75, 99];
  const yTicks = [-5, -2.5, 0, 2.5, 5];
  const annotations = retailReturnQuantiles.filter((point) => [5, 50, 95].includes(point.percentile));

  return (
    <figure className={panelClass} aria-label="Distribution of retail household returns relative to the market">
      <div className="mb-5 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-wrap gap-x-5 gap-y-2 text-sm text-zinc-600 dark:text-zinc-300">
          <span><span className="mr-2 inline-block h-0.5 w-4 align-middle bg-blue-700 dark:bg-blue-400" />Market benchmark = 0</span>
          <span><span className="mr-2 inline-block h-0.5 w-4 align-middle bg-amber-500" />Households in one broker sample</span>
        </div>
        <div className="inline-flex self-start border border-zinc-300 dark:border-zinc-600" aria-label="Treatment of trading costs">
          {(["gross", "net"] as const).map((option) => (
            <button
              key={option}
              type="button"
              onClick={() => setMode(option)}
              className={cx(
                "px-4 py-2 text-sm font-medium transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600",
                option === mode
                  ? "bg-blue-700 text-white"
                  : "bg-white text-zinc-700 hover:bg-zinc-50 dark:bg-zinc-900 dark:text-zinc-200 dark:hover:bg-zinc-800"
              )}
              aria-pressed={option === mode}
            >
              {option === "gross" ? "Gross return" : "Net of trading costs"}
            </button>
          ))}
        </div>
      </div>
      <div className="mb-6 grid gap-px bg-zinc-200 sm:grid-cols-2 lg:grid-cols-4 dark:bg-zinc-700">
        <RetailStat
          label="Forward expectation without an edge"
          value={mode === "gross" ? "Risk-matched benchmark" : "Risk-matched benchmark minus added costs"}
        />
        <RetailStat
          label="Observed median"
          value={`${formatPercentagePoints(retailReturnQuantiles[4][mode])} / month`}
        />
        <RetailStat
          label="Observed middle 50%"
          value={`${formatPercentagePoints(retailReturnQuantiles[3][mode])} to ${formatPercentagePoints(retailReturnQuantiles[5][mode])}`}
        />
        <RetailStat
          label="Observed share above market"
          value={`${retailBeatRate[mode].toFixed(1)}%`}
        />
      </div>
      <div className="overflow-x-auto">
        <svg
          viewBox={`0 0 ${width} ${height}`}
          className="min-w-[700px]"
          role="img"
          aria-label={`${trailingShare.toFixed(1)} percent of retail households did not beat the market ${mode === "net" ? "after" : "before"} trading costs. The 5th percentile trailed by ${Math.abs(retailReturnQuantiles[1][mode]).toFixed(2)} percentage points per month, while the 95th percentile beat it by ${retailReturnQuantiles[7][mode].toFixed(2)} percentage points per month.`}
        >
          <rect
            x={left}
            y={top}
            width={width - left - right}
            height={plotBottom - top}
            fill="none"
            className="stroke-zinc-200 dark:stroke-zinc-700"
          />
          {yTicks.map((tick) => (
            <g key={tick}>
              <line
                x1={left}
                y1={y(tick)}
                x2={width - right}
                y2={y(tick)}
                className={tick === 0 ? "stroke-blue-700 dark:stroke-blue-400" : "stroke-zinc-200 dark:stroke-zinc-700"}
                strokeWidth={tick === 0 ? 2.5 : 1}
              />
              <text
                x={left - 10}
                y={y(tick) + 4}
                textAnchor="end"
                className="fill-zinc-500 text-[11px] dark:fill-zinc-400"
              >
                {formatPercentagePoints(tick)}
              </text>
            </g>
          ))}
          <path d={areaPath} fill={ACTIVE_AMBER} opacity={0.14} />
          <path d={linePath} fill="none" stroke={ACTIVE_AMBER} strokeWidth={3} />
          {points.map((point) => (
            <circle
              key={`${point.percentile}-${point.value}`}
              cx={x(point.percentile)}
              cy={y(point.value)}
              r={point.percentile === trailingShare ? 4.5 : 3}
              fill={point.percentile === trailingShare ? MARKET_BLUE : ACTIVE_AMBER}
              stroke="white"
              strokeWidth={1.5}
            />
          ))}
          <line
            x1={x(trailingShare)}
            y1={top}
            x2={x(trailingShare)}
            y2={plotBottom}
            className="stroke-zinc-400 dark:stroke-zinc-500"
            strokeDasharray="4 5"
          />
          <text
            x={x((1 + trailingShare) / 2)}
            y={28}
            textAnchor="middle"
            className="fill-zinc-700 text-[12px] font-semibold dark:fill-zinc-200"
          >
            {trailingShare.toFixed(1)}% did not beat the market
          </text>
          <text
            x={x((trailingShare + 99) / 2)}
            y={28}
            textAnchor="middle"
            className="fill-zinc-500 text-[12px] dark:fill-zinc-400"
          >
            {retailBeatRate[mode].toFixed(1)}% beat it
          </text>
          {annotations.map((point) => {
            const value = point[mode];
            const isRight = point.percentile === 95;
            const isMedian = point.percentile === 50;
            return (
              <g key={`annotation-${point.percentile}`}>
                <circle cx={x(point.percentile)} cy={y(value)} r={5} fill={ACTIVE_AMBER} />
                <text
                  x={x(point.percentile) + (isRight ? -10 : 10)}
                  y={y(value) + (isMedian ? 24 : value < 0 ? 20 : -12)}
                  textAnchor={isRight ? "end" : "start"}
                  className="fill-amber-700 text-[12px] font-semibold dark:fill-amber-400"
                >
                  {point.percentile === 50 ? (
                    <>
                      <tspan x={x(point.percentile) + 10}>Median {formatPercentagePoints(value)}/month</tspan>
                      <tspan x={x(point.percentile) + 10} dy={15}>≈ {formatAnnualizedGap(approximateAnnualGap(value))}/year</tspan>
                    </>
                  ) : (
                    <>{percentileLabel(point.percentile)} {formatPercentagePoints(value)}/month</>
                  )}
                </text>
              </g>
            );
          })}
          {xTicks.map((tick) => (
            <g key={tick}>
              <line
                x1={x(tick)}
                y1={plotBottom}
                x2={x(tick)}
                y2={plotBottom + 6}
                className="stroke-zinc-400 dark:stroke-zinc-500"
              />
              <text
                x={x(tick)}
                y={plotBottom + 22}
                textAnchor={tick === 1 ? "start" : tick === 99 ? "end" : "middle"}
                className="fill-zinc-500 text-[11px] dark:fill-zinc-400"
              >
                {percentileLabel(tick)}
              </text>
            </g>
          ))}
          <text
            x={left + (width - left - right) / 2}
            y={height - 6}
            textAnchor="middle"
            className="fill-zinc-500 text-[11px] dark:fill-zinc-400"
          >
            Households ordered from worst to best result
          </text>
          <text
            x={14}
            y={top + (plotBottom - top) / 2}
            transform={`rotate(-90 14 ${top + (plotBottom - top) / 2})`}
            textAnchor="middle"
            className="fill-zinc-500 text-[11px] dark:fill-zinc-400"
          >
            Average monthly gap from market, percentage points
          </text>
        </svg>
      </div>
      <figcaption className="mt-3 text-xs leading-5 text-zinc-500 dark:text-zinc-400">
        Reported percentiles for 62,439 U.S. discount-brokerage households with more than 12 months of records, 1991–1996. Each value is a household&apos;s average monthly return minus the market return. The approximate annual gap multiplies the monthly percentage-point difference by 12.
      </figcaption>
      <table className="sr-only">
        <caption>Reported percentiles of average monthly household returns relative to the market</caption>
        <thead><tr><th>Percentile</th><th>Before costs</th><th>After costs</th></tr></thead>
        <tbody>
          {retailReturnQuantiles.map((point) => (
            <tr key={`table-${point.percentile}`}>
              <td>{percentileLabel(point.percentile)}</td>
              <td>{formatPercentagePoints(point.gross)}</td>
              <td>{formatPercentagePoints(point.net)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </figure>
  );
}

const retailTurnoverAlpha = [
  { quintile: "Lowest", turnover: 0.19, gross: -0.048, net: -0.061 },
  { quintile: "2", turnover: 1.24, gross: -0.072, net: -0.13 },
  { quintile: "3", turnover: 2.89, gross: -0.149, net: -0.269 },
  { quintile: "4", turnover: 5.98, gross: -0.237, net: -0.464 },
  { quintile: "Highest", turnover: 21.49, gross: -0.359, net: -0.864 },
];

export function RetailActivityEvidence() {
  const width = 880;
  const height = 390;
  const left = 72;
  const right = 34;
  const top = 44;
  const bottom = 88;
  const plotBottom = height - bottom;
  const x = scaleLinear().domain([0, retailTurnoverAlpha.length - 1]).range([left, width - right]);
  const y = scaleLinear().domain([-0.9, 0]).range([plotBottom, top]);
  const yTicks = [-0.9, -0.6, -0.3, 0];
  const lineFor = (key: "gross" | "net") =>
    d3Line<(typeof retailTurnoverAlpha)[number]>()
      .x((_, index) => x(index))
      .y((point) => y(point[key]))(retailTurnoverAlpha) ?? "";

  return (
    <figure className={panelClass} aria-label="Retail household trading activity and benchmark-adjusted returns">
      <div className="mb-5 flex flex-wrap gap-x-6 gap-y-2 text-sm text-zinc-600 dark:text-zinc-300">
        <span><span className="mr-2 inline-block h-0.5 w-4 align-middle bg-blue-700 dark:bg-blue-400" />Before trading costs</span>
        <span><span className="mr-2 inline-block h-0.5 w-4 align-middle bg-amber-500" />After trading costs</span>
      </div>
      <div className="overflow-x-auto">
        <svg
          viewBox={`0 0 ${width} ${height}`}
          className="min-w-[700px]"
          role="img"
          aria-label="Households are grouped from lowest to highest monthly turnover. The highest-turnover group had minus 0.359 percentage points of monthly alpha before trading costs and minus 0.864 percentage points after costs."
        >
          {yTicks.map((tick) => (
            <g key={tick}>
              <line
                x1={left}
                y1={y(tick)}
                x2={width - right}
                y2={y(tick)}
                className={tick === 0 ? "stroke-zinc-500 dark:stroke-zinc-400" : "stroke-zinc-200 dark:stroke-zinc-700"}
                strokeWidth={tick === 0 ? 2 : 1}
              />
              <text x={left - 10} y={y(tick) + 4} textAnchor="end" className="fill-zinc-500 text-[11px] dark:fill-zinc-400">
                {tick === 0 ? "0" : `−${Math.abs(tick).toFixed(1)} pp`}
              </text>
            </g>
          ))}
          <path d={lineFor("gross")} fill="none" stroke={MARKET_BLUE} strokeWidth={3} />
          <path d={lineFor("net")} fill="none" stroke={ACTIVE_AMBER} strokeWidth={3} />
          {retailTurnoverAlpha.map((point, index) => (
            <g key={point.quintile}>
              <circle cx={x(index)} cy={y(point.gross)} r={5} fill={MARKET_BLUE} />
              <circle cx={x(index)} cy={y(point.net)} r={5} fill={ACTIVE_AMBER} />
              <text x={x(index)} y={plotBottom + 24} textAnchor="middle" className="fill-zinc-700 text-[12px] font-semibold dark:fill-zinc-200">
                {point.quintile}
              </text>
              <text x={x(index)} y={plotBottom + 42} textAnchor="middle" className="fill-zinc-500 text-[11px] dark:fill-zinc-400">
                {point.turnover.toFixed(2)}% / month
              </text>
            </g>
          ))}
          <text x={x(4) - 10} y={y(retailTurnoverAlpha[4].gross) - 12} textAnchor="end" fill={MARKET_BLUE} className="text-[12px] font-semibold">
            −0.359 pp
          </text>
          <text x={x(4) - 10} y={y(retailTurnoverAlpha[4].net) - 12} textAnchor="end" fill={ACTIVE_AMBER} className="text-[12px] font-semibold">
            −0.864 pp
          </text>
          <text x={left + (width - right - left) / 2} y={height - 20} textAnchor="middle" className="fill-zinc-500 text-[11px] dark:fill-zinc-400">
            Households grouped by average portfolio turnover
          </text>
          <text
            x={14}
            y={top + (plotBottom - top) / 2}
            transform={`rotate(-90 14 ${top + (plotBottom - top) / 2})`}
            textAnchor="middle"
            className="fill-zinc-500 text-[11px] dark:fill-zinc-400"
          >
            Monthly three-factor alpha, percentage points
          </text>
        </svg>
      </div>
      <figcaption className="mt-3 text-xs leading-5 text-zinc-500 dark:text-zinc-400">
        U.S. discount-brokerage households, 1991–1996. Each point is a portfolio of more than 12,000 households, sorted by average monthly turnover. The highest-turnover group trailed the lowest by 0.803 percentage points per month after costs (p &lt; 0.001). Source: Barber and Odean (2000), Table V.
      </figcaption>
      <table className="sr-only">
        <caption>Monthly turnover and benchmark-adjusted returns by retail household turnover quintile</caption>
        <thead><tr><th>Turnover group</th><th>Monthly turnover</th><th>Before trading costs</th><th>After trading costs</th></tr></thead>
        <tbody>
          {retailTurnoverAlpha.map((row) => (
            <tr key={`table-${row.quintile}`}><td>{row.quintile}</td><td>{row.turnover.toFixed(2)}%</td><td>{row.gross}%</td><td>{row.net}%</td></tr>
          ))}
        </tbody>
      </table>
    </figure>
  );
}

const initialStockAllocation = 2_000;

const pandemicStockCohort = [
  { ticker: "ZM", company: "Zoom", startPrice: 401.63, endPrice: 86.29 },
  { ticker: "DOCU", company: "DocuSign", startPrice: 211.91, endPrice: 68.4 },
  { ticker: "TDOC", company: "Teladoc", startPrice: 179.34, endPrice: 7 },
  { ticker: "W", company: "Wayfair", startPrice: 239.06, endPrice: 100.41 },
  { ticker: "PTON", company: "Peloton", startPrice: 102.49, endPrice: 6.16 },
].map((stock) => {
  const wealthRatio = stock.endPrice / stock.startPrice;
  return {
    ...stock,
    endingWealth: initialStockAllocation * wealthRatio,
    returnPercent: (wealthRatio - 1) * 100,
  };
});

const pandemicBasketEndingWealth = pandemicStockCohort.reduce(
  (total, stock) => total + stock.endingWealth,
  0
);
const spyStartPrice = 333.429443359375;
const spyEndPrice = 678.3152465820312;
const spyEndingWealth = 10_000 * (spyEndPrice / spyStartPrice);

export function HotStockLossExample() {
  const comparisonMax = spyEndingWealth;
  const basketReturn = (pandemicBasketEndingWealth / 10_000 - 1) * 100;
  const spyReturn = (spyEndingWealth / 10_000 - 1) * 100;
  const portfolioRows = [
    {
      label: "Five-stock basket",
      endingWealth: pandemicBasketEndingWealth,
      returnPercent: basketReturn,
      color: ACTIVE_AMBER,
    },
    {
      label: "S&P 500 ETF (SPY)",
      endingWealth: spyEndingWealth,
      returnPercent: spyReturn,
      color: MARKET_BLUE,
    },
  ];

  return (
    <figure className={panelClass} aria-label="Performance of five pandemic-era hot stocks compared with the S&P 500">
      <p className="m-0 text-xs font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
        Each $2,000 stock position · Nov. 17, 2020 to Dec. 31, 2025
      </p>
      <div className="mt-5 space-y-5">
        {pandemicStockCohort.map((stock) => (
          <div key={stock.ticker}>
            <div className="mb-2 grid grid-cols-[minmax(0,1fr)_auto] items-end gap-4">
              <p className="m-0 text-sm font-semibold text-zinc-900 dark:text-zinc-100">
                {stock.company} <span className="font-mono text-xs font-normal text-zinc-500 dark:text-zinc-400">{stock.ticker}</span>
              </p>
              <p className="m-0 font-mono text-sm font-semibold tabular-nums text-amber-700 dark:text-amber-400">
                {formatOneDecimalPercent(stock.returnPercent)} · {formatMoney(stock.endingWealth)} left
              </p>
            </div>
            <div className="h-2.5 bg-zinc-200 dark:bg-zinc-700">
              <div
                className="h-full bg-amber-500"
                style={{ width: `${(stock.endingWealth / initialStockAllocation) * 100}%` }}
              />
            </div>
          </div>
        ))}
      </div>

      <div className="mt-8 border-t border-zinc-200 pt-6 dark:border-zinc-700">
        <p className="m-0 text-xs font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
          The same $10,000 starting value
        </p>
        <div className="mt-5 space-y-5">
          {portfolioRows.map((row) => (
            <div key={row.label}>
              <div className="mb-2 grid grid-cols-[minmax(0,1fr)_auto] items-end gap-4">
                <p className="m-0 text-sm font-semibold text-zinc-900 dark:text-zinc-100">{row.label}</p>
                <p className="m-0 font-mono text-sm font-semibold tabular-nums text-zinc-900 dark:text-zinc-100">
                  {formatOneDecimalPercent(row.returnPercent)} · {formatMoney(row.endingWealth)}
                </p>
              </div>
              <div className="relative h-7 bg-zinc-200 dark:bg-zinc-700">
                <div
                  className="h-full"
                  style={{ width: `${(row.endingWealth / comparisonMax) * 100}%`, backgroundColor: row.color }}
                />
                <span
                  aria-hidden="true"
                  className="absolute inset-y-[-4px] border-l border-dashed border-zinc-700 dark:border-zinc-200"
                  style={{ left: `${(10_000 / comparisonMax) * 100}%` }}
                />
              </div>
            </div>
          ))}
        </div>
        <div className="relative mt-2 h-5 text-xs text-zinc-500 dark:text-zinc-400">
          <span className="absolute left-0">$0</span>
          <span
            className="absolute -translate-x-1/2"
            style={{ left: `${(10_000 / comparisonMax) * 100}%` }}
          >
            $10,000 start
          </span>
          <span className="absolute right-0">{formatMoney(comparisonMax)}</span>
        </div>
      </div>

      <figcaption className="mt-6 text-xs leading-5 text-zinc-500 dark:text-zinc-400">
        A <a className="underline hover:text-blue-700 dark:hover:text-blue-400" href="https://www.fool.com/investing/2020/11/16/zoom-docusign-teladoc-wayfair-and-peloton-will-als/">November 16, 2020 article</a> supplied the five-stock list. The calculation invests equal amounts at the next day&apos;s adjusted close and holds through December 31, 2025 without rebalancing. SPY includes reinvested distributions. Price data: <a className="underline hover:text-blue-700 dark:hover:text-blue-400" href="https://finance.yahoo.com/quote/ZM/history/">Yahoo Finance</a>.
      </figcaption>
      <table className="sr-only">
        <caption>Adjusted-price returns for the five-stock pandemic cohort</caption>
        <thead><tr><th>Investment</th><th>Starting value</th><th>Ending value</th><th>Return</th></tr></thead>
        <tbody>
          {pandemicStockCohort.map((stock) => (
            <tr key={`table-${stock.ticker}`}>
              <td>{stock.company}</td><td>$2,000</td><td>{formatMoney(stock.endingWealth)}</td><td>{formatOneDecimalPercent(stock.returnPercent)}</td>
            </tr>
          ))}
          {portfolioRows.map((row) => (
            <tr key={`table-${row.label}`}>
              <td>{row.label}</td><td>$10,000</td><td>{formatMoney(row.endingWealth)}</td><td>{formatOneDecimalPercent(row.returnPercent)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </figure>
  );
}

const wealthCreationTiles = Array.from({ length: 100 }, (_, index) => ({
  index,
  isTopFourPercent: index >= 96,
}));

export function WealthCreationIllustration() {
  const chartWidth = 780;
  const chartHeight = 370;
  const chartTop = 34;
  const chartBottom = 262;
  const chartLeft = 72;
  const chartRight = 18;
  const maxLevel = 125;
  const y = (level: number) => chartBottom - (level / maxLevel) * (chartBottom - chartTop);
  const barWidth = 112;
  const bars = [
    { x: 92, start: 0, end: 100, label: "Top 1,092 firms", detail: "4.31% of firms", value: "+100%", fill: "fill-amber-500" },
    { x: 266, start: 100, end: 117.27, label: "Other positive firms", detail: "9,579 firms", value: "+17.27%", fill: "fill-blue-500 dark:fill-blue-400" },
    { x: 440, start: 117.27, end: 100, label: "Negative contributors", detail: "14,661 firms", value: "−17.27%", fill: "fill-rose-500 dark:fill-rose-400" },
    { x: 614, start: 0, end: 100, label: "All firms combined", detail: "25,332 firms", value: "100% total", fill: "fill-zinc-700 dark:fill-zinc-500" },
  ];

  return (
    <figure className={panelClass} aria-label="The top four percent of U.S. stocks accounted for all net market wealth creation above Treasury bills">
      <p className="m-0 font-serif text-xl font-semibold text-zinc-900 dark:text-zinc-100">
        4.31% of firms accounted for all net wealth creation
      </p>

      <div className="mt-6 grid gap-8 lg:grid-cols-[minmax(17rem,0.8fr)_1.2fr] lg:items-center">
        <div className="mx-auto w-full max-w-sm lg:mx-0">
          <p className="mb-3 mt-0 text-xs font-semibold uppercase tracking-[0.16em] text-zinc-500 dark:text-zinc-400">
            Share of stocks
          </p>
          <div
            className="grid grid-cols-10 gap-1"
            role="img"
            aria-label="One hundred squares represent all stocks in the study. Four highlighted squares represent the highest-contributing four percent."
          >
            {wealthCreationTiles.map((tile) => (
              <span
                key={tile.index}
                aria-hidden="true"
                className={cx(
                  "aspect-square min-w-0",
                  tile.isTopFourPercent
                    ? "bg-amber-500"
                    : "bg-zinc-300 dark:bg-zinc-600"
                )}
              />
            ))}
          </div>
          <div className="mt-3 flex items-center justify-between gap-4 text-xs text-zinc-600 dark:text-zinc-300">
            <span><span className="mr-2 inline-block h-2.5 w-2.5 bg-zinc-300 align-middle dark:bg-zinc-600" />Other 95.69%</span>
            <span><span className="mr-2 inline-block h-2.5 w-2.5 bg-amber-500 align-middle" />Top 4.31%</span>
          </div>
        </div>

        <div className="border-l-4 border-amber-500 pl-5">
          <p className="m-0 font-serif text-4xl font-semibold text-amber-700 dark:text-amber-400">4.31% of firms</p>
          <p className="mb-0 mt-2 text-sm leading-6 text-zinc-700 dark:text-zinc-200">
            These 1,092 firms produced wealth equal to the entire market&apos;s net gain above one-month Treasury bills.
          </p>
        </div>
      </div>

      <div className="mt-10 border-t border-zinc-200 pt-7 dark:border-zinc-700">
        <p className="mb-4 mt-0 text-xs font-semibold uppercase tracking-[0.16em] text-zinc-500 dark:text-zinc-400">
          Cumulative net wealth creation above Treasury bills
        </p>
        <div className="overflow-x-auto pb-2">
          <svg
            viewBox={`0 0 ${chartWidth} ${chartHeight}`}
            className="min-w-[700px]"
            role="img"
            aria-label="Waterfall chart. The top 1,092 firms created 100 percent of the market's net wealth above Treasury bills. Other positive firms added 17.27 percent, and negative contributors subtracted 17.27 percent, leaving all firms combined at 100 percent."
          >
            {[0, 50, 100].map((tick) => (
              <g key={tick}>
                <line
                  x1={chartLeft}
                  x2={chartWidth - chartRight}
                  y1={y(tick)}
                  y2={y(tick)}
                  className={tick === 100 ? "stroke-blue-500 dark:stroke-blue-400" : "stroke-zinc-200 dark:stroke-zinc-700"}
                  strokeDasharray={tick === 100 ? "5 4" : undefined}
                />
                <text x={chartLeft - 10} y={y(tick) + 4} textAnchor="end" className="fill-zinc-500 text-[11px] dark:fill-zinc-400">
                  {tick}%
                </text>
              </g>
            ))}

            {bars.slice(0, -1).map((bar, index) => (
              <line
                key={`connector-${bar.label}`}
                x1={bar.x + barWidth}
                x2={bars[index + 1].x}
                y1={y(bar.end)}
                y2={y(bar.end)}
                className="stroke-zinc-500 dark:stroke-zinc-400"
                strokeDasharray="4 3"
              />
            ))}

            {bars.map((bar) => {
              const barTop = y(Math.max(bar.start, bar.end));
              const barBottom = y(Math.min(bar.start, bar.end));
              const isNegative = bar.end < bar.start;
              const isTotal = bar.label === "All firms combined";
              return (
                <g key={bar.label}>
                  <rect x={bar.x} y={barTop} width={barWidth} height={Math.max(2, barBottom - barTop)} className={bar.fill} />
                  <text
                    x={bar.x + barWidth / 2}
                    y={isNegative ? barTop + (barBottom - barTop) / 2 + 4 : isTotal ? barTop + 20 : barTop - 8}
                    textAnchor="middle"
                    className={cx(
                      "text-[12px] font-semibold",
                      isNegative || isTotal ? "fill-white" : "fill-zinc-800 dark:fill-zinc-100"
                    )}
                  >
                    {bar.value}
                  </text>
                  <text x={bar.x + barWidth / 2} y={chartBottom + 24} textAnchor="middle" className="fill-zinc-700 text-[11px] font-semibold dark:fill-zinc-200">
                    {bar.label}
                  </text>
                  <text x={bar.x + barWidth / 2} y={chartBottom + 42} textAnchor="middle" className="fill-zinc-500 text-[11px] dark:fill-zinc-400">
                    {bar.detail}
                  </text>
                </g>
              );
            })}

            <path
              d={`M ${bars[1].x} ${chartBottom + 68} v 8 H ${bars[2].x + barWidth} v -8`}
              fill="none"
              className="stroke-zinc-500 dark:stroke-zinc-400"
            />
            <text
              x={(bars[1].x + bars[2].x + barWidth) / 2}
              y={chartBottom + 96}
              textAnchor="middle"
              className="fill-zinc-600 text-[11px] font-semibold dark:fill-zinc-300"
            >
              Remaining 95.69%: positive and negative contributions offset
            </text>
          </svg>
        </div>
      </div>
      <figcaption className="mt-7 border-t border-zinc-200 pt-4 text-xs leading-5 text-zinc-500 dark:border-zinc-700 dark:text-zinc-400">
        Each square represents about 1% of firms in Bessembinder&apos;s 1926–2016 U.S. sample. Firms are ranked by lifetime dollar wealth creation. A total-market index holds both the rare outsized winners and the remaining firms.
      </figcaption>
      <table className="sr-only">
        <caption>Firm groups and their contribution to aggregate net wealth creation above one-month Treasury bills</caption>
        <thead><tr><th>Group</th><th>Number of firms</th><th>Share of firms</th><th>Contribution</th><th>Cumulative level</th></tr></thead>
        <tbody>
          <tr><td>Top wealth-creating firms</td><td>1,092</td><td>4.31%</td><td>100%</td><td>100%</td></tr>
          <tr><td>Other firms with positive wealth creation</td><td>9,579</td><td>37.81%</td><td>17.27%</td><td>117.27%</td></tr>
          <tr><td>Firms with negative wealth creation</td><td>14,661</td><td>57.88%</td><td>−17.27%</td><td>100%</td></tr>
          <tr><td>All firms</td><td>25,332</td><td>100%</td><td>100%</td><td>100%</td></tr>
        </tbody>
      </table>
    </figure>
  );
}

export function TechnicalNote({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <details className="not-prose my-6 border-y border-zinc-200 py-1 dark:border-zinc-700">
      <summary className="cursor-pointer py-4 text-sm font-semibold text-zinc-800 marker:text-zinc-400 hover:text-blue-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600 dark:text-zinc-200 dark:hover:text-blue-400">
        {title}
      </summary>
      <div className="prose prose-zinc max-w-none pb-4 text-sm leading-7 dark:prose-invert">
        {children}
      </div>
    </details>
  );
}
