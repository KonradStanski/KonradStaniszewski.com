import { useState, useMemo, useCallback, useEffect, useRef } from "react";
import { cx } from "@/lib/utils";

// ─── Shared constants ──────────────────────────────────────────────────────

const CARD = "my-6 p-4 border rounded-lg bg-gray-50 dark:bg-gray-900 dark:border-gray-700";

// ─── 1. LUT Explorer ───────────────────────────────────────────────────────

type LUTInputCount = 2 | 3 | 4;

const INPUT_LABELS = ["A", "B", "C", "D"];

const PRESETS: Record<string, (inputs: number[]) => number> = {
  AND: (ins) => ins.every((i) => i === 1) ? 1 : 0,
  OR: (ins) => ins.some((i) => i === 1) ? 1 : 0,
  XOR: (ins) => ins.reduce((a, b) => a ^ b, 0),
  NAND: (ins) => ins.every((i) => i === 1) ? 0 : 1,
  NOR: (ins) => ins.some((i) => i === 1) ? 0 : 1,
  XNOR: (ins) => ins.reduce((a, b) => a ^ b, 0) ^ 1,
  "All 0": () => 0,
  "All 1": () => 1,
};

function getInputBits(row: number, numInputs: number): number[] {
  const bits: number[] = [];
  for (let i = numInputs - 1; i >= 0; i--) {
    bits.push((row >> i) & 1);
  }
  return bits;
}

function deriveBooleanExpr(table: number[], numInputs: number): string {
  const minterms: string[] = [];
  for (let row = 0; row < table.length; row++) {
    if (table[row] !== 1) continue;
    const bits = getInputBits(row, numInputs);
    const terms = bits.map((b, i) => (b === 1 ? INPUT_LABELS[i] : `!${INPUT_LABELS[i]}`));
    minterms.push(terms.join(" & "));
  }
  if (minterms.length === 0) return "F = 0";
  if (minterms.length === table.length) return "F = 1";
  if (minterms.length === 1) return `F = ${minterms[0]}`;
  return `F = ${minterms.map((m) => `(${m})`).join(" | ")}`;
}

function applyPreset(name: string, numInputs: number): number[] {
  const fn = PRESETS[name];
  const size = 1 << numInputs;
  const table: number[] = [];
  for (let row = 0; row < size; row++) {
    table.push(fn(getInputBits(row, numInputs)));
  }
  return table;
}

