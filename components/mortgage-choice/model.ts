export type Kind = "fixed" | "adjustable" | "held";
export const PRODUCTS: { key: Kind; label: string; colour: string; dash?: string }[] = [
  { key: "fixed", label: "Fixed rate", colour: "#2563eb" },
  { key: "adjustable", label: "Adjustable payment", colour: "#c45127", dash: "8 4" },
  { key: "held", label: "Fixed-payment variable", colour: "#087f73", dash: "3 4" },
];
export const SCENARIOS = [
  { key: "flat", label: "No change", detail: "Variable stays at its starting rate." },
  { key: "early", label: "Early cuts", detail: "Variable falls 1 percentage point in month 13 and stays there." },
  { key: "late", label: "Delayed cuts", detail: "Variable falls 1 percentage point in month 49 and stays there." },
  { key: "rise", label: "Sustained rise", detail: "Variable rises 2 percentage points in month 13 and stays there." },
  { key: "spike", label: "Temporary spike", detail: "Variable rises 2 percentage points in months 13–24, then returns to its starting rate." },
] as const;
export type Scenario = typeof SCENARIOS[number]["key"];
export type Loan = { principal: number; years: number; fixed: number; variable: number };
export const EXAMPLE: Loan = { principal: 600_000, years: 25, fixed: 4.5, variable: 4 };
export type Month = { month: number; rate: number; payment: number; interest: number; balance: number; reset: boolean };
export type Result = { kind: Kind; rows: Month[]; interest: number; paid: number; balance: number; peak: number; firstReset: number | null };

export function monthlyRate(rate: number) { return Math.pow(1 + rate / 200, 1 / 6) - 1; }
export function payment(balance: number, rate: number, months: number) {
  if (balance <= 0) return 0;
  const i = monthlyRate(rate);
  return i === 0 ? balance / Math.max(1, months) : balance * i / (1 - Math.pow(1 + i, -Math.max(1, months)));
}
export function scenarioRate(scenario: Scenario, start: number, month: number) {
  const delta = scenario === "early" && month >= 13 ? -1
    : scenario === "late" && month >= 49 ? -1
    : scenario === "rise" && month >= 13 ? 2
    : scenario === "spike" && month >= 13 && month <= 24 ? 2 : 0;
  return Math.max(0, start + delta);
}

/** Monthly payments in arrears. No intermediate rounding; all quotes use semi-annual compounding.
 * Held-payment policy: recast to remaining amortization if the payment no longer covers interest.
 * This explicit illustrative rule is NOT a representation of every lender's trigger provisions.
 */
export function simulate(loan: Loan, kind: Kind, scenario: Scenario, options: {
  months?: number; termMonths?: number; renewalRate?: number;
  rateAt?: (month: number) => number;
} = {}): Result {
  const months = options.months ?? 60;
  const term = options.termMonths ?? 60;
  let balance = loan.principal;
  let fixedRate = loan.fixed;
  const variableAt = options.rateAt ?? ((m: number) => scenarioRate(scenario, loan.variable, m));
  let scheduled = payment(balance, kind === "fixed" ? fixedRate : variableAt(1), loan.years * 12);
  const rows: Month[] = [];
  for (let month = 1; month <= months; month++) {
    const remaining = Math.max(1, loan.years * 12 - month + 1);
    const renewal = month > 1 && (month - 1) % term === 0;
    if (kind === "fixed" && renewal) fixedRate = options.renewalRate ?? loan.fixed;
    const rate = kind === "fixed" ? fixedRate : variableAt(month);
    const interest = balance * monthlyRate(rate);
    let reset = false;
    if (kind === "adjustable" || renewal || (kind === "held" && balance > 0 && interest >= scheduled)) {
      reset = kind === "held" && !renewal && interest >= scheduled && balance > 0;
      scheduled = payment(balance, rate, remaining);
    }
    const paid = Math.min(scheduled, balance + interest);
    balance = Math.max(0, balance + interest - paid);
    rows.push({ month, rate, payment: paid, interest, balance, reset });
  }
  return { kind, rows, interest: rows.reduce((s, r) => s + r.interest, 0),
    paid: rows.reduce((s, r) => s + r.payment, 0), balance,
    peak: Math.max(0, ...rows.map(r => r.payment)), firstReset: rows.find(r => r.reset)?.month ?? null };
}

