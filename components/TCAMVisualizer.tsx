import { useState, useCallback, useMemo } from "react";
import { cx } from "@/lib/utils";

// ─── Shared types & helpers ─────────────────────────────────────────────────

interface RouteEntry {
  prefix: string;
  mask: string;
  nextHop: string;
  label: string;
}

const ROUTES: RouteEntry[] = [
  { prefix: "0.0.0.0",       mask: "/0",  nextHop: "Default Gateway",  label: "0.0.0.0/0" },
  { prefix: "10.0.0.0",      mask: "/8",  nextHop: "Router A",         label: "10.0.0.0/8" },
  { prefix: "10.1.0.0",      mask: "/16", nextHop: "Router B",         label: "10.1.0.0/16" },
  { prefix: "10.1.1.0",      mask: "/24", nextHop: "Router C",         label: "10.1.1.0/24" },
  { prefix: "10.1.1.128",    mask: "/25", nextHop: "Router D",         label: "10.1.1.128/25" },
  { prefix: "192.168.1.0",   mask: "/24", nextHop: "Router E",         label: "192.168.1.0/24" },
];

function ipToBinary(ip: string): string {
  return ip
    .split(".")
    .map((o) => parseInt(o, 10).toString(2).padStart(8, "0"))
    .join("");
}

function maskLen(mask: string): number {
  return parseInt(mask.replace("/", ""), 10);
}

function matchesRoute(ipBin: string, route: RouteEntry): boolean {
  const prefixBin = ipToBinary(route.prefix);
  const len = maskLen(route.mask);
  return ipBin.substring(0, len) === prefixBin.substring(0, len);
}

// ─── 1. Binary IP Breakdown ────────────────────────────────────────────────

export function BinaryBreakdown() {
  const [ip, setIp] = useState("10.1.1.200");
  const [error, setError] = useState("");

  const validate = (val: string) => {
    const parts = val.split(".");
    if (parts.length !== 4) return false;
    return parts.every((p) => {
      const n = parseInt(p, 10);
      return !isNaN(n) && n >= 0 && n <= 255 && String(n) === p;
    });
  };

  const binary = validate(ip) ? ipToBinary(ip) : null;

  return (
    <div className={cx("my-6 p-4 border rounded-lg", "bg-gray-50 dark:bg-gray-900 dark:border-gray-700")}>
      <label className="block text-sm font-semibold mb-2">Enter an IPv4 address:</label>
      <input
        type="text"
        value={ip}
        onChange={(e) => {
          setIp(e.target.value);
          setError(validate(e.target.value) ? "" : "Invalid IPv4 address");
        }}
        className={cx(
          "px-3 py-2 border rounded font-mono w-48",
          "bg-white dark:bg-gray-800 dark:border-gray-600 dark:text-gray-100"
        )}
      />
      {error && <p className="text-red-500 text-xs mt-1">{error}</p>}
      {binary && (
        <div className="mt-4 overflow-x-auto">
          <div className="flex gap-1 flex-wrap font-mono text-sm">
            {ip.split(".").map((octet, i) => (
              <div key={i} className="flex flex-col items-center">
                <span className="text-xs text-gray-500 mb-1">Octet {i + 1}</span>
                <span className={cx(
                  "px-2 py-1 rounded font-bold",
                  "bg-blue-100 dark:bg-blue-900 dark:text-blue-200"
                )}>
                  {octet}
                </span>
                <div className="flex mt-1">
                  {parseInt(octet, 10)
                    .toString(2)
                    .padStart(8, "0")
                    .split("")
                    .map((bit, j) => (
                      <span
                        key={j}
                        className={cx(
                          "w-5 h-6 flex items-center justify-center text-xs border",
                          bit === "1"
                            ? "bg-green-200 dark:bg-green-800 dark:text-green-200 border-green-300 dark:border-green-700"
                            : "bg-gray-100 dark:bg-gray-800 dark:text-gray-400 border-gray-200 dark:border-gray-700"
                        )}
                      >
                        {bit}
                      </span>
                    ))}
                </div>
              </div>
            ))}
          </div>
          <p className="mt-3 text-xs text-gray-500 font-mono">
            Full 32-bit: {binary}
          </p>
        </div>
      )}
    </div>
  );
}

// ─── 2. Prefix Match Visualizer ─────────────────────────────────────────────