export function LUTExplorer() {
  const [numInputs, setNumInputs] = useState<LUTInputCount>(3);
  const [table, setTable] = useState<number[]>(() => applyPreset("AND", 3));
  const [hoveredRow, setHoveredRow] = useState<number | null>(null);
  const [registered, setRegistered] = useState(false);
  const [testInputs, setTestInputs] = useState<number[]>([0, 0, 0]);
  const [ffValue, setFfValue] = useState<number>(0);
  const [ffFlash, setFfFlash] = useState(false);

  const size = 1 << numInputs;

  const testRow = testInputs.slice(0, numInputs).reduce((acc, b, i) => acc | (b << (numInputs - 1 - i)), 0);
  const lutOutput = table[testRow] ?? 0;
  const finalOutput = registered ? ffValue : lutOutput;

  const clockTick = () => {
    setFfValue(lutOutput);
    setFfFlash(true);
    setTimeout(() => setFfFlash(false), 400);
  };

  const toggleTestInput = (i: number) => {
    setTestInputs((prev) => {
      const next = [...prev];
      next[i] = next[i] === 1 ? 0 : 1;
      return next;
    });
  };

  const changeInputCount = (n: LUTInputCount) => {
    setNumInputs(n);
    setTable(applyPreset("AND", n));
    setHoveredRow(null);
    setTestInputs(Array(n).fill(0));
    setFfValue(0);
  };

  const toggleOutput = (row: number) => {
    setTable((prev) => {
      const next = [...prev];
      next[row] = next[row] === 1 ? 0 : 1;
      return next;
    });
  };

  const expr = useMemo(() => deriveBooleanExpr(table, numInputs), [table, numInputs]);

  const lutW = 160;
  const lutH = Math.max(120, size * 18 + 40);
  const cellH = (lutH - 40) / size;
  const svgW = 300;
  const svgH = lutH + 20;

  return (
    <div className={CARD}>
      {/* Controls */}
      <div className="flex flex-wrap gap-3 items-center mb-4">
        <div>
          <span className="text-sm font-semibold mr-2">Inputs:</span>
          {([2, 3, 4] as LUTInputCount[]).map((n) => (
            <button
              key={n}
              onClick={() => changeInputCount(n)}
              className={cx(
                "px-3 py-1 text-sm rounded-md mr-1 transition-colors",
                n === numInputs
                  ? "bg-blue-600 text-white"
                  : "bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-600"
              )}
            >
              {n}
            </button>
          ))}
        </div>
        <div>
          <span className="text-sm font-semibold mr-2">Preset:</span>
          <select
            onChange={(e) => setTable(applyPreset(e.target.value, numInputs))}
            className={cx(
              "px-2 py-1 border rounded text-sm",
              "bg-white dark:bg-gray-800 dark:border-gray-600 dark:text-gray-100"
            )}
          >
            {Object.keys(PRESETS).map((name) => (
              <option key={name} value={name}>{name}</option>
            ))}
          </select>
        </div>
        <label className="flex items-center gap-1.5 text-sm cursor-pointer">
          <input
            type="checkbox"
            checked={registered}
            onChange={(e) => setRegistered(e.target.checked)}
            className="rounded"
          />
          <span className="font-semibold">Registered output</span>
        </label>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Truth table */}
        <div className="overflow-x-auto">
          <table className="text-sm w-full">
            <thead>
              <tr className="border-b dark:border-gray-700">
                <th className="py-1 pr-1 text-xs text-gray-500">Row</th>
                {Array.from({ length: numInputs }, (_, i) => (
                  <th key={i} className="py-1 px-1 text-center font-mono">{INPUT_LABELS[i]}</th>
                ))}
                <th className="py-1 px-2 text-center font-mono border-l dark:border-gray-700">Out</th>
              </tr>
            </thead>
            <tbody>
              {Array.from({ length: size }, (_, row) => {
                const bits = getInputBits(row, numInputs);
                return (
                  <tr
                    key={row}
                    className={cx(
                      "border-b dark:border-gray-800 transition-colors",
                      testRow === row ? "bg-yellow-50 dark:bg-yellow-900/30" : hoveredRow === row && "bg-blue-50 dark:bg-blue-900/30"
                    )}
                    onMouseEnter={() => setHoveredRow(row)}
                    onMouseLeave={() => setHoveredRow(null)}
                  >
                    <td className="py-1 pr-1 text-xs text-gray-400 font-mono">{row}</td>
                    {bits.map((b, i) => (
                      <td key={i} className="py-1 px-1 text-center font-mono text-sm">{b}</td>
                    ))}
                    <td className="py-1 px-2 text-center border-l dark:border-gray-700">
                      <button
                        onClick={() => toggleOutput(row)}
                        className={cx(
                          "w-8 h-6 rounded font-mono text-sm font-bold transition-colors",
                          table[row] === 1
                            ? "bg-green-200 dark:bg-green-800 text-green-800 dark:text-green-200"
                            : "bg-gray-200 dark:bg-gray-700 text-gray-500 dark:text-gray-400"
                        )}
                      >
                        {table[row]}
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          <p className="mt-2 text-xs text-gray-500">Click output cells to toggle</p>
        </div>

        {/* LUT schematic SVG */}
        <div className="flex justify-center items-start">
          <svg viewBox={`0 0 ${svgW} ${svgH}`} className="w-full max-w-[300px]" style={{ height: "auto" }}>
            {/* Input lines */}
            {Array.from({ length: numInputs }, (_, i) => {
              const y = 20 + (i + 0.5) * (lutH / numInputs);
              return (
                <g key={`in-${i}`}>
                  <line x1={0} y1={y} x2={50} y2={y} stroke="currentColor" strokeWidth={1.5} className="text-gray-400 dark:text-gray-500" />
                  <text x={5} y={y - 6} className="text-[11px] fill-current text-gray-600 dark:text-gray-400" fontFamily="monospace">
                    {INPUT_LABELS[i]}
                  </text>
                </g>
              );
            })}

            {/* LUT box */}
            <rect
              x={50} y={10} width={lutW} height={lutH} rx={6}
              className="fill-blue-50 dark:fill-blue-950 stroke-blue-400 dark:stroke-blue-600"
              strokeWidth={2}
            />
            <text
              x={50 + lutW / 2} y={28}
              textAnchor="middle"
              className="text-[11px] fill-current text-blue-600 dark:text-blue-400 font-bold"
              fontFamily="monospace"
            >
              {numInputs}-input LUT
            </text>

            {/* Memory cells inside LUT */}
            {Array.from({ length: size }, (_, row) => {
              const y = 40 + row * cellH;
              const isActive = testRow === row;
              const isHovered = hoveredRow === row;
              return (
                <g key={`cell-${row}`}>
                  <rect
                    x={60} y={y} width={lutW - 20} height={cellH - 2} rx={2}
                    className={cx(
                      "transition-colors",
                      isActive
                        ? "fill-yellow-200 dark:fill-yellow-700"
                        : isHovered
                        ? "fill-yellow-100 dark:fill-yellow-800"
                        : table[row] === 1
                        ? "fill-green-100 dark:fill-green-900"
                        : "fill-gray-100 dark:fill-gray-800"
                    )}
                    stroke="none"
                  />
                  <text
                    x={65} y={y + cellH / 2 + 1}
                    dominantBaseline="middle"
                    className="text-[9px] fill-current text-gray-500 dark:text-gray-400"
                    fontFamily="monospace"
                  >
                    [{getInputBits(row, numInputs).join("")}]
                  </text>
                  <text
                    x={lutW + 30} y={y + cellH / 2 + 1}
                    dominantBaseline="middle"
                    textAnchor="middle"
                    className={cx(
                      "text-[10px] font-bold fill-current",
                      table[row] === 1 ? "text-green-600 dark:text-green-400" : "text-gray-400 dark:text-gray-500"
                    )}
                    fontFamily="monospace"
                  >
                    {table[row]}
                  </text>
                </g>
              );
            })}

            {/* Output line from LUT */}
            <line
              x1={50 + lutW} y1={10 + lutH / 2}
              x2={registered ? 230 : svgW - 10} y2={10 + lutH / 2}
              stroke="currentColor" strokeWidth={1.5}
              className="text-gray-400 dark:text-gray-500"
            />

            {/* Flip-flop (if registered) */}
            {registered && (
              <g>
                <rect
                  x={230} y={10 + lutH / 2 - 15} width={30} height={30} rx={3}
                  className="fill-amber-50 dark:fill-amber-950 stroke-amber-500 dark:stroke-amber-600"
                  strokeWidth={1.5}
                />
                <text
                  x={245} y={10 + lutH / 2 + 1}
                  textAnchor="middle"
                  dominantBaseline="middle"
                  className="text-[9px] fill-current text-amber-700 dark:text-amber-400 font-bold"
                  fontFamily="monospace"
                >
                  FF
                </text>
                {/* Clock triangle */}
                <polygon
                  points={`230,${10 + lutH / 2 + 8} 230,${10 + lutH / 2 + 15} 237,${10 + lutH / 2 + 11.5}`}
                  className="fill-amber-500 dark:fill-amber-600"
                />
                <line
                  x1={260} y1={10 + lutH / 2}
                  x2={svgW - 10} y2={10 + lutH / 2}
                  stroke="currentColor" strokeWidth={1.5}
                  className="text-gray-400 dark:text-gray-500"
                />
              </g>
            )}

            {/* Output label */}
            <text
              x={svgW - 8} y={10 + lutH / 2 - 6}
              textAnchor="end"
              className="text-[11px] fill-current text-gray-600 dark:text-gray-400"
              fontFamily="monospace"
            >
              F
            </text>
          </svg>
        </div>
      </div>

      {/* Boolean expression */}
      <div className={cx(
        "mt-4 p-3 rounded border font-mono text-sm",
        "bg-white dark:bg-gray-800 dark:border-gray-700"
      )}>
        {expr}
      </div>

      {/* Live test */}
      <div className={cx(
        "mt-4 p-3 rounded border",
        "bg-white dark:bg-gray-800 dark:border-gray-700"
      )}>
        <div className="flex flex-wrap items-center gap-4">
          {/* Input toggles */}
          <div className="flex items-center gap-2">
            <span className="text-sm font-semibold">Test:</span>
            {Array.from({ length: numInputs }, (_, i) => (
              <button
                key={i}
                onClick={() => toggleTestInput(i)}
                className={cx(
                  "w-9 h-7 rounded font-mono text-sm font-bold transition-colors",
                  testInputs[i] === 1
                    ? "bg-green-200 dark:bg-green-800 text-green-800 dark:text-green-200"
                    : "bg-gray-200 dark:bg-gray-700 text-gray-500 dark:text-gray-400"
                )}
              >
                {INPUT_LABELS[i]}={testInputs[i]}
              </button>
            ))}
          </div>

          {/* Arrow */}
          <span className="text-gray-400 text-lg">→</span>

          {/* LUT output */}
          <div className="flex items-center gap-1.5">
            <span className="text-xs text-gray-500">LUT out:</span>
            <span className={cx(
              "inline-block w-7 h-7 rounded font-mono text-sm font-bold text-center leading-7 transition-colors",
              lutOutput === 1
                ? "bg-green-200 dark:bg-green-800 text-green-800 dark:text-green-200"
                : "bg-gray-200 dark:bg-gray-700 text-gray-500 dark:text-gray-400"
            )}>
              {lutOutput}
            </span>
          </div>

          {/* FF + clock (only when registered) */}
          {registered && (
            <>
              <span className="text-gray-400 text-lg">→</span>
              <div className={cx(
                "flex items-center gap-1.5 px-2 py-1 rounded border transition-colors",
                ffFlash
                  ? "border-amber-400 bg-amber-50 dark:bg-amber-900/30 dark:border-amber-500"
                  : "border-gray-300 dark:border-gray-600"
              )}>
                <span className="text-xs text-gray-500">FF:</span>
                <span className={cx(
                  "inline-block w-7 h-7 rounded font-mono text-sm font-bold text-center leading-7 transition-colors",
                  ffValue === 1
                    ? "bg-amber-200 dark:bg-amber-800 text-amber-800 dark:text-amber-200"
                    : "bg-gray-200 dark:bg-gray-700 text-gray-500 dark:text-gray-400"
                )}>
                  {ffValue}
                </span>
              </div>
              <button
                onClick={clockTick}
                className="px-3 py-1.5 text-sm rounded-md font-semibold bg-amber-500 text-white hover:bg-amber-600 transition-colors"
              >
                ⏱ Clock
              </button>
            </>
          )}

          {/* Arrow + final output */}
          <span className="text-gray-400 text-lg">→</span>
          <div className="flex items-center gap-1.5">
            <span className="text-xs font-semibold text-gray-600 dark:text-gray-300">Output:</span>
            <span className={cx(
              "inline-block w-7 h-7 rounded font-mono text-sm font-bold text-center leading-7 transition-colors",
              finalOutput === 1
                ? "bg-green-300 dark:bg-green-700 text-green-900 dark:text-green-100 ring-2 ring-green-400"
                : "bg-gray-300 dark:bg-gray-600 text-gray-600 dark:text-gray-300 ring-2 ring-gray-400"
            )}>
              {finalOutput}
            </span>
          </div>
        </div>

        {/* Explanation text */}
        {registered && lutOutput !== ffValue && (
          <p className="mt-2 text-xs text-amber-600 dark:text-amber-400">
            The LUT output changed to {lutOutput}, but the flip-flop still holds {ffValue}. Click Clock to capture the new value.
          </p>
        )}
      </div>
    </div>
  );
}

// ─── 2. CLB Diagram ────────────────────────────────────────────────────────

type CLBComponent = "lut" | "flipflop" | "mux" | "carry" | null;

const CLB_INFO: Record<string, { title: string; desc: string }> = {
  lut: {
    title: "Lookup Table (LUT)",
    desc: "A small memory (typically 64 bits for a 6-input LUT) that implements any boolean function of its inputs. The configuration bitstream writes the truth table into this memory.",
  },
  flipflop: {
    title: "D Flip-Flop",
    desc: "Captures the LUT output on each rising clock edge and holds it until the next edge. This is how sequential logic (registers, counters, state machines) is implemented.",
  },
  mux: {
    title: "Output Multiplexer",
    desc: "Selects whether the output passes straight from the LUT (combinational path) or through the flip-flop (registered path). Controlled by a configuration bit.",
  },
  carry: {
    title: "Carry Chain",
    desc: "Dedicated fast-carry logic for arithmetic operations. Building an adder purely from LUTs is slow because carry has to ripple through each LUT. The carry chain provides a hardwired fast path between adjacent slices.",
  },
};

export function CLBDiagram() {
  const [selected, setSelected] = useState<CLBComponent>(null);
  const [outputMode, setOutputMode] = useState<"combinational" | "registered">("combinational");
  const [view, setView] = useState<"simple" | "realistic">("simple");

  const info = selected ? CLB_INFO[selected] : null;

  const handleClick = useCallback((comp: CLBComponent) => {
    setSelected((prev) => (prev === comp ? null : comp));
  }, []);

  const isReg = outputMode === "registered";

  return (
    <div className={CARD}>
      <div className="flex flex-wrap gap-3 items-center mb-4">
        <div>
          <span className="text-sm font-semibold mr-2">View:</span>
          {(["simple", "realistic"] as const).map((v) => (
            <button
              key={v}
              onClick={() => { setView(v); setSelected(null); }}
              className={cx(
                "px-3 py-1 text-sm rounded-md mr-1 capitalize transition-colors",
                v === view
                  ? "bg-blue-600 text-white"
                  : "bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-600"
              )}
            >
              {v}
            </button>
          ))}
        </div>
        {view === "simple" && (
          <label className="flex items-center gap-1.5 text-sm cursor-pointer">
            <input
              type="checkbox"
              checked={isReg}
              onChange={(e) => setOutputMode(e.target.checked ? "registered" : "combinational")}
              className="rounded"
            />
            <span className="font-semibold">Registered output</span>
          </label>
        )}
      </div>

      {view === "simple" ? (
        <div className="overflow-x-auto">
          <svg viewBox="0 0 480 180" className="w-full max-w-[500px] mx-auto" style={{ height: "auto" }}>
            {/* Input lines */}
            {[0, 1, 2, 3].map((i) => {
              const y = 40 + i * 28;
              return (
                <g key={`in-${i}`}>
                  <line x1={10} y1={y} x2={60} y2={y} stroke="currentColor" strokeWidth={1.5} className="text-gray-400 dark:text-gray-500" />
                  <text x={15} y={y - 6} className="text-[11px] fill-current text-gray-500 dark:text-gray-400" fontFamily="monospace">
                    {INPUT_LABELS[i]}
                  </text>
                </g>
              );
            })}

            {/* LUT */}
            <rect
              x={60} y={20} width={120} height={140} rx={6}
              className={cx(
                "transition-colors cursor-pointer",
                selected === "lut"
                  ? "fill-blue-200 dark:fill-blue-800 stroke-blue-500"
                  : "fill-blue-50 dark:fill-blue-950 stroke-blue-300 dark:stroke-blue-700"
              )}
              strokeWidth={2}
              onClick={() => handleClick("lut")}
            />
            <text
              x={120} y={95} textAnchor="middle" dominantBaseline="middle"
              className="text-[13px] fill-current text-blue-700 dark:text-blue-300 font-bold pointer-events-none"
              fontFamily="monospace"
            >
              LUT
            </text>

            {/* LUT output line */}
            <line
              x1={180} y1={90} x2={260} y2={90}
              stroke="currentColor" strokeWidth={1.5}
              className={cx(isReg ? "text-gray-300 dark:text-gray-600" : "text-green-500 dark:text-green-400")}
            />

            {/* Branch up to FF */}
            <line x1={220} y1={90} x2={220} y2={40} stroke="currentColor" strokeWidth={1.5} className="text-gray-400 dark:text-gray-500" />
            <line x1={220} y1={40} x2={260} y2={40} stroke="currentColor" strokeWidth={1.5} className="text-gray-400 dark:text-gray-500" />

            {/* Flip-flop */}
            <rect
              x={260} y={18} width={50} height={44} rx={4}
              className={cx(
                "transition-colors cursor-pointer",
                selected === "flipflop"
                  ? "fill-amber-200 dark:fill-amber-800 stroke-amber-500"
                  : "fill-amber-50 dark:fill-amber-950 stroke-amber-300 dark:stroke-amber-700"
              )}
              strokeWidth={2}
              onClick={() => handleClick("flipflop")}
            />
            <text
              x={285} y={40} textAnchor="middle" dominantBaseline="middle"
              className="text-[11px] fill-current text-amber-700 dark:text-amber-400 font-bold pointer-events-none"
              fontFamily="monospace"
            >
              D FF
            </text>
            {/* Clock triangle */}
            <polygon
              points="260,52 260,62 268,57"
              className="fill-amber-500 dark:fill-amber-600 pointer-events-none"
            />

            {/* FF output line */}
            <line
              x1={310} y1={40} x2={340} y2={40}
              stroke="currentColor" strokeWidth={1.5}
              className={cx(isReg ? "text-green-500 dark:text-green-400" : "text-gray-300 dark:text-gray-600")}
            />
            <line
              x1={340} y1={40} x2={340} y2={70}
              stroke="currentColor" strokeWidth={1.5}
              className={cx(isReg ? "text-green-500 dark:text-green-400" : "text-gray-300 dark:text-gray-600")}
            />

            {/* MUX */}
            <polygon
              points="330,70 370,70 360,120 340,120"
              className={cx(
                "transition-colors cursor-pointer",
                selected === "mux"
                  ? "fill-purple-200 dark:fill-purple-800 stroke-purple-500"
                  : "fill-purple-50 dark:fill-purple-950 stroke-purple-300 dark:stroke-purple-700"
              )}
              strokeWidth={2}
              onClick={() => handleClick("mux")}
            />
            <text
              x={350} y={98} textAnchor="middle" dominantBaseline="middle"
              className="text-[10px] fill-current text-purple-700 dark:text-purple-300 font-bold pointer-events-none"
              fontFamily="monospace"
            >
              MUX
            </text>

            {/* Direct path to MUX bottom */}
            <line
              x1={260} y1={90} x2={340} y2={90}
              stroke="currentColor" strokeWidth={0}
              className="text-transparent"
            />
            <line
              x1={260} y1={90} x2={260} y2={110}
              stroke="currentColor" strokeWidth={1.5}
              className={cx(!isReg ? "text-green-500 dark:text-green-400" : "text-gray-300 dark:text-gray-600")}
            />
            <line
              x1={260} y1={110} x2={340} y2={110}
              stroke="currentColor" strokeWidth={1.5}
              className={cx(!isReg ? "text-green-500 dark:text-green-400" : "text-gray-300 dark:text-gray-600")}
            />

            {/* MUX output */}
            <line x1={350} y1={120} x2={350} y2={145} stroke="currentColor" strokeWidth={1.5} className="text-green-500 dark:text-green-400" />
            <line x1={350} y1={145} x2={440} y2={145} stroke="currentColor" strokeWidth={1.5} className="text-green-500 dark:text-green-400" />
            <text
              x={445} y={145} dominantBaseline="middle"
              className="text-[11px] fill-current text-gray-600 dark:text-gray-400"
              fontFamily="monospace"
            >
              Out
            </text>

            {/* Carry chain */}
            <rect
              x={60} y={165} width={120} height={12} rx={3}
              className={cx(
                "transition-colors cursor-pointer",
                selected === "carry"
                  ? "fill-rose-200 dark:fill-rose-800 stroke-rose-500"
                  : "fill-rose-50 dark:fill-rose-950 stroke-rose-300 dark:stroke-rose-700"
              )}
              strokeWidth={1.5}
              onClick={() => handleClick("carry")}
            />
            <text
              x={120} y={172} textAnchor="middle" dominantBaseline="middle"
              className="text-[8px] fill-current text-rose-700 dark:text-rose-300 pointer-events-none"
              fontFamily="monospace"
            >
              CARRY CHAIN
            </text>
            {/* Carry arrows */}
            <line x1={20} y1={171} x2={60} y2={171} stroke="currentColor" strokeWidth={1} className="text-rose-400" />
            <polygon points="55,168 60,171 55,174" className="fill-rose-400" />
            <line x1={180} y1={171} x2={220} y2={171} stroke="currentColor" strokeWidth={1} className="text-rose-400" />
            <polygon points="215,168 220,171 215,174" className="fill-rose-400" />

            {/* MUX select label */}
            <text
              x={375} y={85} className="text-[9px] fill-current text-purple-500 dark:text-purple-400" fontFamily="monospace"
            >
              {isReg ? "reg" : "comb"}
            </text>
          </svg>
        </div>
      ) : (
        /* Realistic view: 4 slices */
        <div className="overflow-x-auto">
          <svg viewBox="0 0 520 360" className="w-full max-w-[540px] mx-auto" style={{ height: "auto" }}>
            {[0, 1, 2, 3].map((slice) => {
              const y = slice * 82 + 10;
              const isSliceSelected = selected === "lut" || selected === "flipflop";
              return (
                <g key={`slice-${slice}`}>
                  {/* Slice boundary */}
                  <rect
                    x={40} y={y} width={430} height={72} rx={4}
                    className="fill-none stroke-gray-300 dark:stroke-gray-700"
                    strokeWidth={1}
                    strokeDasharray="4 2"
                  />
                  <text x={45} y={y + 12} className="text-[9px] fill-current text-gray-400 dark:text-gray-500" fontFamily="monospace">
                    Slice {slice}
                  </text>

                  {/* Input lines */}
                  {[0, 1, 2, 3, 4, 5].map((inp) => (
                    <line
                      key={`in-${inp}`}
                      x1={10} y1={y + 18 + inp * 8}
                      x2={50} y2={y + 18 + inp * 8}
                      stroke="currentColor" strokeWidth={0.8}
                      className="text-gray-300 dark:text-gray-600"
                    />
                  ))}

                  {/* LUT */}
                  <rect
                    x={50} y={y + 15} width={100} height={50} rx={4}
                    className={cx(
                      "transition-colors cursor-pointer",
                      selected === "lut"
                        ? "fill-blue-200 dark:fill-blue-800 stroke-blue-500"
                        : "fill-blue-50 dark:fill-blue-950 stroke-blue-300 dark:stroke-blue-700"
                    )}
                    strokeWidth={1.5}
                    onClick={() => handleClick("lut")}
                  />
                  <text
                    x={100} y={y + 43} textAnchor="middle" dominantBaseline="middle"
                    className="text-[10px] fill-current text-blue-700 dark:text-blue-300 font-bold pointer-events-none"
                    fontFamily="monospace"
                  >
                    6-LUT
                  </text>

                  {/* Connection to FF */}
                  <line x1={150} y1={y + 40} x2={200} y2={y + 40} stroke="currentColor" strokeWidth={1} className="text-gray-400 dark:text-gray-500" />

                  {/* FF */}
                  <rect
                    x={200} y={y + 22} width={40} height={36} rx={3}
                    className={cx(
                      "transition-colors cursor-pointer",
                      selected === "flipflop"
                        ? "fill-amber-200 dark:fill-amber-800 stroke-amber-500"
                        : "fill-amber-50 dark:fill-amber-950 stroke-amber-300 dark:stroke-amber-700"
                    )}
                    strokeWidth={1.5}
                    onClick={() => handleClick("flipflop")}
                  />
                  <text
                    x={220} y={y + 40} textAnchor="middle" dominantBaseline="middle"
                    className="text-[9px] fill-current text-amber-700 dark:text-amber-400 font-bold pointer-events-none"
                    fontFamily="monospace"
                  >
                    FF
                  </text>

                  {/* MUX */}
                  <polygon
                    points={`260,${y + 28} 280,${y + 28} 276,${y + 52} 264,${y + 52}`}
                    className={cx(
                      "transition-colors cursor-pointer",
                      selected === "mux"
                        ? "fill-purple-200 dark:fill-purple-800 stroke-purple-500"
                        : "fill-purple-50 dark:fill-purple-950 stroke-purple-300 dark:stroke-purple-700"
                    )}
                    strokeWidth={1.5}
                    onClick={() => handleClick("mux")}
                  />

                  {/* MUX connections */}
                  <line x1={240} y1={y + 40} x2={260} y2={y + 35} stroke="currentColor" strokeWidth={0.8} className="text-gray-400 dark:text-gray-500" />
                  <line x1={150} y1={y + 50} x2={260} y2={y + 46} stroke="currentColor" strokeWidth={0.8} className="text-gray-400 dark:text-gray-500" />

                  {/* Output */}
                  <line x1={280} y1={y + 40} x2={320} y2={y + 40} stroke="currentColor" strokeWidth={1} className="text-green-500 dark:text-green-400" />

                  {/* Carry chain segment */}
                  <rect
                    x={330} y={y + 28} width={80} height={24} rx={3}
                    className={cx(
                      "transition-colors cursor-pointer",
                      selected === "carry"
                        ? "fill-rose-200 dark:fill-rose-800 stroke-rose-500"
                        : "fill-rose-50 dark:fill-rose-950 stroke-rose-300 dark:stroke-rose-700"
                    )}
                    strokeWidth={1}
                    onClick={() => handleClick("carry")}
                  />
                  <text
                    x={370} y={y + 40} textAnchor="middle" dominantBaseline="middle"
                    className="text-[8px] fill-current text-rose-700 dark:text-rose-300 pointer-events-none"
                    fontFamily="monospace"
                  >
                    CARRY
                  </text>

                  {/* Carry chain connections between slices */}
                  {slice < 3 && (
                    <line
                      x1={370} y1={y + 52} x2={370} y2={y + 82 + 28}
                      stroke="currentColor" strokeWidth={1}
                      className="text-rose-400 dark:text-rose-500"
                      strokeDasharray="3 2"
                    />
                  )}

                  {/* Output to routing */}
                  <line x1={320} y1={y + 40} x2={320} y2={y + 20} stroke="currentColor" strokeWidth={0.8} className="text-green-400 dark:text-green-500" />
                  <text x={325} y={y + 18} className="text-[7px] fill-current text-gray-400" fontFamily="monospace">to routing</text>
                </g>
              );
            })}
          </svg>
        </div>
      )}

      {/* Info panel */}
      <div className={cx(
        "mt-4 p-3 rounded border text-sm min-h-[3rem] transition-colors",
        info
          ? "bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800"
          : "bg-gray-100 dark:bg-gray-800 border-gray-200 dark:border-gray-700"
      )}>
        {info ? (
          <>
            <p className="font-semibold">{info.title}</p>
            <p className="text-gray-600 dark:text-gray-400 mt-1">{info.desc}</p>
          </>
        ) : (
          <p className="text-gray-500 dark:text-gray-400">Click any component in the diagram to learn more.</p>
        )}
      </div>
    </div>
  );
}

// ─── 3. Synthesis Flow ─────────────────────────────────────────────────────

const VHDL_CODE = `library IEEE;
use IEEE.STD_LOGIC_1164.ALL;
use IEEE.NUMERIC_STD.ALL;

entity counter is
    port (
        clk   : in  std_logic;
        reset : in  std_logic;
        count : out std_logic_vector(3 downto 0)
    );
end counter;

architecture behavioral of counter is
    signal cnt : unsigned(3 downto 0) := "0000";
begin
    process(clk)
    begin
        if rising_edge(clk) then
            if reset = '1' then
                cnt <= "0000";
            else
                cnt <= cnt + 1;
            end if;
        end if;
    end process;
    count <= std_logic_vector(cnt);
end behavioral;`;

const VHDL_KEYWORDS = new Set([
  "library", "use", "entity", "is", "port", "in", "out", "end",
  "architecture", "of", "signal", "begin", "process", "if", "then",
  "else", "elsif", "end", "ALL",
]);

function VhdlLine({ text }: { text: string }) {
  if (text.startsWith("--")) {
    return <span className="text-gray-500">{text}</span>;
  }
  const tokens = text.split(/(\b\w+\b|[^a-zA-Z0-9_]+)/g);
  return (
    <>
      {tokens.map((tok, i) => {
        if (VHDL_KEYWORDS.has(tok)) {
          return <span key={i} className="text-blue-400">{tok}</span>;
        }
        if (tok === "std_logic" || tok === "std_logic_vector" || tok === "unsigned") {
          return <span key={i} className="text-green-400">{tok}</span>;
        }
        if (/^"[^"]*"$/.test(tok)) {
          return <span key={i} className="text-amber-400">{tok}</span>;
        }
        if (tok === "rising_edge") {
          return <span key={i} className="text-purple-400">{tok}</span>;
        }
        return <span key={i}>{tok}</span>;
      })}
    </>
  );
}

interface CounterLUT {
  bit: number;
  inputs: string[];
  fn: string;
  table: number[];
}

const COUNTER_LUTS: CounterLUT[] = [
  {
    bit: 0,
    inputs: ["reset", "cnt(0)"],
    fn: "!reset & !cnt(0)",
    table: [1, 0, 0, 0],
  },
  {
    bit: 1,
    inputs: ["reset", "cnt(0)", "cnt(1)"],
    fn: "!reset & (cnt(1) XOR cnt(0))",
    table: [0, 1, 1, 0, 0, 0, 0, 0],
  },
  {
    bit: 2,
    inputs: ["reset", "cnt(0)", "cnt(1)", "cnt(2)"],
    fn: "!reset & (cnt(2) XOR (cnt(1) & cnt(0)))",
    table: [0, 0, 0, 1, 1, 0, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0],
  },
  {
    bit: 3,
    inputs: ["reset", "cnt(0)", "cnt(1)", "cnt(2)", "cnt(3)"],
    fn: "!reset & (cnt(3) XOR (cnt(2) & cnt(1) & cnt(0)))",
    table: [0,0,0,0,0,0,0,1, 1,0,1,0,1,0,1,0, 0,0,0,0,0,0,0,0, 0,0,0,0,0,0,0,0],
  },
];

const BITSTREAM_LINES = [
  { addr: "0x0000", desc: "LUT at CLB(1,1)", data: "0100", comment: "cnt(0): !reset & !cnt(0)" },
  { addr: "0x0001", desc: "LUT at CLB(1,2)", data: "01100000", comment: "cnt(1): !reset & (cnt1 ^ cnt0)" },
  { addr: "0x0002", desc: "LUT at CLB(2,1)", data: "0001100010100000", comment: "cnt(2): XOR with carry" },
  { addr: "0x0003", desc: "LUT at CLB(2,2)", data: "00000001101010100...", comment: "cnt(3): XOR with carry" },
  { addr: "0x0010", desc: "FF enable CLB(1,1)", data: "1", comment: "registered output on" },
  { addr: "0x0011", desc: "FF enable CLB(1,2)", data: "1", comment: "registered output on" },
  { addr: "0x0012", desc: "FF enable CLB(2,1)", data: "1", comment: "registered output on" },
  { addr: "0x0013", desc: "FF enable CLB(2,2)", data: "1", comment: "registered output on" },
  { addr: "0x0100", desc: "Route CLB(1,1)→CLB(1,2)", data: "1", comment: "carry: cnt(0) to LUT1" },
  { addr: "0x0101", desc: "Route CLB(1,1)→CLB(2,1)", data: "1", comment: "cnt(0) to LUT2" },
  { addr: "0x0102", desc: "Route CLB(1,2)→CLB(2,1)", data: "1", comment: "cnt(1) to LUT2" },
  { addr: "0x0103", desc: "Route CLB(1,2)→CLB(2,2)", data: "1", comment: "cnt(1) to LUT3" },
  { addr: "0x0104", desc: "Route CLB(2,1)→CLB(2,2)", data: "1", comment: "cnt(2) to LUT3" },
  { addr: "0x0200", desc: "I/O pin A3 → clk", data: "1", comment: "clock input routed" },
  { addr: "0x0201", desc: "I/O pin B1 → reset", data: "1", comment: "reset input routed" },
  { addr: "0x0210", desc: "CLB(1,1) → I/O pin C1", data: "1", comment: "count(0) output" },
  { addr: "0x0211", desc: "CLB(1,2) → I/O pin C2", data: "1", comment: "count(1) output" },
  { addr: "0x0212", desc: "CLB(2,1) → I/O pin D1", data: "1", comment: "count(2) output" },
  { addr: "0x0213", desc: "CLB(2,2) → I/O pin D2", data: "1", comment: "count(3) output" },
];

const SYNTH_STEPS = [
  { title: "VHDL Source", short: "VHDL" },
  { title: "Synthesis", short: "Synth" },
  { title: "Technology Mapping", short: "Map" },
  { title: "Place & Route", short: "P&R" },
  { title: "Bitstream", short: "Bits" },
];

export function SynthesisFlow() {
  const [step, setStep] = useState(0);
  const [selectedLut, setSelectedLut] = useState<number | null>(null);

  return (
    <div className={CARD}>
      {/* Step indicator */}
      <div className="flex items-center gap-1 mb-4 overflow-x-auto">
        {SYNTH_STEPS.map((s, i) => (
          <button
            key={i}
            onClick={() => { setStep(i); setSelectedLut(null); }}
            className={cx(
              "px-3 py-1.5 text-xs font-semibold rounded-md whitespace-nowrap transition-colors",
              i === step
                ? "bg-blue-600 text-white"
                : i < step
                ? "bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300"
                : "bg-gray-200 dark:bg-gray-700 text-gray-500 dark:text-gray-400"
            )}
          >
            {i + 1}. {s.short}
          </button>
        ))}
      </div>

      <h4 className="text-sm font-semibold mb-3">{SYNTH_STEPS[step].title}</h4>

      {/* Step 0: VHDL source */}
      {step === 0 && (
        <div className="rounded border bg-gray-900 dark:bg-gray-950 dark:border-gray-700 p-3 overflow-x-auto">
          <pre className="text-xs leading-relaxed text-gray-200 font-mono">
            {VHDL_CODE.split("\n").map((line, i) => (
              <div key={i} className="flex">
                <span className="w-6 text-right mr-3 text-gray-600 select-none">{i + 1}</span>
                <VhdlLine text={line} />
              </div>
            ))}
          </pre>
        </div>
      )}

      {/* Step 1: Synthesis */}
      {step === 1 && (
        <div>
          <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">
            The synthesizer reads the VHDL and infers hardware structures. The <span className="font-mono text-xs">rising_edge(clk)</span> pattern
            infers flip-flops. The <span className="font-mono text-xs">cnt + 1</span> infers an incrementer. The reset condition infers multiplexers.
          </p>
          <div className="overflow-x-auto">
            <svg viewBox="0 0 440 120" className="w-full max-w-[460px] mx-auto" style={{ height: "auto" }}>
              {[0, 1, 2, 3].map((i) => {
                const x = 20 + i * 108;
                return (
                  <g key={i}>
                    {/* Incrementer logic */}
                    <rect x={x} y={10} width={40} height={30} rx={3}
                      className="fill-blue-100 dark:fill-blue-900 stroke-blue-400 dark:stroke-blue-600" strokeWidth={1.5} />
                    <text x={x + 20} y={28} textAnchor="middle" className="text-[8px] fill-current text-blue-700 dark:text-blue-300 font-bold" fontFamily="monospace">
                      +1 bit{i}
                    </text>
                    {/* Reset mux */}
                    <polygon points={`${x + 8},45 ${x + 32},45 ${x + 28},65 ${x + 12},65`}
                      className="fill-purple-100 dark:fill-purple-900 stroke-purple-400 dark:stroke-purple-600" strokeWidth={1.5} />
                    <text x={x + 20} y={58} textAnchor="middle" className="text-[7px] fill-current text-purple-700 dark:text-purple-300" fontFamily="monospace">
                      rst?
                    </text>
                    {/* FF */}
                    <rect x={x + 5} y={72} width={30} height={25} rx={3}
                      className="fill-amber-100 dark:fill-amber-900 stroke-amber-400 dark:stroke-amber-600" strokeWidth={1.5} />
                    <text x={x + 20} y={88} textAnchor="middle" className="text-[8px] fill-current text-amber-700 dark:text-amber-300 font-bold" fontFamily="monospace">
                      FF
                    </text>
                    {/* Output label */}
                    <text x={x + 20} y={112} textAnchor="middle" className="text-[9px] fill-current text-gray-600 dark:text-gray-400" fontFamily="monospace">
                      cnt({i})
                    </text>
                    {/* Vertical connections */}
                    <line x1={x + 20} y1={40} x2={x + 20} y2={45} className="stroke-gray-400 dark:stroke-gray-500" strokeWidth={1} />
                    <line x1={x + 20} y1={65} x2={x + 20} y2={72} className="stroke-gray-400 dark:stroke-gray-500" strokeWidth={1} />
                    <line x1={x + 20} y1={97} x2={x + 20} y2={105} className="stroke-gray-400 dark:stroke-gray-500" strokeWidth={1} />
                    {/* Carry chain to next */}
                    {i < 3 && (
                      <line x1={x + 40} y1={25} x2={x + 108} y2={25} className="stroke-rose-400 dark:stroke-rose-500" strokeWidth={1} strokeDasharray="3 2" />
                    )}
                    {/* Feedback from FF to incrementer */}
                    <path d={`M${x + 35},84 L${x + 50},84 L${x + 50},5 L${x + 30},5 L${x + 30},10`}
                      className="stroke-gray-400 dark:stroke-gray-500" strokeWidth={0.8} fill="none" />
                  </g>
                );
              })}
              <text x={220} y={8} textAnchor="middle" className="text-[7px] fill-current text-rose-500 dark:text-rose-400" fontFamily="monospace">
                carry chain
              </text>
            </svg>
          </div>
          <p className="text-xs text-gray-500 mt-2">
            Inferred: 4 flip-flops, 4 incrementer logic blocks, 4 reset multiplexers, carry chain between bits.
          </p>
        </div>
      )}

      {/* Step 2: Technology Mapping */}
      {step === 2 && (
        <div>
          <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">
            Each logic function (incrementer + reset mux) is collapsed into a single LUT. The synthesizer computes the truth table
            that produces the correct next-state value for each counter bit.
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {COUNTER_LUTS.map((lut) => (
              <button
                key={lut.bit}
                onClick={() => setSelectedLut(selectedLut === lut.bit ? null : lut.bit)}
                className={cx(
                  "text-left p-2.5 rounded border transition-colors",
                  selectedLut === lut.bit
                    ? "bg-blue-50 dark:bg-blue-900/30 border-blue-400 dark:border-blue-600"
                    : "bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 hover:border-blue-300 dark:hover:border-blue-700"
                )}
              >
                <p className="text-xs font-semibold font-mono">LUT for cnt({lut.bit})</p>
                <p className="text-[10px] text-gray-500 font-mono mt-0.5">{lut.inputs.length} inputs: {lut.inputs.join(", ")}</p>
                <p className="text-[10px] text-blue-600 dark:text-blue-400 font-mono mt-0.5">{lut.fn}</p>
              </button>
            ))}
          </div>
          {selectedLut !== null && (
            <div className="mt-3 overflow-x-auto">
              <table className="text-xs font-mono">
                <thead>
                  <tr className="border-b dark:border-gray-700">
                    {COUNTER_LUTS[selectedLut].inputs.map((inp, i) => (
                      <th key={i} className="px-1.5 py-1 text-center">{inp}</th>
                    ))}
                    <th className="px-2 py-1 text-center border-l dark:border-gray-700">out</th>
                  </tr>
                </thead>
                <tbody>
                  {COUNTER_LUTS[selectedLut].table.map((out, row) => {
                    const bits = getInputBits(row, COUNTER_LUTS[selectedLut].inputs.length);
                    return (
                      <tr key={row} className="border-b dark:border-gray-800">
                        {bits.map((b, i) => (
                          <td key={i} className="px-1.5 py-0.5 text-center">{b}</td>
                        ))}
                        <td className={cx(
                          "px-2 py-0.5 text-center border-l dark:border-gray-700 font-bold",
                          out === 1 ? "text-green-600 dark:text-green-400" : "text-gray-400"
                        )}>
                          {out}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Step 3: Place & Route */}
      {step === 3 && (
        <div>
          <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">
            Each LUT+FF pair is assigned a physical CLB location on the chip. The routing tool then programs switch boxes
            to connect CLB outputs to the inputs of downstream CLBs and to I/O pins.
          </p>
          <FPGAFabric />
        </div>
      )}

      {/* Step 4: Bitstream */}
      {step === 4 && (
        <div>
          <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">
            The final output is a bitstream: a binary file that programs every LUT truth table, every flip-flop enable,
            and every routing switch on the FPGA. This is what gets loaded onto the chip at power-up.
          </p>
          <div className="rounded border bg-gray-900 dark:bg-gray-950 dark:border-gray-700 p-3 overflow-x-auto">
            <table className="text-[10px] font-mono text-gray-300 w-full">
              <thead>
                <tr className="border-b border-gray-700 text-gray-500">
                  <th className="text-left py-1 pr-2">Addr</th>
                  <th className="text-left py-1 pr-3">Target</th>
                  <th className="text-left py-1 pr-3">Data</th>
                  <th className="text-left py-1">Comment</th>
                </tr>
              </thead>
              <tbody>
                {BITSTREAM_LINES.map((line, i) => (
                  <tr key={i} className={cx(
                    "border-b border-gray-800",
                    i < 4 ? "text-blue-300" : i < 8 ? "text-amber-300" : i < 13 ? "text-green-300" : "text-purple-300"
                  )}>
                    <td className="py-0.5 pr-2 text-gray-500">{line.addr}</td>
                    <td className="py-0.5 pr-3">{line.desc}</td>
                    <td className="py-0.5 pr-3">{line.data}</td>
                    <td className="py-0.5 text-gray-500">// {line.comment}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="text-xs text-gray-500 mt-2">
            A real bitstream for a modern FPGA is tens of megabytes: millions of configuration bits for every LUT, FF, and routing switch on the chip.
          </p>
        </div>
      )}

      {/* Navigation */}
      <div className="flex justify-between mt-4">
        <button
          onClick={() => { setStep((s) => s - 1); setSelectedLut(null); }}
          disabled={step === 0}
          className={cx(
            "px-3 py-1.5 text-sm rounded-md font-semibold transition-colors",
            step > 0
              ? "bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-600"
              : "bg-gray-100 dark:bg-gray-800 text-gray-400 cursor-not-allowed"
          )}
        >
          Previous
        </button>
        <button
          onClick={() => { setStep((s) => s + 1); setSelectedLut(null); }}
          disabled={step === SYNTH_STEPS.length - 1}
          className={cx(
            "px-3 py-1.5 text-sm rounded-md font-semibold transition-colors",
            step < SYNTH_STEPS.length - 1
              ? "bg-blue-600 text-white hover:bg-blue-700"
              : "bg-gray-100 dark:bg-gray-800 text-gray-400 cursor-not-allowed"
          )}
        >
          Next
        </button>
      </div>
    </div>
  );
}

// ─── 3b. FPGA Fabric (mapped design) ──────────────────────────────────────

interface FabricCLB {
  row: number;
  col: number;
  used: boolean;
  label?: string;
  fn?: string;
  detail?: string;
}

interface FabricIO {
  row: number;
  col: number;
  label: string;
  dir: "in" | "out";
}

interface FabricRoute {
  from: [number, number];
  to: [number, number];
  label: string;
}

const FABRIC_CLBS: FabricCLB[] = [
  { row: 0, col: 0, used: false },
  { row: 0, col: 1, used: false },
  { row: 0, col: 2, used: false },
  { row: 0, col: 3, used: false },
  { row: 1, col: 0, used: false },
  { row: 1, col: 1, used: true, label: "cnt(0)", fn: "!reset & !cnt(0)", detail: "2-input LUT + FF. Toggles bit 0 every cycle. Clears on reset." },
  { row: 1, col: 2, used: true, label: "cnt(1)", fn: "!reset & (cnt1 ^ cnt0)", detail: "3-input LUT + FF. Toggles when cnt(0)=1. Connected to CLB(1,1) for cnt(0) input." },
  { row: 1, col: 3, used: false },
  { row: 2, col: 0, used: false },
  { row: 2, col: 1, used: true, label: "cnt(2)", fn: "!reset & (cnt2 ^ (cnt1&cnt0))", detail: "4-input LUT + FF. Toggles when cnt(1:0)=\"11\". Receives cnt(0) and cnt(1) from row 1." },
  { row: 2, col: 2, used: true, label: "cnt(3)", fn: "!reset & (cnt3 ^ (cnt2&cnt1&cnt0))", detail: "5-input LUT + FF. Toggles when cnt(2:0)=\"111\". Receives signals from all three other CLBs." },
  { row: 2, col: 3, used: false },
  { row: 3, col: 0, used: false },
  { row: 3, col: 1, used: false },
  { row: 3, col: 2, used: false },
  { row: 3, col: 3, used: false },
];

const FABRIC_IOS: FabricIO[] = [
  { row: -1, col: 1, label: "clk", dir: "in" },
  { row: -1, col: 2, label: "reset", dir: "in" },
  { row: 4, col: 1, label: "count(0)", dir: "out" },
  { row: 4, col: 2, label: "count(1)", dir: "out" },
  { row: 4, col: 1.5, label: "count(2)", dir: "out" },
  { row: 4, col: 2.5, label: "count(3)", dir: "out" },
];

const FABRIC_ROUTES: FabricRoute[] = [
  { from: [1, 1], to: [1, 2], label: "cnt(0)→LUT1" },
  { from: [1, 1], to: [2, 1], label: "cnt(0)→LUT2" },
  { from: [1, 1], to: [2, 2], label: "cnt(0)→LUT3" },
  { from: [1, 2], to: [2, 1], label: "cnt(1)→LUT2" },
  { from: [1, 2], to: [2, 2], label: "cnt(1)→LUT3" },
  { from: [2, 1], to: [2, 2], label: "cnt(2)→LUT3" },
];

export function FPGAFabric() {
  const [selectedCLB, setSelectedCLB] = useState<string | null>(null);

  const cellSize = 70;
  const gap = 50;
  const padX = 60;
  const padY = 50;
  const cell = cellSize + gap;
  const svgW = padX * 2 + 4 * cell - gap;
  const svgH = padY * 2 + 4 * cell - gap + 30;

  const clbPos = (r: number, c: number): [number, number] => [
    padX + c * cell + cellSize / 2,
    padY + r * cell + cellSize / 2,
  ];

  const sel = selectedCLB ? FABRIC_CLBS.find((c) => `${c.row}-${c.col}` === selectedCLB) : null;

  return (
    <div>
      <div className="overflow-x-auto flex justify-center">
        <svg viewBox={`0 0 ${svgW} ${svgH}`} className="w-full max-w-[520px]" style={{ height: "auto" }}>
          {/* Routing lines (behind CLBs) */}
          {FABRIC_ROUTES.map((route, i) => {
            const [x1, y1] = clbPos(route.from[0], route.from[1]);
            const [x2, y2] = clbPos(route.to[0], route.to[1]);
            const dx = x2 - x1;
            const dy = y2 - y1;
            const offset = (i % 3) * 4 - 4;
            return (
              <line
                key={`route-${i}`}
                x1={x1} y1={y1 + offset}
                x2={x2} y2={y2 + offset}
                className="stroke-green-400 dark:stroke-green-500"
                strokeWidth={1.5}
                strokeDasharray={Math.abs(dx) > cell && Math.abs(dy) > cell ? "4 3" : "none"}
              />
            );
          })}

          {/* I/O labels */}
          {FABRIC_IOS.map((io, i) => {
            const x = padX + io.col * cell + cellSize / 2;
            const y = io.row === -1 ? padY - 25 : padY + 4 * cell - gap + 20;
            return (
              <g key={`io-${i}`}>
                <rect
                  x={x - 28} y={y - 10} width={56} height={18} rx={3}
                  className={cx(
                    "stroke-[1.5]",
                    io.dir === "in"
                      ? "fill-cyan-100 dark:fill-cyan-900 stroke-cyan-400 dark:stroke-cyan-600"
                      : "fill-green-100 dark:fill-green-900 stroke-green-400 dark:stroke-green-600"
                  )}
                />
                <text
                  x={x} y={y + 2} textAnchor="middle" dominantBaseline="middle"
                  className="text-[8px] fill-current text-gray-700 dark:text-gray-300 font-bold pointer-events-none"
                  fontFamily="monospace"
                >
                  {io.dir === "in" ? "▶ " : ""}{io.label}{io.dir === "out" ? " ▶" : ""}
                </text>
                {/* Connection line to nearest CLB */}
                {io.row === -1 && (
                  <line x1={x} y1={y + 8} x2={x} y2={padY} className="stroke-gray-300 dark:stroke-gray-600" strokeWidth={1} strokeDasharray="3 2" />
                )}
              </g>
            );
          })}

          {/* CLB blocks */}
          {FABRIC_CLBS.map((clb) => {
            const [cx_, cy] = clbPos(clb.row, clb.col);
            const id = `${clb.row}-${clb.col}`;
            const isSelected = selectedCLB === id;
            return (
              <g
                key={id}
                onClick={() => clb.used ? setSelectedCLB(isSelected ? null : id) : undefined}
                className={clb.used ? "cursor-pointer" : ""}
              >
                <rect
                  x={cx_ - cellSize / 2} y={cy - cellSize / 2}
                  width={cellSize} height={cellSize} rx={5}
                  className={cx(
                    "transition-colors stroke-[2]",
                    clb.used
                      ? isSelected
                        ? "fill-blue-200 dark:fill-blue-700 stroke-blue-500 dark:stroke-blue-400"
                        : "fill-blue-100 dark:fill-blue-800 stroke-blue-400 dark:stroke-blue-600 hover:fill-blue-200 dark:hover:fill-blue-700"
                      : "fill-gray-100 dark:fill-gray-800/50 stroke-gray-300 dark:stroke-gray-700"
                  )}
                />
                {clb.used ? (
                  <>
                    <text
                      x={cx_} y={cy - 10} textAnchor="middle"
                      className="text-[10px] fill-current text-blue-800 dark:text-blue-200 font-bold pointer-events-none"
                      fontFamily="monospace"
                    >
                      {clb.label}
                    </text>
                    <text
                      x={cx_} y={cy + 4} textAnchor="middle"
                      className="text-[7px] fill-current text-blue-600 dark:text-blue-300 pointer-events-none"
                      fontFamily="monospace"
                    >
                      LUT+FF
                    </text>
                    <text
                      x={cx_} y={cy + 20} textAnchor="middle"
                      className="text-[6px] fill-current text-gray-500 dark:text-gray-400 pointer-events-none"
                      fontFamily="monospace"
                    >
                      ({clb.row},{clb.col})
                    </text>
                  </>
                ) : (
                  <>
                    <text
                      x={cx_} y={cy - 4} textAnchor="middle"
                      className="text-[9px] fill-current text-gray-400 dark:text-gray-500 pointer-events-none"
                      fontFamily="monospace"
                    >
                      CLB
                    </text>
                    <text
                      x={cx_} y={cy + 10} textAnchor="middle"
                      className="text-[7px] fill-current text-gray-400 dark:text-gray-600 pointer-events-none"
                      fontFamily="monospace"
                    >
                      (unused)
                    </text>
                  </>
                )}
              </g>
            );
          })}
        </svg>
      </div>

      {/* Info panel */}
      <div className={cx(
        "mt-3 p-3 rounded border text-sm min-h-[2.5rem] transition-colors",
        sel
          ? "bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800"
          : "bg-gray-100 dark:bg-gray-800 border-gray-200 dark:border-gray-700"
      )}>
        {sel ? (
          <>
            <p className="font-semibold font-mono">CLB({sel.row},{sel.col}): {sel.label}</p>
            <p className="text-xs text-gray-500 font-mono mt-1">LUT function: {sel.fn}</p>
            <p className="text-gray-600 dark:text-gray-400 mt-1">{sel.detail}</p>
          </>
        ) : (
          <p className="text-gray-500 dark:text-gray-400">
            4 of 16 CLBs used (25%). Click a blue CLB to see its LUT configuration.
            Green lines show signal routing between CLBs.
          </p>
        )}
      </div>
    </div>
  );
}

// ─── 3c. FPGA Simulator ───────────────────────────────────────────────────

function computeCounter(cnt: number, reset: boolean): { nextBits: number[]; curBits: number[] } {
  const curBits = [
    (cnt >> 0) & 1,
    (cnt >> 1) & 1,
    (cnt >> 2) & 1,
    (cnt >> 3) & 1,
  ];
  if (reset) return { nextBits: [0, 0, 0, 0], curBits };
  const nextBits = [
    curBits[0] ^ 1,
    curBits[1] ^ curBits[0],
    curBits[2] ^ (curBits[1] & curBits[0]),
    curBits[3] ^ (curBits[2] & curBits[1] & curBits[0]),
  ];
  return { nextBits, curBits };
}

function bitsToNum(bits: number[]): number {
  return bits[0] | (bits[1] << 1) | (bits[2] << 2) | (bits[3] << 3);
}

interface SimCLB {
  row: number;
  col: number;
  bit: number;
  label: string;
}

const SIM_CLBS: SimCLB[] = [
  { row: 1, col: 1, bit: 0, label: "cnt(0)" },
  { row: 1, col: 2, bit: 1, label: "cnt(1)" },
  { row: 2, col: 1, bit: 2, label: "cnt(2)" },
  { row: 2, col: 2, bit: 3, label: "cnt(3)" },
];

const SIM_ROUTES: { from: number; to: number; why: string }[] = [
  { from: 0, to: 1, why: "cnt(1) toggles when cnt(0)=1" },
  { from: 0, to: 2, why: "cnt(2) toggles when cnt(1:0)=11" },
  { from: 0, to: 3, why: "cnt(3) toggles when cnt(2:0)=111" },
  { from: 1, to: 2, why: "cnt(2) toggles when cnt(1:0)=11" },
  { from: 1, to: 3, why: "cnt(3) toggles when cnt(2:0)=111" },
  { from: 2, to: 3, why: "cnt(3) toggles when cnt(2:0)=111" },
];

type SimPhase = "stable" | "lut-eval" | "ff-capture";

export function FPGASimulator() {
  const [cnt, setCnt] = useState(0);
  const [resetActive, setResetActive] = useState(false);
  const [clockNum, setClockNum] = useState(0);
  const [selectedBit, setSelectedBit] = useState<number | null>(null);
  const [autoRun, setAutoRun] = useState(false);
  const [phaseDelay, setPhaseDelay] = useState(1250);
  const [phase, setPhase] = useState<SimPhase>("stable");
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const { nextBits, curBits } = computeCounter(cnt, resetActive);

  const doClockTick = useCallback(() => {
    setPhase("lut-eval");
    setTimeout(() => {
      setPhase("ff-capture");
      setTimeout(() => {
        setCnt((prev) => {
          const { nextBits: nb } = computeCounter(prev, resetActive);
          return bitsToNum(nb);
        });
        setClockNum((n) => n + 1);
        setPhase("stable");
      }, phaseDelay);
    }, phaseDelay);
  }, [resetActive, phaseDelay]);

  useEffect(() => {
    if (!autoRun) return;
    let cancelled = false;
    const runCycle = () => {
      if (cancelled) return;
      doClockTick();
      timerRef.current = setTimeout(runCycle, phaseDelay * 3);
    };
    timerRef.current = setTimeout(runCycle, phaseDelay);
    return () => { cancelled = true; if (timerRef.current) clearTimeout(timerRef.current); };
  }, [autoRun, doClockTick, phaseDelay]);

  const handleReset = () => {
    setAutoRun(false);
    setCnt(0);
    setClockNum(0);
    setPhase("stable");
    setResetActive(false);
  };

  const cellSize = 80;
  const gap = 55;
  const padX = 70;
  const padY = 55;
  const cell = cellSize + gap;
  const gridCols = 4;
  const gridRows = 4;
  const svgW = padX * 2 + gridCols * cell - gap;
  const svgH = padY * 2 + gridRows * cell - gap + 20;

  const clbCenter = (r: number, c: number): [number, number] => [
    padX + c * cell + cellSize / 2,
    padY + r * cell + cellSize / 2,
  ];

  return (
    <div className={CARD}>
      {/* Controls */}
      <div className="flex flex-wrap gap-2 items-center mb-4">
        <button
          onClick={doClockTick}
          disabled={autoRun || phase !== "stable"}
          className={cx(
            "px-3 py-1.5 text-sm rounded-md font-semibold transition-colors",
            !autoRun && phase === "stable"
              ? "bg-amber-500 text-white hover:bg-amber-600"
              : "bg-gray-300 dark:bg-gray-700 text-gray-500 cursor-not-allowed"
          )}
        >
          Clock
        </button>
        <button
          onClick={() => setAutoRun(!autoRun)}
          className={cx(
            "px-3 py-1.5 text-sm rounded-md font-semibold transition-colors",
            autoRun
              ? "bg-red-500 text-white hover:bg-red-600"
              : "bg-green-600 text-white hover:bg-green-700"
          )}
        >
          {autoRun ? "Stop" : "Auto"}
        </button>
        <button
          onClick={() => setResetActive(!resetActive)}
          className={cx(
            "px-3 py-1.5 text-sm rounded-md font-semibold transition-colors",
            resetActive
              ? "bg-red-200 dark:bg-red-800 text-red-800 dark:text-red-200 ring-2 ring-red-400"
              : "bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-600"
          )}
        >
          Reset {resetActive ? "ON" : "OFF"}
        </button>
        <button
          onClick={handleReset}
          className="px-3 py-1.5 text-sm rounded-md font-semibold bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors"
        >
          Clear
        </button>
        <div className="flex items-center gap-1.5 ml-2">
          <span className="text-xs text-gray-500 whitespace-nowrap">Phase delay:</span>
          <input
            type="range" min={100} max={2000} step={50} value={phaseDelay}
            onChange={(e) => setPhaseDelay(parseInt(e.target.value, 10))}
            className="w-24"
          />
          <span className="text-xs text-gray-400 font-mono whitespace-nowrap">{phaseDelay}ms</span>
        </div>
      </div>

      {/* Status bar */}
      <div className={cx(
        "flex flex-wrap gap-4 items-center mb-4 px-3 py-2 rounded border text-sm font-mono",
        "bg-white dark:bg-gray-800 dark:border-gray-700"
      )}>
        <div>
          <span className="text-xs text-gray-500 mr-1">Clock:</span>
          <span className="font-bold">{clockNum}</span>
        </div>
        <div>
          <span className="text-xs text-gray-500 mr-1">Counter:</span>
          <span className="font-bold">
            {curBits.slice().reverse().map((b, i) => (
              <span key={i} className={cx(
                "inline-block w-5 text-center rounded mx-[1px]",
                b === 1 ? "bg-green-200 dark:bg-green-800 text-green-800 dark:text-green-200" : "bg-gray-200 dark:bg-gray-700 text-gray-500"
              )}>
                {b}
              </span>
            ))}
          </span>
          <span className="ml-2 text-gray-500">= {cnt}</span>
        </div>
        <div className={cx(
          "text-xs px-1.5 py-0.5 rounded",
          phase === "lut-eval" ? "bg-yellow-200 dark:bg-yellow-800 text-yellow-800 dark:text-yellow-200"
            : phase === "ff-capture" ? "bg-amber-200 dark:bg-amber-800 text-amber-800 dark:text-amber-200"
            : "bg-gray-100 dark:bg-gray-800 text-gray-500"
        )}>
          {phase === "lut-eval" ? "LUTs computing..." : phase === "ff-capture" ? "FFs capturing..." : "Stable"}
        </div>
      </div>

      {/* Fabric SVG */}
      <div className="overflow-x-auto flex justify-center">
        <svg viewBox={`0 0 ${svgW} ${svgH}`} className="w-full max-w-[560px]" style={{ height: "auto" }}>
          {/* I/O labels */}
          <g>
            {/* clk input */}
            <rect x={padX + 1 * cell + cellSize / 2 - 25} y={5} width={50} height={18} rx={3}
              className={cx(
                "stroke-[1.5]",
                phase !== "stable"
                  ? "fill-amber-200 dark:fill-amber-800 stroke-amber-500"
                  : "fill-cyan-100 dark:fill-cyan-900 stroke-cyan-400 dark:stroke-cyan-600"
              )} />
            <text x={padX + 1 * cell + cellSize / 2} y={17} textAnchor="middle"
              className="text-[8px] fill-current text-gray-700 dark:text-gray-300 font-bold" fontFamily="monospace">
              clk {phase !== "stable" ? "↑" : ""}
            </text>

            {/* reset input */}
            <rect x={padX + 2 * cell + cellSize / 2 - 25} y={5} width={50} height={18} rx={3}
              className={cx("stroke-[1.5]",
                resetActive
                  ? "fill-red-200 dark:fill-red-800 stroke-red-400"
                  : "fill-cyan-100 dark:fill-cyan-900 stroke-cyan-400 dark:stroke-cyan-600"
              )} />
            <text x={padX + 2 * cell + cellSize / 2} y={17} textAnchor="middle"
              className="text-[8px] fill-current text-gray-700 dark:text-gray-300 font-bold" fontFamily="monospace">
              reset={resetActive ? "1" : "0"}
            </text>

            {/* count outputs */}
            {[0, 1, 2, 3].map((i) => {
              const x = padX + (1 + Math.floor(i / 2)) * cell + cellSize / 2 + (i % 2 === 0 ? -18 : 18);
              const y = svgH - 18;
              return (
                <g key={`out-${i}`}>
                  <rect x={x - 22} y={y - 2} width={44} height={18} rx={3}
                    className={cx("stroke-[1.5]",
                      curBits[i] === 1
                        ? "fill-green-200 dark:fill-green-800 stroke-green-400"
                        : "fill-gray-200 dark:fill-gray-800 stroke-gray-400 dark:stroke-gray-600"
                    )} />
                  <text x={x} y={y + 10} textAnchor="middle"
                    className="text-[7px] fill-current text-gray-700 dark:text-gray-300 font-bold" fontFamily="monospace">
                    out({i})={curBits[i]}
                  </text>
                </g>
              );
            })}
          </g>

          {/* Arrowhead marker */}
          <defs>
            <marker id="arrow-on" markerWidth="6" markerHeight="4" refX="5" refY="2" orient="auto">
              <polygon points="0,0 6,2 0,4" className="fill-green-400" />
            </marker>
            <marker id="arrow-off" markerWidth="6" markerHeight="4" refX="5" refY="2" orient="auto">
              <polygon points="0,0 6,2 0,4" className="fill-gray-300 dark:fill-gray-600" />
            </marker>
          </defs>

          {/* Routing lines with signal values */}
          {SIM_ROUTES.map((route, i) => {
            const fromCLB = SIM_CLBS[route.from];
            const toCLB = SIM_CLBS[route.to];
            const [x1, y1] = clbCenter(fromCLB.row, fromCLB.col);
            const [x2, y2] = clbCenter(toCLB.row, toCLB.col);
            const signalVal = curBits[route.from];
            const on = signalVal === 1;
            const offset = (i % 3) * 6 - 6;
            const mx = (x1 + x2) / 2;
            const my = (y1 + y2) / 2 + offset;
            return (
              <g key={`route-${i}`}>
                <line
                  x1={x1} y1={y1 + offset}
                  x2={x2} y2={y2 + offset}
                  className={cx(
                    "transition-colors",
                    on ? "stroke-green-400 dark:stroke-green-400" : "stroke-gray-300 dark:stroke-gray-600"
                  )}
                  strokeWidth={on ? 2 : 1}
                  markerEnd={on ? "url(#arrow-on)" : "url(#arrow-off)"}
                />
                {/* Signal label on the line */}
                <rect
                  x={mx - 14} y={my - 8} width={28} height={14} rx={3}
                  className={cx(
                    on ? "fill-green-100 dark:fill-green-900 stroke-green-300 dark:stroke-green-700"
                      : "fill-gray-100 dark:fill-gray-800 stroke-gray-300 dark:stroke-gray-700"
                  )}
                  strokeWidth={0.5}
                />
                <text x={mx} y={my + 1} textAnchor="middle" dominantBaseline="middle"
                  className={cx(
                    "text-[7px] fill-current font-bold pointer-events-none",
                    on ? "text-green-700 dark:text-green-300" : "text-gray-400 dark:text-gray-500"
                  )}
                  fontFamily="monospace"
                >
                  Q{route.from}={signalVal}
                </text>
              </g>
            );
          })}

          {/* Unused CLBs */}
          {Array.from({ length: gridRows }, (_, r) =>
            Array.from({ length: gridCols }, (_, c) => {
              const isUsed = SIM_CLBS.some((clb) => clb.row === r && clb.col === c);
              if (isUsed) return null;
              const [cx_, cy] = clbCenter(r, c);
              return (
                <g key={`empty-${r}-${c}`}>
                  <rect
                    x={cx_ - cellSize / 2} y={cy - cellSize / 2}
                    width={cellSize} height={cellSize} rx={5}
                    className="fill-gray-100 dark:fill-gray-800/40 stroke-gray-300 dark:stroke-gray-700 stroke-[1.5]"
                  />
                  <text x={cx_} y={cy} textAnchor="middle" dominantBaseline="middle"
                    className="text-[8px] fill-current text-gray-400 dark:text-gray-600" fontFamily="monospace">
                    unused
                  </text>
                </g>
              );
            })
          )}

          {/* Used CLBs with live values */}
          {SIM_CLBS.map((clb) => {
            const [cx_, cy] = clbCenter(clb.row, clb.col);
            const q = curBits[clb.bit];
            const d = nextBits[clb.bit];
            const isEval = phase === "lut-eval";
            const isCapture = phase === "ff-capture";
            const isSel = selectedBit === clb.bit;
            return (
              <g key={`sim-${clb.bit}`}
                onClick={() => setSelectedBit(isSel ? null : clb.bit)}
                className="cursor-pointer"
              >
                <rect
                  x={cx_ - cellSize / 2} y={cy - cellSize / 2}
                  width={cellSize} height={cellSize} rx={5}
                  className={cx(
                    "transition-colors",
                    isCapture
                      ? "fill-amber-100 dark:fill-amber-900 stroke-amber-500"
                      : isEval
                      ? "fill-yellow-50 dark:fill-yellow-900/40 stroke-yellow-500"
                      : isSel
                      ? "fill-blue-200 dark:fill-blue-700 stroke-blue-500 dark:stroke-blue-400"
                      : "fill-blue-100 dark:fill-blue-800 stroke-blue-400 dark:stroke-blue-600"
                  )}
                  strokeWidth={isSel ? 3 : 2}
                />
                {/* Label */}
                <text x={cx_} y={cy - 22} textAnchor="middle"
                  className="text-[9px] fill-current text-blue-800 dark:text-blue-200 font-bold" fontFamily="monospace">
                  {clb.label}
                </text>
                {/* LUT output (D) */}
                <text x={cx_ - 15} y={cy - 4} textAnchor="middle"
                  className={cx("text-[10px] fill-current font-mono font-bold",
                    isEval ? "text-yellow-700 dark:text-yellow-300" : "text-gray-500 dark:text-gray-400"
                  )}>
                  D={d}
                </text>
                {/* FF output (Q) */}
                <text x={cx_ + 15} y={cy - 4} textAnchor="middle"
                  className={cx("text-[10px] fill-current font-mono font-bold",
                    isCapture ? "text-amber-700 dark:text-amber-300" : q === 1 ? "text-green-700 dark:text-green-300" : "text-gray-500 dark:text-gray-400"
                  )}>
                  Q={q}
                </text>
                {/* Divider */}
                <line x1={cx_ - 30} y1={cy + 6} x2={cx_ + 30} y2={cy + 6}
                  className="stroke-gray-300 dark:stroke-gray-600" strokeWidth={0.5} />
                {/* Sub-labels */}
                <text x={cx_ - 15} y={cy + 18} textAnchor="middle"
                  className="text-[7px] fill-current text-gray-400 dark:text-gray-500" fontFamily="monospace">
                  LUT
                </text>
                <text x={cx_ + 15} y={cy + 18} textAnchor="middle"
                  className="text-[7px] fill-current text-gray-400 dark:text-gray-500" fontFamily="monospace">
                  FF
                </text>
                {/* Arrow D → FF */}
                <text x={cx_} y={cy + 30} textAnchor="middle"
                  className={cx("text-[7px] fill-current",
                    isCapture ? "text-amber-500" : "text-gray-400 dark:text-gray-600"
                  )} fontFamily="monospace">
                  {isCapture ? "D → Q" : ""}
                </text>
              </g>
            );
          })}
        </svg>
      </div>

      {/* CLB detail panel */}
      {selectedBit !== null && (() => {
        const clb = SIM_CLBS[selectedBit];
        const lut = COUNTER_LUTS[selectedBit];
        const q = curBits[selectedBit];
        const d = nextBits[selectedBit];
        return (
          <div className={cx(
            "mt-3 p-3 rounded border text-sm",
            "bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800"
          )}>
            <div className="flex justify-between items-start">
              <p className="font-semibold font-mono">CLB({clb.row},{clb.col}): {clb.label}</p>
              <button onClick={() => setSelectedBit(null)} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 text-xs">close</button>
            </div>
            <p className="text-xs text-gray-500 font-mono mt-1">
              LUT: {lut.fn}
            </p>
            <p className="text-xs mt-1">
              <span className="text-gray-500">Inputs: </span>
              {lut.inputs.map((inp, i) => {
                const val = inp === "reset" ? (resetActive ? 1 : 0) : curBits[parseInt(inp.match(/\d/)?.[0] ?? "0", 10)];
                return (
                  <span key={i} className={cx(
                    "inline-block px-1.5 py-0.5 rounded font-mono text-xs mr-1",
                    val === 1 ? "bg-green-200 dark:bg-green-800 text-green-800 dark:text-green-200" : "bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-400"
                  )}>
                    {inp}={val}
                  </span>
                );
              })}
            </p>
            <div className="flex gap-4 mt-2 text-xs font-mono">
              <span>D (LUT out) = <span className="font-bold">{d}</span></span>
              <span>Q (FF out) = <span className="font-bold">{q}</span></span>
            </div>
            {/* Compact truth table */}
            <details className="mt-2">
              <summary className="text-xs text-blue-600 dark:text-blue-400 cursor-pointer">Show LUT truth table</summary>
              <div className="mt-1 overflow-x-auto">
                <table className="text-[10px] font-mono">
                  <thead>
                    <tr className="border-b dark:border-gray-700">
                      {lut.inputs.map((inp, i) => (
                        <th key={i} className="px-1 py-0.5 text-center">{inp}</th>
                      ))}
                      <th className="px-1.5 py-0.5 text-center border-l dark:border-gray-700">out</th>
                    </tr>
                  </thead>
                  <tbody>
                    {lut.table.map((out, row) => {
                      const bits = getInputBits(row, lut.inputs.length);
                      const isCurrentRow = bits.every((b, i) => {
                        const inp = lut.inputs[i];
                        const val = inp === "reset" ? (resetActive ? 1 : 0) : curBits[parseInt(inp.match(/\d/)?.[0] ?? "0", 10)];
                        return b === val;
                      });
                      return (
                        <tr key={row} className={cx(
                          "border-b dark:border-gray-800",
                          isCurrentRow && "bg-yellow-100 dark:bg-yellow-900/30"
                        )}>
                          {bits.map((b, i) => (
                            <td key={i} className="px-1 py-0.5 text-center">{b}</td>
                          ))}
                          <td className={cx(
                            "px-1.5 py-0.5 text-center border-l dark:border-gray-700 font-bold",
                            out === 1 ? "text-green-600 dark:text-green-400" : "text-gray-400"
                          )}>
                            {out}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </details>
          </div>
        );
      })()}

      {/* Explanation */}
      <div className={cx(
        "mt-3 p-3 rounded border text-sm",
        "bg-gray-100 dark:bg-gray-800 border-gray-200 dark:border-gray-700"
      )}>
        {phase === "lut-eval" ? (
          <p className="text-yellow-700 dark:text-yellow-300">
            <span className="font-semibold">Clock edge detected.</span> Each LUT reads its inputs and computes the next value (D). The flip-flops have not updated yet.
          </p>
        ) : phase === "ff-capture" ? (
          <p className="text-amber-700 dark:text-amber-300">
            <span className="font-semibold">Flip-flops capturing.</span> Each FF latches its D input. The counter value updates from {cnt} to {bitsToNum(nextBits)}.
          </p>
        ) : (
          <p className="text-gray-600 dark:text-gray-400">
            Counter is at <span className="font-mono font-bold">{cnt}</span> ({curBits.slice().reverse().join("")}b).
            {resetActive
              ? " Reset is active. Next clock will hold the counter at 0."
              : ` Next clock will advance to ${bitsToNum(nextBits)}.`
            }
            {" "}Click Clock to step, or Auto to run continuously.
          </p>
        )}
      </div>
    </div>
  );
}

// ─── 4. Routing Fabric ─────────────────────────────────────────────────────

const GRID_SIZE = 3;
const CLB_SIZE = 50;
const CHANNEL_GAP = 40;
const CELL = CLB_SIZE + CHANNEL_GAP;
const FABRIC_PAD = 30;

function clbCenter(row: number, col: number): [number, number] {
  return [
    FABRIC_PAD + col * CELL + CHANNEL_GAP + CLB_SIZE / 2,
    FABRIC_PAD + row * CELL + CHANNEL_GAP + CLB_SIZE / 2,
  ];
}

type NodeId = string;

interface FabricGraph {
  nodes: Map<NodeId, [number, number]>;
  edges: Map<NodeId, NodeId[]>;
}

function buildFabricGraph(): FabricGraph {
  const nodes = new Map<NodeId, [number, number]>();
  const edges = new Map<NodeId, NodeId[]>();

  const addEdge = (a: NodeId, b: NodeId) => {
    if (!edges.has(a)) edges.set(a, []);
    if (!edges.has(b)) edges.set(b, []);
    edges.get(a)!.push(b);
    edges.get(b)!.push(a);
  };

  // CLB nodes
  for (let r = 0; r < GRID_SIZE; r++) {
    for (let c = 0; c < GRID_SIZE; c++) {
      const id = `clb-${r}-${c}`;
      nodes.set(id, clbCenter(r, c));
    }
  }

  // Switch box nodes at intersections of routing channels
  for (let r = 0; r <= GRID_SIZE; r++) {
    for (let c = 0; c <= GRID_SIZE; c++) {
      const id = `sw-${r}-${c}`;
      const x = FABRIC_PAD + c * CELL;
      const y = FABRIC_PAD + r * CELL;
      nodes.set(id, [x, y]);

      // Connect to adjacent switch boxes (horizontal)
      if (c > 0) addEdge(id, `sw-${r}-${c - 1}`);
      // Connect to adjacent switch boxes (vertical)
      if (r > 0) addEdge(id, `sw-${r - 1}-${c}`);
    }
  }

  // Connect CLBs to their surrounding switch boxes
  for (let r = 0; r < GRID_SIZE; r++) {
    for (let c = 0; c < GRID_SIZE; c++) {
      const clb = `clb-${r}-${c}`;
      addEdge(clb, `sw-${r}-${c}`);
      addEdge(clb, `sw-${r}-${c + 1}`);
      addEdge(clb, `sw-${r + 1}-${c}`);
      addEdge(clb, `sw-${r + 1}-${c + 1}`);
    }
  }

  return { nodes, edges };
}

function bfsPath(graph: FabricGraph, start: NodeId, end: NodeId): NodeId[] | null {
  const visited = new Set<NodeId>();
  const queue: NodeId[][] = [[start]];
  visited.add(start);

  while (queue.length > 0) {
    const path = queue.shift()!;
    const current = path[path.length - 1];
    if (current === end) return path;

    for (const neighbor of graph.edges.get(current) || []) {
      if (!visited.has(neighbor)) {
        visited.add(neighbor);
        queue.push([...path, neighbor]);
      }
    }
  }
  return null;
}

export function RoutingFabric() {
  const graph = useMemo(() => buildFabricGraph(), []);
  const [source, setSource] = useState<[number, number] | null>(null);
  const [dest, setDest] = useState<[number, number] | null>(null);
  const [path, setPath] = useState<NodeId[] | null>(null);

  const svgSize = FABRIC_PAD * 2 + GRID_SIZE * CELL;

  const pathSet = useMemo(() => new Set(path || []), [path]);
  const pathEdges = useMemo(() => {
    if (!path) return new Set<string>();
    const edges = new Set<string>();
    for (let i = 0; i < path.length - 1; i++) {
      edges.add(`${path[i]}|${path[i + 1]}`);
      edges.add(`${path[i + 1]}|${path[i]}`);
    }
    return edges;
  }, [path]);

  const handleClbClick = (r: number, c: number) => {
    if (!source) {
      setSource([r, c]);
      setDest(null);
      setPath(null);
    } else if (!dest && !(source[0] === r && source[1] === c)) {
      setDest([r, c]);
      const result = bfsPath(graph, `clb-${source[0]}-${source[1]}`, `clb-${r}-${c}`);
      setPath(result);
    } else {
      setSource([r, c]);
      setDest(null);
      setPath(null);
    }
  };

  const reset = () => {
    setSource(null);
    setDest(null);
    setPath(null);
  };

  const switchCount = path ? path.filter((n) => n.startsWith("sw-")).length : 0;

  return (
    <div className={CARD}>
      <div className="flex flex-wrap gap-3 items-center mb-3">
        <p className="text-sm text-gray-600 dark:text-gray-400">
          Click a source CLB, then a destination CLB to route a signal.
        </p>
        <button
          onClick={reset}
          className="px-3 py-1 text-sm rounded bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors"
        >
          Reset
        </button>
      </div>

      <div className="overflow-x-auto flex justify-center">
        <svg viewBox={`0 0 ${svgSize} ${svgSize}`} className="w-full max-w-[400px]" style={{ height: "auto" }}>
          {/* Routing channel lines (background) */}
          {Array.from(graph.edges.entries()).flatMap(([nodeId, neighbors]) =>
            neighbors
              .filter((n) => nodeId < n)
              .map((neighborId) => {
                const [x1, y1] = graph.nodes.get(nodeId)!;
                const [x2, y2] = graph.nodes.get(neighborId)!;
                const isOnPath = pathEdges.has(`${nodeId}|${neighborId}`);
                const isCLBEdge = nodeId.startsWith("clb-") || neighborId.startsWith("clb-");
                return (
                  <line
                    key={`edge-${nodeId}-${neighborId}`}
                    x1={x1} y1={y1} x2={x2} y2={y2}
                    strokeWidth={isOnPath ? 2.5 : 1}
                    className={cx(
                      "transition-colors",
                      isOnPath
                        ? "stroke-green-500 dark:stroke-green-400"
                        : isCLBEdge
                        ? "stroke-gray-200 dark:stroke-gray-700"
                        : "stroke-gray-300 dark:stroke-gray-600"
                    )}
                  />
                );
              })
          )}

          {/* Switch boxes */}
          {Array.from(graph.nodes.entries())
            .filter(([id]) => id.startsWith("sw-"))
            .map(([id, [x, y]]) => {
              const isOnPath = pathSet.has(id);
              return (
                <circle
                  key={id}
                  cx={x} cy={y} r={isOnPath ? 5 : 3}
                  className={cx(
                    "transition-all",
                    isOnPath
                      ? "fill-green-500 dark:fill-green-400 stroke-green-700 dark:stroke-green-300"
                      : "fill-gray-300 dark:fill-gray-600 stroke-gray-400 dark:stroke-gray-500"
                  )}
                  strokeWidth={1}
                />
              );
            })}

          {/* CLB blocks */}
          {Array.from({ length: GRID_SIZE }, (_, r) =>
            Array.from({ length: GRID_SIZE }, (_, c) => {
              const [cx_, cy] = clbCenter(r, c);
              const isSource = source && source[0] === r && source[1] === c;
              const isDest = dest && dest[0] === r && dest[1] === c;
              return (
                <g key={`clb-${r}-${c}`} onClick={() => handleClbClick(r, c)} className="cursor-pointer">
                  <rect
                    x={cx_ - CLB_SIZE / 2} y={cy - CLB_SIZE / 2}
                    width={CLB_SIZE} height={CLB_SIZE} rx={4}
                    className={cx(
                      "transition-colors",
                      isSource
                        ? "fill-blue-300 dark:fill-blue-600 stroke-blue-600 dark:stroke-blue-400"
                        : isDest
                        ? "fill-green-300 dark:fill-green-600 stroke-green-600 dark:stroke-green-400"
                        : "fill-blue-100 dark:fill-blue-900 stroke-blue-300 dark:stroke-blue-700 hover:fill-blue-200 dark:hover:fill-blue-800"
                    )}
                    strokeWidth={2}
                  />
                  <text
                    x={cx_} y={cy}
                    textAnchor="middle" dominantBaseline="middle"
                    className="text-[10px] fill-current text-blue-800 dark:text-blue-200 pointer-events-none font-bold"
                    fontFamily="monospace"
                  >
                    CLB
                  </text>
                  <text
                    x={cx_} y={cy + 12}
                    textAnchor="middle" dominantBaseline="middle"
                    className="text-[8px] fill-current text-blue-600 dark:text-blue-300 pointer-events-none"
                    fontFamily="monospace"
                  >
                    ({r},{c})
                  </text>
                </g>
              );
            })
          )}
        </svg>
      </div>

      {/* Status */}
      <div className="mt-3 text-sm min-h-[2rem]">
        {!source && (
          <p className="text-gray-500 dark:text-gray-400">Select a source CLB to begin.</p>
        )}
        {source && !dest && (
          <p className="text-blue-600 dark:text-blue-400">
            Source: CLB({source[0]},{source[1]}). Now select a destination CLB.
          </p>
        )}
        {source && dest && path && (
          <p className="text-green-600 dark:text-green-400 font-semibold">
            Route: CLB({source[0]},{source[1]}) to CLB({dest[0]},{dest[1]}) via {switchCount} switch {switchCount === 1 ? "box" : "boxes"}, est. delay ~{(switchCount * 0.6 + 0.5).toFixed(1)} ns
          </p>
        )}
      </div>
    </div>
  );
}

// ─── 5. Design Comparison ──────────────────────────────────────────────────

type DesignType = "cpu" | "gpu" | "forwarding";

interface ResourceUsage {
  luts: number;
  flipFlops: number;
  bram: number;
  dsp: number;
}

interface ArchBlock {
  label: string;
  x: number;
  y: number;
  w: number;
  h: number;
  color: string;
  colorDark: string;
  desc: string;
}

interface DesignCase {
  title: string;
  resources: ResourceUsage;
  clockMhz: number;
  throughput: string;
  latency: string;
  summary: string;
  blocks: ArchBlock[];
  svgW: number;
  svgH: number;
}

const DESIGNS: Record<DesignType, DesignCase> = {
  cpu: {
    title: "Simple CPU",
    resources: { luts: 18, flipFlops: 12, bram: 8, dsp: 5 },
    clockMhz: 200,
    throughput: "200 MIPS (single-issue)",
    latency: "5 ns per instruction",
    summary: "A CPU on an FPGA runs at ~200 MHz vs 3-5 GHz for a fabricated chip. The sequential nature of instruction execution means most of the FPGA sits idle each cycle. FPGAs are a poor fit for general-purpose computing, but invaluable for prototyping CPU designs before committing to silicon.",
    svgW: 440,
    svgH: 160,
    blocks: [
      { label: "Fetch", x: 10, y: 30, w: 70, h: 100, color: "fill-purple-200 stroke-purple-400", colorDark: "dark:fill-purple-800 dark:stroke-purple-600", desc: "Instruction fetch unit. Reads from BRAM-based instruction memory using the program counter." },
      { label: "Decode", x: 95, y: 30, w: 70, h: 100, color: "fill-blue-200 stroke-blue-400", colorDark: "dark:fill-blue-800 dark:stroke-blue-600", desc: "Instruction decoder. Converts opcode bits into control signals. Implemented as a large LUT tree (~2,400 LUTs for a RISC-V decoder)." },
      { label: "ALU", x: 180, y: 30, w: 70, h: 100, color: "fill-amber-200 stroke-amber-400", colorDark: "dark:fill-amber-800 dark:stroke-amber-600", desc: "Arithmetic logic unit. Uses DSP slices for multiplication and LUTs for other operations (add, shift, compare, bitwise)." },
      { label: "Reg File", x: 265, y: 30, w: 70, h: 100, color: "fill-blue-200 stroke-blue-400", colorDark: "dark:fill-blue-800 dark:stroke-blue-600", desc: "Register file (32 registers). Built from distributed RAM (LUT-based memory) for fast dual-port access." },
      { label: "Mem I/F", x: 350, y: 30, w: 70, h: 100, color: "fill-purple-200 stroke-purple-400", colorDark: "dark:fill-purple-800 dark:stroke-purple-600", desc: "Memory interface. Connects to BRAM-based data memory and optional external DDR controller." },
    ],
  },
  gpu: {
    title: "Parallel GPU Pipeline",
    resources: { luts: 72, flipFlops: 68, bram: 85, dsp: 90 },
    clockMhz: 250,
    throughput: "4 GFLOPS (16 lanes x 250 MHz)",
    latency: "Variable (depends on workload)",
    summary: "FPGAs can implement massively parallel architectures tailored to a specific workload. Unlike a real GPU with thousands of cores, an FPGA might fit 16-64 processing elements, but each can be customized for the exact computation needed with no wasted transistors.",
    svgW: 440,
    svgH: 200,
    blocks: [
      { label: "Dispatch", x: 10, y: 70, w: 60, h: 70, color: "fill-blue-200 stroke-blue-400", colorDark: "dark:fill-blue-800 dark:stroke-blue-600", desc: "Work dispatcher. Distributes data items across the parallel compute lanes. Small LUT-based state machine." },
      { label: "Lane 0", x: 85, y: 10, w: 55, h: 50, color: "fill-amber-200 stroke-amber-400", colorDark: "dark:fill-amber-800 dark:stroke-amber-600", desc: "Compute lane: one DSP slice for multiply-accumulate, LUTs for control, flip-flops for pipeline registers. All 16 lanes execute the same operation on different data (SIMD)." },
      { label: "Lane 1", x: 85, y: 65, w: 55, h: 50, color: "fill-amber-200 stroke-amber-400", colorDark: "dark:fill-amber-800 dark:stroke-amber-600", desc: "Compute lane: one DSP slice for multiply-accumulate, LUTs for control, flip-flops for pipeline registers. All 16 lanes execute the same operation on different data (SIMD)." },
      { label: "Lane ...", x: 85, y: 120, w: 55, h: 50, color: "fill-amber-200 stroke-amber-400", colorDark: "dark:fill-amber-800 dark:stroke-amber-600", desc: "Compute lane: one DSP slice for multiply-accumulate, LUTs for control, flip-flops for pipeline registers. All 16 lanes execute the same operation on different data (SIMD)." },
      { label: "Lane 15", x: 155, y: 10, w: 55, h: 50, color: "fill-amber-200 stroke-amber-400", colorDark: "dark:fill-amber-800 dark:stroke-amber-600", desc: "Compute lane: one DSP slice for multiply-accumulate, LUTs for control, flip-flops for pipeline registers. All 16 lanes execute the same operation on different data (SIMD)." },
      { label: "Lane ...", x: 155, y: 65, w: 55, h: 50, color: "fill-amber-200 stroke-amber-400", colorDark: "dark:fill-amber-800 dark:stroke-amber-600", desc: "Compute lane: one DSP slice for multiply-accumulate, LUTs for control, flip-flops for pipeline registers. All 16 lanes execute the same operation on different data (SIMD)." },
      { label: "Lane ...", x: 155, y: 120, w: 55, h: 50, color: "fill-amber-200 stroke-amber-400", colorDark: "dark:fill-amber-800 dark:stroke-amber-600", desc: "Compute lane: one DSP slice for multiply-accumulate, LUTs for control, flip-flops for pipeline registers. All 16 lanes execute the same operation on different data (SIMD)." },
      { label: "Shared\nBRAM", x: 225, y: 10, w: 65, h: 160, color: "fill-purple-200 stroke-purple-400", colorDark: "dark:fill-purple-800 dark:stroke-purple-600", desc: "Shared Block RAM banks. Multi-ported memory for data exchange between compute lanes and for storing intermediate results." },
      { label: "Collect", x: 305, y: 70, w: 60, h: 70, color: "fill-blue-200 stroke-blue-400", colorDark: "dark:fill-blue-800 dark:stroke-blue-600", desc: "Result collector. Gathers outputs from all lanes, performs any final reduction (sum, max), and writes results to output memory." },
      { label: "DMA", x: 380, y: 70, w: 50, h: 70, color: "fill-green-200 stroke-green-400", colorDark: "dark:fill-green-800 dark:stroke-green-600", desc: "DMA engine. Streams data between external memory (DDR) and the shared BRAM banks. Keeps the compute lanes fed with data." },
    ],
  },
  forwarding: {
    title: "Packet Forwarding Engine",
    resources: { luts: 45, flipFlops: 52, bram: 92, dsp: 3 },
    clockMhz: 300,
    throughput: "100 Gbps (300 MHz x 512-bit datapath)",
    latency: "~50 ns (deterministic, fixed pipeline)",
    summary: "Network forwarding is deeply pipelined with deterministic latency. Every clock cycle, a new packet header enters the pipeline while previous headers progress through later stages. FPGAs excel here: custom protocol support, wire-speed processing, deterministic latency, and the ability to update forwarding logic without replacing hardware.",
    svgW: 440,
    svgH: 160,
    blocks: [
      { label: "Parser", x: 10, y: 30, w: 70, h: 100, color: "fill-blue-200 stroke-blue-400", colorDark: "dark:fill-blue-800 dark:stroke-blue-600", desc: "Packet parser. Extracts header fields (MAC, IP, VLAN, etc.) from the raw packet stream. Built from LUT-based combinational logic and small state machines." },
      { label: "Lookup\nTable", x: 95, y: 30, w: 80, h: 100, color: "fill-purple-200 stroke-purple-400", colorDark: "dark:fill-purple-800 dark:stroke-purple-600", desc: "Forwarding table stored in Block RAM. Implements longest-prefix match or exact match using hash tables or TCAM-like structures built from BRAM. This is where most of the BRAM budget goes." },
      { label: "Action", x: 190, y: 30, w: 70, h: 100, color: "fill-blue-200 stroke-blue-400", colorDark: "dark:fill-blue-800 dark:stroke-blue-600", desc: "Action engine. Applies forwarding decisions: rewrite headers, decrement TTL, update checksums, push/pop VLAN tags. Mostly LUT-based combinational logic." },
      { label: "Queues", x: 275, y: 30, w: 70, h: 100, color: "fill-purple-200 stroke-purple-400", colorDark: "dark:fill-purple-800 dark:stroke-purple-600", desc: "Output queues built from BRAM FIFOs. Buffer packets waiting for output port access. Implement QoS scheduling (priority queuing, weighted fair queuing)." },
      { label: "Scheduler", x: 360, y: 30, w: 70, h: 100, color: "fill-blue-200 stroke-blue-400", colorDark: "dark:fill-blue-800 dark:stroke-blue-600", desc: "Output scheduler. Arbitrates between queued packets, applies traffic shaping, and sends packets to the output ports." },
    ],
  },
};

const RESOURCE_COLORS: Record<string, string> = {
  luts: "bg-blue-400 dark:bg-blue-500",
  flipFlops: "bg-amber-400 dark:bg-amber-500",
  bram: "bg-purple-400 dark:bg-purple-500",
  dsp: "bg-rose-400 dark:bg-rose-500",
};

const RESOURCE_LABELS: Record<string, string> = {
  luts: "LUTs",
  flipFlops: "Flip-Flops",
  bram: "Block RAM",
  dsp: "DSP Slices",
};

export function DesignComparison() {
  const [activeDesign, setActiveDesign] = useState<DesignType>("cpu");
  const [hoveredBlock, setHoveredBlock] = useState<number | null>(null);

  const design = DESIGNS[activeDesign];

  return (
    <div className={CARD}>
      {/* Tab buttons */}
      <div className="flex flex-wrap gap-1 mb-4">
        {(["cpu", "gpu", "forwarding"] as DesignType[]).map((type) => (
          <button
            key={type}
            onClick={() => { setActiveDesign(type); setHoveredBlock(null); }}
            className={cx(
              "px-4 py-2 text-sm rounded-md font-semibold transition-colors",
              type === activeDesign
                ? "bg-blue-600 text-white"
                : "bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-600"
            )}
          >
            {DESIGNS[type].title}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Block diagram */}
        <div className="overflow-x-auto">
          <svg viewBox={`0 0 ${design.svgW} ${design.svgH}`} className="w-full" style={{ height: "auto" }}>
            {/* Pipeline arrows between blocks */}
            {design.blocks.slice(0, -1).map((block, i) => {
              const next = design.blocks[i + 1];
              const x1 = block.x + block.w;
              const x2 = next.x;
              const y = Math.min(block.y + block.h / 2, next.y + next.h / 2);
              return (
                <g key={`arrow-${i}`}>
                  <line
                    x1={x1} y1={y} x2={x2 - 4} y2={y}
                    strokeWidth={1.5}
                    className="stroke-gray-400 dark:stroke-gray-500"
                  />
                  <polygon
                    points={`${x2 - 6},${y - 3} ${x2},${y} ${x2 - 6},${y + 3}`}
                    className="fill-gray-400 dark:fill-gray-500"
                  />
                </g>
              );
            })}

            {/* Architecture blocks */}
            {design.blocks.map((block, i) => (
              <g
                key={i}
                onMouseEnter={() => setHoveredBlock(i)}
                onMouseLeave={() => setHoveredBlock(null)}
                className="cursor-pointer"
              >
                <rect
                  x={block.x} y={block.y}
                  width={block.w} height={block.h} rx={5}
                  className={cx(
                    "transition-all",
                    block.color, block.colorDark,
                    hoveredBlock === i && "stroke-[3px]"
                  )}
                  strokeWidth={hoveredBlock === i ? 3 : 1.5}
                />
                {block.label.split("\n").map((line, li) => (
                  <text
                    key={li}
                    x={block.x + block.w / 2}
                    y={block.y + block.h / 2 + (li - (block.label.split("\n").length - 1) / 2) * 14}
                    textAnchor="middle" dominantBaseline="middle"
                    className="text-[11px] fill-current text-gray-800 dark:text-gray-200 font-bold pointer-events-none"
                    fontFamily="monospace"
                  >
                    {line}
                  </text>
                ))}
              </g>
            ))}
          </svg>
        </div>

        {/* Resource utilization + metrics */}
        <div>
          <h4 className="text-sm font-semibold mb-3">FPGA Resource Utilization</h4>
          <div className="space-y-2">
            {Object.entries(design.resources).map(([key, pct]) => (
              <div key={key}>
                <div className="flex justify-between text-xs mb-0.5">
                  <span className="font-mono">{RESOURCE_LABELS[key]}</span>
                  <span className="text-gray-500">{pct}%</span>
                </div>
                <div className="w-full h-3 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                  <div
                    className={cx("h-full rounded-full transition-all duration-500", RESOURCE_COLORS[key])}
                    style={{ width: `${pct}%` }}
                  />
                </div>
              </div>
            ))}
          </div>

          <div className="mt-4 space-y-1 text-sm">
            <p><span className="font-semibold">Clock:</span> <span className="font-mono">{design.clockMhz} MHz</span></p>
            <p><span className="font-semibold">Throughput:</span> <span className="font-mono">{design.throughput}</span></p>
            <p><span className="font-semibold">Latency:</span> <span className="font-mono">{design.latency}</span></p>
          </div>
        </div>
      </div>

      {/* Block description */}
      <div className={cx(
        "mt-4 p-3 rounded border text-sm min-h-[3rem] transition-colors",
        hoveredBlock !== null
          ? "bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800"
          : "bg-gray-100 dark:bg-gray-800 border-gray-200 dark:border-gray-700"
      )}>
        {hoveredBlock !== null ? (
          <>
            <p className="font-semibold">{design.blocks[hoveredBlock].label.replace("\n", " ")}</p>
            <p className="text-gray-600 dark:text-gray-400 mt-1">{design.blocks[hoveredBlock].desc}</p>
          </>
        ) : (
          <p className="text-gray-500 dark:text-gray-400">Hover over a block to see which FPGA resources it uses.</p>
        )}
      </div>

      {/* Summary */}
      <p className="mt-3 text-sm text-gray-600 dark:text-gray-400">
        {design.summary}
      </p>
    </div>
  );
}