export type Budget = { income: number; expenses: number; reserve: number; loss: number; start: number; duration: number };
export const HOUSEHOLDS: { key: string; label: string; description: string; budget: Budget; scenario: Scenario }[] = [
  { key: "buffer", label: "Large buffer", description: "Two steady incomes, no planned income reduction; rates rise.",
    budget: { income: 11_000, expenses: 6_000, reserve: 60_000, loss: 0, start: 7, duration: 12 }, scenario: "rise" },
  { key: "leave", label: "Parental leave", description: "Take-home income falls by $3,000 in months 7–18; rates rise in month 13. Expenses stay constant to isolate the income change.",
    budget: { income: 9_000, expenses: 5_200, reserve: 20_000, loss: 3_000, start: 7, duration: 12 }, scenario: "rise" },
  { key: "commission", label: "Weak earning year", description: "Commission income falls by $2,500 in months 7–18, overlapping with higher rates.",
    budget: { income: 9_500, expenses: 5_500, reserve: 25_000, loss: 2_500, start: 7, duration: 12 }, scenario: "rise" },
  { key: "recession", label: "Job loss + cuts", description: "Take-home income falls by $4,000 in months 7–18; variable rates fall in month 13. Income is net of any benefits.",
    budget: { income: 9_000, expenses: 5_200, reserve: 20_000, loss: 4_000, start: 7, duration: 12 }, scenario: "early" },
  { key: "retirement", label: "Retiring next year", description: "Take-home income falls permanently from $9,000 to $7,000 in month 13; non-mortgage expenses are $4,000 and rates rise.",
    budget: { income: 9_000, expenses: 4_000, reserve: 40_000, loss: 2_000, start: 13, duration: 60 }, scenario: "rise" },
];

/** Negative funding is an unmet need, NOT an assumed loan. Mortgage projection stays contractual. */
export function cashFlow(result: Result, budget: Budget) {
  let funding = budget.reserve;
  const rows = [{ month: 0, funding, cash: Math.max(0, funding) }];
  let firstShortfall: number | null = null;
  for (const r of result.rows) {
    const loss = r.month >= budget.start && r.month < budget.start + budget.duration ? budget.loss : 0;
    funding += budget.income - loss - budget.expenses - r.payment;
    if (funding < -0.005 && firstShortfall === null) firstShortfall = r.month;
    rows.push({ month: r.month, funding, cash: Math.max(0, funding) });
  }
  const minimumFunding = Math.min(...rows.map(r => r.funding));
  return { rows, firstShortfall, minimumCash: Math.max(0, minimumFunding), fundingNeeded: Math.max(0, -minimumFunding) };
}

/** Illustrative closed-mortgage payout charge after the selected month's payment. */
export function penalty(result: Result, exitMonth: number, termMonths: number, comparisonRate: number) {
  const row = result.rows[exitMonth - 1];
  if (!row || row.balance <= 0 || exitMonth % termMonths === 0) return 0;
  const threeMonths = row.balance * row.rate / 100 / 4;
  if (result.kind !== "fixed") return threeMonths;
  const remaining = termMonths - exitMonth % termMonths;
  return Math.max(threeMonths, row.balance * Math.max(0, row.rate - comparisonRate) / 100 * remaining / 12);
}

/** Constant rate after one change that equates 60-month interest to fixed. Null = no root in 0–20%. */
export function breakEven(loan: Loan, changeMonth: number) {
  const target = simulate(loan, "fixed", "flat").interest;
  const cost = (after: number) => simulate(loan, "adjustable", "flat", {
    rateAt: m => m < changeMonth ? loan.variable : after,
  }).interest;
  if (cost(0) > target || cost(20) < target) return null;
  let lo = 0, hi = 20;
  for (let i = 0; i < 45; i++) { const mid = (lo + hi) / 2; if (cost(mid) > target) hi = mid; else lo = mid; }
  return (lo + hi) / 2;
}