export function PrefixMatchVisualizer() {
  const [ip, setIp] = useState("10.1.1.200");

  const validate = (val: string) => {
    const parts = val.split(".");
    if (parts.length !== 4) return false;
    return parts.every((p) => {
      const n = parseInt(p, 10);
      return !isNaN(n) && n >= 0 && n <= 255 && String(n) === p;
    });
  };

  const valid = validate(ip);
  const ipBin = valid ? ipToBinary(ip) : "";

  const entries = ROUTES.map((r) => ({
    ...r,
    matches: valid ? matchesRoute(ipBin, r) : false,
    len: maskLen(r.mask),
  }));

  const longestMatch = entries
    .filter((m) => m.matches)
    .sort((a, b) => b.len - a.len)[0];

  return (
    <div className={cx("my-6 p-4 border rounded-lg", "bg-gray-50 dark:bg-gray-900 dark:border-gray-700")}>
      <label className="block text-sm font-semibold mb-2">Destination IP:</label>
      <input
        type="text"
        value={ip}
        onChange={(e) => setIp(e.target.value)}
        className={cx(
          "px-3 py-2 border rounded font-mono w-48 mb-4",
          "bg-white dark:bg-gray-800 dark:border-gray-600 dark:text-gray-100"
        )}
      />
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left border-b dark:border-gray-700">
              <th className="py-1 pr-2">Route</th>
              <th className="py-1 pr-2">Prefix Bits</th>
              <th className="py-1 pr-2">Match?</th>
              <th className="py-1">Next Hop</th>
            </tr>
          </thead>
          <tbody>
            {entries
              .sort((a, b) => b.len - a.len)
              .map((m, i) => {
                const prefixBin = ipToBinary(m.prefix);
                const isLongest = longestMatch && m.label === longestMatch.label;
                return (
                  <tr
                    key={i}
                    className={cx(
                      "border-b dark:border-gray-800",
                      isLongest && "bg-green-50 dark:bg-green-900/30",
                      valid && !m.matches && "opacity-40"
                    )}
                  >
                    <td className="py-2 pr-2 font-mono text-xs">{m.label}</td>
                    <td className="py-2 pr-2">
                      {valid ? (
                        <span className="font-mono text-xs flex flex-wrap">
                          {ipBin.split("").map((bit, j) => (
                            <span
                              key={j}
                              className={cx(
                                "w-4 h-5 inline-flex items-center justify-center",
                                j < m.len
                                  ? bit === prefixBin[j]
                                    ? "text-green-600 dark:text-green-400 font-bold"
                                    : "text-red-600 dark:text-red-400 font-bold"
                                  : "text-gray-300 dark:text-gray-600"
                              )}
                            >
                              {bit}
                            </span>
                          ))}
                        </span>
                      ) : (
                        <span className="font-mono text-xs text-gray-400">/{m.mask.replace("/", "")}</span>
                      )}
                    </td>
                    <td className="py-2 pr-2">
                      {!valid ? (
                        <span className="text-gray-400">-</span>
                      ) : m.matches ? (
                        <span className="text-green-600 dark:text-green-400">✓</span>
                      ) : (
                        <span className="text-red-400">✗</span>
                      )}
                    </td>
                    <td className="py-2 font-mono text-xs">{m.nextHop}</td>
                  </tr>
                );
              })}
          </tbody>
        </table>
        {longestMatch && (
          <p className="mt-3 text-sm font-semibold">
            Longest prefix match:{" "}
            <span className="text-green-600 dark:text-green-400 font-mono">
              {longestMatch.label}
            </span>{" "}
            → {longestMatch.nextHop}
          </p>
        )}
      </div>
    </div>
  );
}

// ─── 3. TCAM Lookup Animation ───────────────────────────────────────────────

type TCAMState = "idle" | "searching" | "done";

interface TCAMEntry {
  label: string;
  value: string;  // binary with X for don't-care
  mask: string;
  nextHop: string;
  priority: number;
}

const TCAM_ENTRIES: TCAMEntry[] = [
  { label: "10.1.1.128/25", value: "00001010.00000001.00000001.1XXXXXXX", mask: "/25", nextHop: "Router D", priority: 0 },
  { label: "10.1.1.0/24",   value: "00001010.00000001.00000001.XXXXXXXX", mask: "/24", nextHop: "Router C", priority: 1 },
  { label: "10.1.0.0/16",   value: "00001010.00000001.XXXXXXXX.XXXXXXXX", mask: "/16", nextHop: "Router B", priority: 2 },
  { label: "10.0.0.0/8",    value: "00001010.XXXXXXXX.XXXXXXXX.XXXXXXXX", mask: "/8",  nextHop: "Router A", priority: 3 },
  { label: "192.168.1.0/24", value: "11000000.10101000.00000001.XXXXXXXX", mask: "/24", nextHop: "Router E", priority: 4 },
  { label: "0.0.0.0/0",     value: "XXXXXXXX.XXXXXXXX.XXXXXXXX.XXXXXXXX", mask: "/0",  nextHop: "Default",  priority: 5 },
];

export function TCAMLookup() {
  const [ip, setIp] = useState("10.1.1.200");
  const [state, setState] = useState<TCAMState>("idle");
  const [highlightedRows, setHighlightedRows] = useState<Set<number>>(new Set());
  const [winner, setWinner] = useState<number | null>(null);
  const [step, setStep] = useState(0);

  const validate = (val: string) => {
    const parts = val.split(".");
    if (parts.length !== 4) return false;
    return parts.every((p) => {
      const n = parseInt(p, 10);
      return !isNaN(n) && n >= 0 && n <= 255 && String(n) === p;
    });
  };

  const valid = validate(ip);

  const tcamMatch = useCallback(
    (entry: TCAMEntry, ipBin: string): boolean => {
      const entryBits = entry.value.replace(/\./g, "");
      for (let i = 0; i < 32; i++) {
        if (entryBits[i] === "X") continue;
        if (entryBits[i] !== ipBin[i]) return false;
      }
      return true;
    },
    []
  );

  const runLookup = () => {
    if (!valid) return;
    setState("searching");
    setWinner(null);
    setHighlightedRows(new Set());
    setStep(0);

    const ipBin = ipToBinary(ip);

    // Simulate parallel lookup with a visual animation
    // Step 1: all rows light up (parallel comparison)
    setTimeout(() => {
      const allRows = new Set(TCAM_ENTRIES.map((_, i) => i));
      setHighlightedRows(allRows);
      setStep(1);
    }, 600);

    // Step 2: show matches
    setTimeout(() => {
      const matchedRows = new Set<number>();
      TCAM_ENTRIES.forEach((entry, i) => {
        if (tcamMatch(entry, ipBin)) matchedRows.add(i);
      });
      setHighlightedRows(matchedRows);
      setStep(2);
    }, 1800);

    // Step 3: priority encoder picks highest priority (lowest index) match
    setTimeout(() => {
      const ipBin2 = ipToBinary(ip);
      let best: number | null = null;
      TCAM_ENTRIES.forEach((entry, i) => {
        if (tcamMatch(entry, ipBin2) && (best === null || entry.priority < TCAM_ENTRIES[best].priority)) {
          best = i;
        }
      });
      setWinner(best);
      setHighlightedRows(best !== null ? new Set([best]) : new Set());
      setStep(3);
      setState("done");
    }, 3000);
  };

  return (
    <div className={cx("my-6 p-4 border rounded-lg", "bg-gray-50 dark:bg-gray-900 dark:border-gray-700")}>
      <div className="flex flex-wrap gap-2 items-end mb-4">
        <div>
          <label className="block text-sm font-semibold mb-1">Destination IP:</label>
          <input
            type="text"
            value={ip}
            onChange={(e) => {
              setIp(e.target.value);
              setState("idle");
              setHighlightedRows(new Set());
              setWinner(null);
            }}
            className={cx(
              "px-3 py-2 border rounded font-mono w-48",
              "bg-white dark:bg-gray-800 dark:border-gray-600 dark:text-gray-100"
            )}
          />
        </div>
        <button
          onClick={runLookup}
          disabled={!valid || state === "searching"}
          className={cx(
            "px-4 py-2 rounded font-semibold text-sm transition-colors",
            valid && state !== "searching"
              ? "bg-blue-600 text-white hover:bg-blue-700"
              : "bg-gray-300 text-gray-500 dark:bg-gray-700 dark:text-gray-500 cursor-not-allowed"
          )}
        >
          {state === "searching" ? "Looking up…" : "TCAM Lookup"}
        </button>
      </div>

      {/* TCAM Table */}
      <div className="overflow-x-auto">
        <table className="w-full text-xs font-mono">
          <thead>
            <tr className="text-left border-b dark:border-gray-700">
              <th className="py-1 pr-2 text-xs">Priority</th>
              <th className="py-1 pr-2 text-xs">Route</th>
              <th className="py-1 pr-2 text-xs">TCAM Entry (Value + Mask)</th>
              <th className="py-1 text-xs">Next Hop</th>
            </tr>
          </thead>
          <tbody>
            {TCAM_ENTRIES.map((entry, i) => {
              const isHighlighted = highlightedRows.has(i);
              const isWinner = winner === i;
              return (
                <tr
                  key={i}
                  className={cx(
                    "border-b dark:border-gray-800 transition-all duration-300",
                    isWinner && "bg-green-100 dark:bg-green-900/40 ring-2 ring-green-500",
                    isHighlighted && !isWinner && step === 1 && "bg-yellow-50 dark:bg-yellow-900/20",
                    isHighlighted && !isWinner && step === 2 && "bg-blue-50 dark:bg-blue-900/20",
                    !isHighlighted && state !== "idle" && step > 0 && "opacity-30"
                  )}
                >
                  <td className="py-2 pr-2">{entry.priority}</td>
                  <td className="py-2 pr-2">{entry.label}</td>
                  <td className="py-2 pr-2">
                    <span className="flex flex-wrap">
                      {entry.value.split("").map((ch, j) => (
                        <span
                          key={j}
                          className={cx(
                            ch === "." ? "w-1" : "w-4 h-5 inline-flex items-center justify-center",
                            ch === "X"
                              ? "text-gray-400 dark:text-gray-500"
                              : ch === "1"
                              ? "text-green-700 dark:text-green-400"
                              : ch === "0"
                              ? "text-gray-600 dark:text-gray-400"
                              : ""
                          )}
                        >
                          {ch === "." ? "" : ch}
                        </span>
                      ))}
                    </span>
                  </td>
                  <td className="py-2">{entry.nextHop}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Status */}
      <div className="mt-3 text-sm min-h-[3rem]">
        {state === "searching" && step === 1 && (
          <p className="text-yellow-600 dark:text-yellow-400">
            ⚡ All TCAM entries compared <strong>simultaneously</strong> in one clock cycle…
          </p>
        )}
        {state === "searching" && step === 2 && (
          <p className="text-blue-600 dark:text-blue-400">
            Matching entries identified. Priority encoder selecting best match…
          </p>
        )}
        {state === "done" && winner !== null && (
          <p className="text-green-600 dark:text-green-400 font-semibold">
            Result: {TCAM_ENTRIES[winner].label} → {TCAM_ENTRIES[winner].nextHop} (found in ~1 clock cycle)
          </p>
        )}
        {state === "done" && winner === null && (
          <p className="text-red-500">No match found.</p>
        )}
      </div>
    </div>
  );
}

// ─── 4. TCAM vs RAM comparison ──────────────────────────────────────────────

export function TCAMvsRAM() {
  const [numRoutes, setNumRoutes] = useState(500000);

  // Model: a trie always walks up to 32 levels, but access time per level
  // depends on whether the working set fits in cache.
  // - L1 hit ~1 ns, L2 hit ~4 ns, L3 hit ~10 ns, DRAM ~50 ns
  // - Rough model: small tables fit in L2/L3, large tables spill to DRAM.
  //   Blend access time based on estimated cache residency.
  const l2Size = 50000;   // ~50K entries fit in L2
  const l3Size = 300000;  // ~300K entries fit in L3
  const fractionL2 = Math.min(1, l2Size / numRoutes);
  const fractionL3 = Math.min(1, (l3Size - l2Size) / Math.max(1, numRoutes - l2Size));
  const fractionDram = Math.max(0, 1 - fractionL2 - Math.max(0, fractionL3));
  const avgAccessNs = fractionL2 * 4 + Math.max(0, fractionL3) * 10 + fractionDram * 50;
  const trieDepth = 32;
  const swLatency = Math.round(trieDepth * avgAccessNs);
  const tcamLatency = 15;
  const maxSwLatency = trieDepth * 50; // worst case for bar scaling

  return (
    <div className={cx("my-6 p-4 border rounded-lg", "bg-gray-50 dark:bg-gray-900 dark:border-gray-700")}>
      <label className="block text-sm font-semibold mb-2">
        Routing table size: <span className="font-mono">{numRoutes.toLocaleString()}</span> entries
      </label>
      <input
        type="range"
        min={1000}
        max={1000000}
        step={1000}
        value={numRoutes}
        onChange={(e) => setNumRoutes(parseInt(e.target.value, 10))}
        className="w-full mb-4"
      />
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* RAM / Software lookup */}
        <div className={cx("p-3 rounded border", "bg-red-50 border-red-200 dark:bg-red-900/20 dark:border-red-800")}>
          <h4 className="font-bold text-sm mb-2">Software (RAM + Trie)</h4>
          <div className="text-xs space-y-1">
            <p>Lookup type: <span className="font-mono">Sequential bit-walk</span></p>
            <p>Worst case: <span className="font-mono">O(W) = O(32)</span> memory accesses</p>
            <p>Avg access: <span className="font-mono">~{avgAccessNs.toFixed(0)} ns</span>{" "}
              ({numRoutes < l2Size
                ? "fits in L2 cache"
                : numRoutes < l3Size
                ? "partially in L3 cache"
                : "spilling to DRAM"})
            </p>
            <p>Depth × access: <span className="font-mono">32 × {avgAccessNs.toFixed(0)} ns</span></p>
          </div>
          <div className="mt-3 bg-red-100 dark:bg-red-900/40 rounded p-2">
            <div className="text-xs font-semibold">Estimated lookup latency</div>
            <div
              className="h-4 bg-red-400 dark:bg-red-600 rounded mt-1 transition-all duration-200"
              style={{ width: `${Math.max(8, (swLatency / maxSwLatency) * 100)}%` }}
            />
            <div className="text-xs mt-1 font-mono">~{swLatency.toLocaleString()} ns</div>
          </div>
        </div>

        {/* TCAM / Hardware lookup */}
        <div className={cx("p-3 rounded border", "bg-green-50 border-green-200 dark:bg-green-900/20 dark:border-green-800")}>
          <h4 className="font-bold text-sm mb-2">Hardware (TCAM)</h4>
          <div className="text-xs space-y-1">
            <p>Lookup type: <span className="font-mono">Parallel compare all</span></p>
            <p>Worst case: <span className="font-mono">O(1)</span> — single cycle</p>
            <p>~Latency: <span className="font-mono">~{tcamLatency} ns</span> (one TCAM cycle)</p>
            <p>Constant regardless of table size</p>
          </div>
          <div className="mt-3 bg-green-100 dark:bg-green-900/40 rounded p-2">
            <div className="text-xs font-semibold">Estimated lookup latency</div>
            <div
              className="h-4 bg-green-500 dark:bg-green-600 rounded mt-1"
              style={{ width: `${Math.max(5, (tcamLatency / maxSwLatency) * 100)}%` }}
            />
            <div className="text-xs mt-1 font-mono">~{tcamLatency} ns</div>
          </div>
        </div>
      </div>
      <p className="text-xs text-gray-500 mt-3">
        With {numRoutes.toLocaleString()} routes, software trie latency grows as the table outgrows CPU cache (~{avgAccessNs.toFixed(0)} ns per access × 32 levels = <strong>~{swLatency.toLocaleString()} ns</strong>).
        TCAM compares <strong>all {numRoutes.toLocaleString()} entries in parallel</strong> in <strong>~{tcamLatency} ns</strong> — a {(swLatency / tcamLatency).toFixed(0)}x difference.
      </p>
    </div>
  );
}

// ─── 5. Prefix Compression Visualizer ───────────────────────────────────────

interface CompressibleRoute {
  prefix: string;
  len: number;
  nextHop: string;
  binary: string;
}

// Default scenario: routes that can be compressed
const COMPRESSION_SCENARIOS: Record<string, CompressibleRoute[]> = {
  "Adjacent Aggregation": [
    { prefix: "192.168.0.0", len: 24, nextHop: "Router A", binary: "" },
    { prefix: "192.168.1.0", len: 24, nextHop: "Router A", binary: "" },
    { prefix: "192.168.2.0", len: 24, nextHop: "Router A", binary: "" },
    { prefix: "192.168.3.0", len: 24, nextHop: "Router A", binary: "" },
    { prefix: "10.0.0.0",    len: 24, nextHop: "Router B", binary: "" },
    { prefix: "10.0.1.0",    len: 24, nextHop: "Router B", binary: "" },
  ],
  "Sibling Merging": [
    { prefix: "172.16.0.0", len: 17, nextHop: "Router C", binary: "" },
    { prefix: "172.16.128.0", len: 17, nextHop: "Router C", binary: "" },
    { prefix: "10.10.0.0",  len: 25, nextHop: "Router D", binary: "" },
    { prefix: "10.10.0.128", len: 25, nextHop: "Router D", binary: "" },
  ],
  "Mixed (Some Compressible)": [
    { prefix: "10.0.0.0",   len: 24, nextHop: "Router A", binary: "" },
    { prefix: "10.0.1.0",   len: 24, nextHop: "Router A", binary: "" },
    { prefix: "10.0.2.0",   len: 24, nextHop: "Router B", binary: "" },
    { prefix: "10.0.3.0",   len: 24, nextHop: "Router B", binary: "" },
    { prefix: "10.0.4.0",   len: 24, nextHop: "Router A", binary: "" },
  ],
};

// Fill in binary representations
Object.values(COMPRESSION_SCENARIOS).forEach((routes) =>
  routes.forEach((r) => {
    r.binary = ipToBinary(r.prefix);
  })
);

function canMerge(a: CompressibleRoute, b: CompressibleRoute): CompressibleRoute | null {
  if (a.len !== b.len || a.nextHop !== b.nextHop) return null;
  const parentLen = a.len - 1;
  if (parentLen < 0) return null;
  const aBin = a.binary.substring(0, parentLen);
  const bBin = b.binary.substring(0, parentLen);
  if (aBin !== bBin) return null;
  // They must differ only in the bit at position parentLen
  if (a.binary[parentLen] === b.binary[parentLen]) return null;
  // Build parent prefix
  const parentBin = aBin + "0".repeat(32 - parentLen);
  const octets = [];
  for (let i = 0; i < 32; i += 8) {
    octets.push(parseInt(parentBin.substring(i, i + 8), 2));
  }
  return {
    prefix: octets.join("."),
    len: parentLen,
    nextHop: a.nextHop,
    binary: parentBin,
  };
}

function compress(routes: CompressibleRoute[]): { compressed: CompressibleRoute[]; steps: { from: [CompressibleRoute, CompressibleRoute]; to: CompressibleRoute }[] } {
  let current = [...routes];
  const steps: { from: [CompressibleRoute, CompressibleRoute]; to: CompressibleRoute }[] = [];
  let changed = true;
  while (changed) {
    changed = false;
    for (let i = 0; i < current.length; i++) {
      for (let j = i + 1; j < current.length; j++) {
        const merged = canMerge(current[i], current[j]);
        if (merged) {
          steps.push({ from: [current[i], current[j]], to: merged });
          current = [...current.slice(0, i), ...current.slice(i + 1, j), ...current.slice(j + 1), merged];
          changed = true;
          break;
        }
      }
      if (changed) break;
    }
  }
  return { compressed: current, steps };
}

function binaryToDisplay(binary: string, prefixLen: number): React.ReactNode {
  return (
    <span className="font-mono text-xs flex flex-wrap">
      {binary.split("").map((bit, i) => (
        <span
          key={i}
          className={cx(
            "w-3.5 h-5 inline-flex items-center justify-center",
            i < prefixLen
              ? "text-blue-700 dark:text-blue-300 font-bold"
              : "text-gray-300 dark:text-gray-600",
            i > 0 && i % 8 === 0 && "ml-1"
          )}
        >
          {i < prefixLen ? bit : "x"}
        </span>
      ))}
    </span>
  );
}

// Patricia trie node — collapses single-child chains into one node with a
// multi-bit label so the tree stays compact and readable.
interface PatriciaNode {
  label: string;         // the bit-string on the edge leading to this node
  prefix: string | null; // non-null if this node is a route endpoint
  len: number | null;
  nextHop: string | null;
  children: [PatriciaNode | null, PatriciaNode | null];
}

function buildPatricia(routes: CompressibleRoute[]): PatriciaNode {
  // Step 1 — build a raw bit-level trie
  interface RawNode { bit: string; prefix: string | null; len: number | null; nextHop: string | null; children: [RawNode | null, RawNode | null] }
  const root: RawNode = { bit: "", prefix: null, len: null, nextHop: null, children: [null, null] };
  for (const r of routes) {
    let node = root;
    for (let i = 0; i < r.len; i++) {
      const b = parseInt(r.binary[i], 10) as 0 | 1;
      if (!node.children[b]) {
        node.children[b] = { bit: r.binary[i], prefix: null, len: null, nextHop: null, children: [null, null] };
      }
      // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
      node = node.children[b]!;
    }
    node.prefix = r.prefix;
    node.len = r.len;
    node.nextHop = r.nextHop;
  }

  // Step 2 — compress: collapse any internal node that has exactly one child
  // and is NOT a route endpoint into its child.
  function compressNode(raw: RawNode, edgeLabel: string): PatriciaNode {
    const childCount = (raw.children[0] ? 1 : 0) + (raw.children[1] ? 1 : 0);
    // If this node has exactly one child and is not an endpoint, merge downward
    if (childCount === 1 && raw.prefix === null) {
      const onlyChild = (raw.children[0] ?? raw.children[1]) as RawNode;
      const childBit = raw.children[0] ? "0" : "1";
      return compressNode(onlyChild, edgeLabel + childBit);
    }
    // Otherwise, create a patricia node and recurse into children
    const pNode: PatriciaNode = {
      label: edgeLabel,
      prefix: raw.prefix,
      len: raw.len,
      nextHop: raw.nextHop,
      children: [null, null],
    };
    if (raw.children[0]) pNode.children[0] = compressNode(raw.children[0], "0");
    if (raw.children[1]) pNode.children[1] = compressNode(raw.children[1], "1");
    return pNode;
  }

  return compressNode(root, "*");
}

function countPatriciaNodes(node: PatriciaNode | null): number {
  if (!node) return 0;
  return 1 + countPatriciaNodes(node.children[0]) + countPatriciaNodes(node.children[1]);
}

function PatriciaVis({ node, isRoot = true }: { node: PatriciaNode; isRoot?: boolean }) {
  const left = node.children[0];
  const right = node.children[1];
  const hasChildren = left || right;
  const isEndpoint = node.prefix !== null;

  const nodeEl = (
    <div
      className={cx(
        "px-2 py-1 rounded-md flex flex-col items-center text-xs font-mono border-2 transition-all min-w-[2.5rem]",
        isEndpoint
          ? "bg-green-100 dark:bg-green-900/50 border-green-500 text-green-800 dark:text-green-300"
          : "bg-gray-100 dark:bg-gray-800 border-gray-300 dark:border-gray-600 text-gray-600 dark:text-gray-400"
      )}
      title={isEndpoint ? `${node.prefix}/${node.len} → ${node.nextHop}` : `edge: ${node.label}`}
    >
      <span className="font-bold">{node.label}</span>
      {isEndpoint && (
        <span className="text-[9px] text-green-700 dark:text-green-400 whitespace-nowrap">
          /{node.len}
        </span>
      )}
    </div>
  );

  if (!hasChildren) {
    return (
      <div className="flex flex-col items-center">
        {!isRoot && <div className="w-px h-5 bg-gray-400 dark:bg-gray-500" />}
        {nodeEl}
      </div>
    );
  }

  // Two children: draw a ┬ shaped connector
  // One child: draw a straight vertical line
  const bothChildren = left && right;

  return (
    <div className="flex flex-col items-center">
      {/* Vertical line from parent above to this node */}
      {!isRoot && <div className="w-px h-5 bg-gray-400 dark:bg-gray-500" />}
      {nodeEl}
      {/* Vertical stem down from node */}
      <div className="w-px h-5 bg-gray-400 dark:bg-gray-500" />
      {bothChildren ? (
        <>
          {/* Horizontal bar spanning both children */}
          <div className="flex w-full">
            <div className="w-1/2 border-b-2 border-r border-gray-400 dark:border-gray-500 h-0" />
            <div className="w-1/2 border-b-2 border-l border-gray-400 dark:border-gray-500 h-0" />
          </div>
          {/* Children side by side */}
          <div className="flex w-full">
            <div className="flex-1 flex flex-col items-center">
              <PatriciaVis node={left} isRoot={false} />
            </div>
            <div className="flex-1 flex flex-col items-center">
              <PatriciaVis node={right} isRoot={false} />
            </div>
          </div>
        </>
      ) : (
        /* Single child — straight line down */
        <PatriciaVis node={(left ?? right) as PatriciaNode} isRoot={false} />
      )}
    </div>
  );
}

export function PrefixCompression() {
  const [scenario, setScenario] = useState<string>("Adjacent Aggregation");
  const [showCompressed, setShowCompressed] = useState(false);

  const routes = COMPRESSION_SCENARIOS[scenario];
  const { compressed, steps } = useMemo(() => compress(routes), [routes]);

  const originalTrie = useMemo(() => buildPatricia(routes), [routes]);
  const compressedTrie = useMemo(() => buildPatricia(compressed), [compressed]);

  const originalNodes = countPatriciaNodes(originalTrie);
  const compressedNodes = countPatriciaNodes(compressedTrie);
  const savings = routes.length - compressed.length;

  const displayRoutes = showCompressed ? compressed : routes;
  const displayTrie = showCompressed ? compressedTrie : originalTrie;

  return (
    <div className={cx("my-6 p-4 border rounded-lg", "bg-gray-50 dark:bg-gray-900 dark:border-gray-700")}>
      {/* Scenario selector */}
      <div className="flex flex-wrap gap-3 items-center mb-4">
        <label className="text-sm font-semibold">Scenario:</label>
        <select
          value={scenario}
          onChange={(e) => { setScenario(e.target.value); setShowCompressed(false); }}
          className={cx(
            "px-3 py-1.5 border rounded text-sm",
            "bg-white dark:bg-gray-800 dark:border-gray-600 dark:text-gray-100"
          )}
        >
          {Object.keys(COMPRESSION_SCENARIOS).map((s) => (
            <option key={s} value={s}>{s}</option>
          ))}
        </select>
        <button
          onClick={() => setShowCompressed(!showCompressed)}
          className={cx(
            "px-4 py-1.5 rounded font-semibold text-sm transition-colors",
            showCompressed
              ? "bg-green-600 text-white hover:bg-green-700"
              : "bg-blue-600 text-white hover:bg-blue-700"
          )}
        >
          {showCompressed ? "Show Original" : "Compress"}
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Route table */}
        <div>
          <h4 className="text-sm font-semibold mb-2">
            {showCompressed ? "Compressed" : "Original"} Routing Table
            <span className="ml-2 text-xs font-normal text-gray-500">
              ({displayRoutes.length} {displayRoutes.length === 1 ? "entry" : "entries"})
            </span>
          </h4>
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="text-left border-b dark:border-gray-700">
                  <th className="py-1 pr-2">Prefix</th>
                  <th className="py-1 pr-2">Binary (prefix bits shown)</th>
                  <th className="py-1">Next Hop</th>
                </tr>
              </thead>
              <tbody>
                {displayRoutes
                  .sort((a, b) => a.binary.localeCompare(b.binary) || a.len - b.len)
                  .map((r, i) => (
                  <tr key={i} className="border-b dark:border-gray-800">
                    <td className="py-1.5 pr-2 font-mono">{r.prefix}/{r.len}</td>
                    <td className="py-1.5 pr-2">{binaryToDisplay(r.binary, r.len)}</td>
                    <td className="py-1.5 font-mono">{r.nextHop}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Trie visualization */}
        <div>
          <h4 className="text-sm font-semibold mb-2">
            Binary Trie
            <span className="ml-2 text-xs font-normal text-gray-500">
              ({(showCompressed ? compressedNodes : originalNodes)} nodes)
            </span>
          </h4>
          <div className={cx(
            "p-3 rounded border overflow-x-auto flex justify-center",
            "bg-white dark:bg-gray-800 dark:border-gray-700"
          )}>
            <PatriciaVis node={displayTrie} />
          </div>
        </div>
      </div>

      {/* Compression steps */}
      {showCompressed && steps.length > 0 && (
        <div className="mt-4">
          <h4 className="text-sm font-semibold mb-2">Compression Steps</h4>
          <div className="space-y-2">
            {steps.map((step, i) => (
              <div
                key={i}
                className={cx(
                  "flex flex-wrap items-center gap-2 text-xs p-2 rounded",
                  "bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800"
                )}
              >
                <span className="font-mono">
                  {step.from[0].prefix}/{step.from[0].len}
                </span>
                <span className="text-gray-400">+</span>
                <span className="font-mono">
                  {step.from[1].prefix}/{step.from[1].len}
                </span>
                <span className="text-blue-600 dark:text-blue-400 font-bold">&rarr;</span>
                <span className="font-mono font-bold text-green-700 dark:text-green-400">
                  {step.to.prefix}/{step.to.len}
                </span>
                <span className="text-gray-500">
                  (same next hop: {step.to.nextHop})
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Summary stats */}
      {showCompressed && (
        <div className={cx(
          "mt-4 p-3 rounded text-sm",
          savings > 0
            ? "bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800"
            : "bg-gray-100 dark:bg-gray-800 border border-gray-200 dark:border-gray-700"
        )}>
          {savings > 0 ? (
            <p>
              <strong className="text-green-700 dark:text-green-400">
                Saved {savings} TCAM {savings === 1 ? "entry" : "entries"}
              </strong>
              {" "}({routes.length} &rarr; {compressed.length}).
              Trie nodes reduced from {originalNodes} to {compressedNodes}.
              {" "}Fewer entries = less power, less heat, more room for other routes.
            </p>
          ) : (
            <p>No compression possible. Routes have different next hops or are not adjacent siblings.</p>
          )}
        </div>
      )}
    </div>
  );
}
