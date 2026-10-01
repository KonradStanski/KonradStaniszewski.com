import { useMemo, useState } from "react";
import { EXAMPLE, HOUSEHOLDS, PRODUCTS, SCENARIOS, breakEven, cashFlow, penalty, simulate, type Budget, type Loan, type Result, type Scenario } from "./mortgage-choice/model";
import { CostBars, Figure, Legend, Plot, Table, money, type Series } from "./mortgage-choice/charts";
import styles from "./mortgage-choice/MortgageRatePlanner.module.css";

const fixedExample = simulate(EXAMPLE, "fixed", "flat");
const paths = ["4% throughout", "4% → 3% in month 13", "4% → 3% in month 49", "4% → 6% in month 13", "4% → 6% → 4%"];
const outcomes = SCENARIOS.map((s, i) => ({ ...s, result: simulate(EXAMPLE, "adjustable", s.key), path: paths[i] }));
const thresholdMonths = Array.from({ length: 55 }, (_, i) => i + 1);
const thresholds: Series[] = [4, 5].map((variable, i) => ({
  label: `Variable starts at ${variable.toFixed(1)}%`, colour: PRODUCTS[i].colour, dash: PRODUCTS[i].dash,
  points: thresholdMonths.flatMap(month => { const rate = breakEven({ ...EXAMPLE, variable }, month); return rate === null ? [] : [{ x: month, y: rate }]; }),
}));
function Tabs<T extends string>({ items, selected, onChange, label }: { items: { key: T; label: string }[] | readonly { key: T; label: string }[]; selected: T; onChange: (key: T) => void; label: string }) {
  return <div className={styles.tabs} role="group" aria-label={label}>{items.map(item => <button type="button" key={item.key} aria-pressed={item.key === selected} onClick={() => onChange(item.key)}>{item.label}</button>)}</div>;
}
function paymentSeries(results: Result[]): Series[] {
  return results.map(r => ({ ...PRODUCTS.find(p => p.key === r.kind)!, points: r.rows.flatMap((row, i) => [{ x: i, y: row.payment }, { x: i + 1, y: row.payment }]) }));
}
function Mechanics() {
  return <Figure number="1" title="When the variable rate rises, where does the increase go?" caption="A fixed rate protects the current term. Variable contracts transmit the change through payments or through principal repayment; trigger provisions can interrupt a fixed-payment arrangement.">
    <div className={styles.mechanics}>
      <div className={styles.mechanism} style={{ borderColor: PRODUCTS[0].colour }}><h4>Fixed rate</h4><p>Market rates rise</p><div className={styles.arrow} aria-hidden="true">↓</div><p>Your contracted rate and payment stay unchanged.</p><div className={styles.arrow} aria-hidden="true">↓</div><p>The new rate matters at renewal.</p></div>
      <div className={styles.mechanism} style={{ borderColor: PRODUCTS[1].colour }}><h4>Adjustable payment</h4><p>Your variable rate rises</p><div className={styles.arrow} aria-hidden="true">↓</div><p>Your payment increases to stay on schedule.</p><div className={styles.arrow} aria-hidden="true">↓</div><p>Less cash is available each month.</p></div>
      <div className={styles.mechanism} style={{ borderColor: PRODUCTS[2].colour }}><h4>Fixed-payment variable</h4><p>Your variable rate rises</p><div className={styles.arrow} aria-hidden="true">↓</div><p>More interest; less principal repaid.</p><div className={styles.arrow} aria-hidden="true">↓</div><p>A larger balance, or a required payment change.</p></div>
    </div>
  </Figure>;
}
function Outcomes() {
  const [scenario, setScenario] = useState<Scenario>("rise");
  const current = outcomes.find(s => s.key === scenario)!;
  const series = paymentSeries([fixedExample, current.result]);
  return <Figure number="2" title="The date of a rate change can matter as much as its size" caption="Hypothetical $600,000 mortgage; 25-year amortization; 60 monthly payments. Fixed is 4.5%; variable starts at 4%. No fees or prepayments. Both use semi-annual compounding. Negative cost differences favour variable. These paths have no assigned probabilities. Tables give the exact comparisons; charts scroll on narrow screens.">
    <CostBars rows={outcomes.map(s => ({ label: s.label, path: s.path, delta: s.result.interest - fixedExample.interest }))} />
    <Table label="Five-year outcomes for fixed and adjustable-payment variable" headers={["Mortgage / path", "Interest", "Peak / month", "Balance after 5 years"]} rows={[["Fixed, 4.5%", money(fixedExample.interest), money(fixedExample.peak), money(fixedExample.balance)], ...outcomes.map(s => [s.label, money(s.result.interest), money(s.result.peak), money(s.result.balance)])]} />
    <h4>What happens to the monthly payment?</h4><Tabs items={SCENARIOS} selected={scenario} onChange={setScenario} label="Payment rate path" />
    <p className={styles.note} aria-live="polite">{current.detail} Peak variable payment: {money(current.result.peak)} a month.</p>
    <Legend series={series} /><Plot series={series} label={`${current.label}: fixed and adjustable monthly payments`} yLabel="Monthly mortgage payment" yMin={0} yMax={4500} marker={{ x: scenario === "late" ? 48 : 12, label: scenario === "flat" ? "Year 1 ends" : "Before rate change" }} />
  </Figure>;
}
function Thresholds() {
  return <Figure number="3" title="What rate would make the two offers break even?" caption="Each point solves for one new variable rate, beginning in the labelled month and held until month 60. Below the line, variable incurs less interest; above it, fixed does. Fixed stays at 4.5%. All other assumptions match Figure 2. The 5% starting-rate curve stops when even a cut to zero cannot recover the earlier interest. This is a sensitivity calculation, not a forecast or a market-implied rate path.">
    <Legend series={thresholds} /><Plot series={thresholds} label="Break-even variable rate by timing of a single rate change" yLabel="Variable rate after the change" format={n => `${n.toFixed(1)}%`} xMax={55} yMin={0} yMax={10} xTicks={[1, 13, 25, 37, 49, 55]} />
    <Table label="Break-even rates for selected change dates" headers={["Rate changes in", "Starts at 4%", "Starts at 5%"]} rows={[13, 25, 37, 49].map(m => [`Month ${m}`, ...[4, 5].map(variable => { const r = breakEven({ ...EXAMPLE, variable }, m); return r === null ? "No break-even at 0–20%" : `${r.toFixed(2)}%`; })])} />
  </Figure>;
}
function Households() {
  const [key, setKey] = useState("leave");
  const household = HOUSEHOLDS.find(h => h.key === key)!;
  const projections = PRODUCTS.slice(0, 2).map(p => ({ product: p, cash: cashFlow(simulate(EXAMPLE, p.key, household.scenario, { months: 36 }), household.budget) }));
  const series = projections.map(({ product, cash }) => ({ ...product, points: cash.rows.map(r => ({ x: r.month, y: r.funding })) }));
  const b = household.budget;
  return <Figure number="4" title="Can the household get through the expensive months?" caption="36-month cash-flow illustrations using the same mortgage offers. Non-mortgage expenses include housing costs and other debts. All surplus stays in cash and earns no interest. The line below zero is cumulative funding needed, not an assumed overdraft; mortgage schedules after a shortfall are conditional on finding that funding. The shaded period marks lower income.">
    <Tabs items={HOUSEHOLDS} selected={key} onChange={setKey} label="Household situation" />
    <p className={styles.note}>{household.description}</p><p className={styles.note}>Starting cash: {money(b.reserve)} · Monthly take-home: {money(b.income)} · Other expenses: {money(b.expenses)}</p>
    <Legend series={series} /><Plot series={series} label={`${household.label}: cash reserves and unmet funding need`} yLabel="Cash remaining / funding gap below zero" xMax={36} band={b.loss ? { from: b.start - 1, to: Math.min(36, b.start + b.duration - 1), label: "Lower income" } : undefined} />
    <div aria-live="polite"><Table label="Household cash outcomes over 36 months" headers={["Mortgage", "Lowest cash", "First shortfall", "Extra funding needed"]} rows={projections.map(({ product, cash }) => [product.label, money(cash.minimumCash), cash.firstShortfall ? `Month ${cash.firstShortfall}` : "None", money(cash.fundingNeeded)])} /></div>
  </Figure>;
}
function Renewal() {
  const results = PRODUCTS.map(p => simulate(EXAMPLE, p.key, "flat", { months: 61, renewalRate: 5.5, rateAt: m => m < 13 ? 4 : 5.5 }));
  const balances = results.map(r => ({ ...PRODUCTS.find(p => p.key === r.kind)!, points: [{ x: 0, y: EXAMPLE.principal }, ...r.rows.slice(0, 60).map(row => ({ x: row.month, y: row.balance }))] }));
  return <Figure number="5" title="A level payment can leave more debt at renewal" caption="Variable rises from 4% to 5.5% in month 13. The held payment still covers interest in this example, so no trigger reset occurs. At month 61, all three mortgages use 5.5% and the original remaining amortization of 20 years. The balance chart uses a truncated vertical axis to show the differences.">
    <Legend series={PRODUCTS} /><Plot series={paymentSeries(results)} label="Monthly payments before and at renewal" yLabel="Monthly mortgage payment" xMax={61} yMin={0} yMax={4500} marker={{ x: 60, label: "Renewal" }} xTicks={[0, 12, 24, 36, 48, 61]} />
    <Plot series={balances} label="Mortgage balances through five years" yLabel="Remaining mortgage balance" yMin={500000} yMax={610000} />
    <Table label="Balances and payments at the first renewal" headers={["Mortgage", "Balance at month 60", "Payment in month 60", "Payment in month 61"]} rows={results.map(r => [PRODUCTS.find(p => p.key === r.kind)!.label, money(r.rows[59].balance), money(r.rows[59].payment), money(r.rows[60].payment)])} />
  </Figure>;
}
function NumberField({ label, value, onChange, min = 0, max = 10_000_000, step = 100 }: { label: string; value: number; onChange: (n: number) => void; min?: number; max?: number; step?: number }) {
  return <label>{label}<input type="number" min={min} max={max} step={step} value={value} onChange={e => { const n = Number(e.target.value); if (Number.isFinite(n)) onChange(Math.min(max, Math.max(min, n))); }} /></label>;
}
function Exit() {
  const [month, setMonth] = useState(24);
  const [renewal, setRenewal] = useState(5.5);
  const [comparison, setComparison] = useState(3);
  const choices = [
    { label: "5-year fixed at 4.5%", kind: "fixed" as const, loan: EXAMPLE, term: 60 },
    { label: "3-year fixed at 4.3%", kind: "fixed" as const, loan: { ...EXAMPLE, fixed: 4.3 }, term: 36 },
    { label: "Variable: 4%, then 3%", kind: "adjustable" as const, loan: EXAMPLE, term: 60 },
  ];
  const rows = choices.map(c => {
    const result = simulate(c.loan, c.kind, "early", { months: month, termMonths: c.term, renewalRate: renewal });
    const charge = penalty(result, month, c.term, comparison);
    return [c.label, money(result.interest), money(charge), money(result.interest + charge), money(result.balance)];
  });
  return <Figure number="6" title="What if you sell before the term ends?" caption="Sale occurs after the selected month's payment. Fixed penalty is the greater of three months’ simple interest or balance × positive rate difference × years left. Variable penalty is three months’ simple interest. No penalty at term maturity. Actual lender formulas, discharge fees, portability, and legal costs can differ. Principal repaid is excluded from borrowing cost; remaining debt is shown separately.">
    <div className={styles.inputs}><label>Sell after month {month}<input aria-label="Sale month" type="range" min="12" max="60" value={month} onChange={e => setMonth(Number(e.target.value))} /></label><NumberField label="3-year fixed renewal rate (%)" value={renewal} onChange={setRenewal} max={15} step={0.1} /><NumberField label="Penalty comparison rate (%)" value={comparison} onChange={setComparison} max={15} step={0.1} /></div>
    <p className={styles.note}>The three-year fixed renews in month 37 at the selected rate. Variable falls to 3% in month 13. The penalty comparison rate is an independent assumption.</p>
    <div aria-live="polite"><Table label={`Borrowing and exit costs for a sale in month ${month}`} headers={["Mortgage", "Interest", "Exit penalty", "Combined cost", "Debt to repay"]} rows={rows} /></div>
  </Figure>;
}
function Calculator() {
  const [loan, setLoan] = useState(EXAMPLE);
  const [budget, setBudget] = useState<Budget>({ ...HOUSEHOLDS[1].budget });
  const [scenario, setScenario] = useState<Scenario>("rise");
  const [exit, setExit] = useState(60);
  const [comparison, setComparison] = useState(3);
  const results = useMemo(() => PRODUCTS.map(p => {
    const result = simulate(loan, p.key, scenario, { months: exit });
    return { product: p, result, cash: cashFlow(result, budget), fee: penalty(result, exit, 60, comparison) };
  }), [loan, budget, scenario, exit, comparison]);
  const updateLoan = (key: keyof Loan, value: number) => setLoan(l => ({ ...l, [key]: value }));
  const updateBudget = (key: keyof Budget, value: number) => setBudget(b => ({ ...b, [key]: value, loss: key === "income" ? Math.min(b.loss, value) : key === "loss" ? Math.min(value, b.income) : b.loss }));
  const cashSeries = results.map(({ product, cash }) => ({ ...product, points: cash.rows.map(r => ({ x: r.month, y: r.funding })) }));
  return <Figure number="7" title="Put your own offers and budget through the same test" caption="All products have a five-year term. The selected holding period is an exit at the end of that month. Rates follow the selected illustrative path, using your starting quote. All surplus is saved; no investment return, inflation, fees beyond the estimated exit penalty, or discretionary prepayments are assumed. If savings run out, results identify the funding gap rather than assuming access to credit. This is an educational comparison, not a lender quote.">
    <fieldset><legend>Your mortgage offers</legend><div className={styles.inputs}>
      <NumberField label="Mortgage balance ($)" value={loan.principal} onChange={v => updateLoan("principal", v)} step={10000} />
      <NumberField label="Remaining amortization (years)" value={loan.years} onChange={v => updateLoan("years", v)} min={5} max={40} step={1} />
      <NumberField label="Fixed rate (%)" value={loan.fixed} onChange={v => updateLoan("fixed", v)} max={20} step={0.05} />
      <NumberField label="Variable rate today (%)" value={loan.variable} onChange={v => updateLoan("variable", v)} max={20} step={0.05} />
      <NumberField label="Holding period (months)" value={exit} onChange={v => setExit(Math.round(v))} min={1} max={60} step={1} />
      <NumberField label="Exit comparison rate (%)" value={comparison} onChange={setComparison} max={20} step={0.1} />
    </div></fieldset>
    <fieldset><legend>Your household, after tax</legend><div className={styles.inputs}>
      <NumberField label="Monthly take-home income ($)" value={budget.income} onChange={v => updateBudget("income", v)} />
      <NumberField label="Monthly expenses excluding mortgage ($)" value={budget.expenses} onChange={v => updateBudget("expenses", v)} />
      <NumberField label="Accessible cash reserves ($)" value={budget.reserve} onChange={v => updateBudget("reserve", v)} step={1000} />
      <NumberField label="Monthly income lost ($)" value={budget.loss} onChange={v => updateBudget("loss", v)} max={budget.income} />
      <NumberField label="Income loss starts in month" value={budget.start} onChange={v => updateBudget("start", Math.round(v))} min={1} max={60} step={1} />
      <NumberField label="Income loss lasts (months)" value={budget.duration} onChange={v => updateBudget("duration", Math.round(v))} max={60} step={1} />
    </div><p className={styles.note}>Include property tax, insurance, maintenance, food, childcare, other debt payments, and any savings contributions you intend to maintain. The income reduction is after tax and benefits.</p></fieldset>
    <Tabs items={SCENARIOS} selected={scenario} onChange={setScenario} label="Calculator rate path" />
    <p className={styles.note}>{SCENARIOS.find(s => s.key === scenario)!.detail}</p>
    <Legend series={PRODUCTS} /><Plot series={cashSeries} label="Your cash reserves and funding shortfall" yLabel="Cash remaining / funding gap below zero" xMax={exit} xTicks={[0, ...[12, 24, 36, 48].filter(m => m < exit), exit]} />
    <div aria-live="polite"><Table label="Your mortgage comparison" headers={["Outcome", ...PRODUCTS.map(p => p.label)]} rows={[
      ["Interest through exit", ...results.map(r => money(r.result.interest))],
      ["Estimated exit penalty", ...results.map(r => money(r.fee))],
      ["Interest + exit penalty", ...results.map(r => money(r.result.interest + r.fee))],
      ["Peak monthly payment", ...results.map(r => money(r.result.peak))],
      ["Remaining mortgage", ...results.map(r => money(r.result.balance))],
      ["Lowest cash before exit costs", ...results.map(r => money(r.cash.minimumCash))],
      ["First cash shortfall", ...results.map(r => r.cash.firstShortfall ? `Month ${r.cash.firstShortfall}` : "None")],
      ["Funding gap before exit costs", ...results.map(r => money(r.cash.fundingNeeded))],
      ["Trigger payment reset", ...results.map(r => r.product.key !== "held" ? "Not applicable" : r.result.firstReset ? `Month ${r.result.firstReset}` : "None")],
    ]} /></div>
    <p className={styles.note}>Cash excludes the mortgage payout and penalty at sale; those may be paid from sale proceeds, which are not modelled. For fixed-payment variable, this model raises the payment to restore the original amortization as soon as the old payment no longer covers interest. Check your lender’s actual trigger provisions.</p>
    <button className={styles.reset} type="button" onClick={() => { setLoan(EXAMPLE); setBudget({ ...HOUSEHOLDS[1].budget }); setScenario("rise"); setExit(60); setComparison(3); }}>Reset example</button>
  </Figure>;
}
export function MortgageRatePlanner({ section = "calculator" }: { section?: "mechanics" | "outcomes" | "thresholds" | "households" | "renewal" | "exit" | "calculator" }) {
  switch (section) {
    case "mechanics": return <Mechanics />;
    case "outcomes": return <Outcomes />;
    case "thresholds": return <Thresholds />;
    case "households": return <Households />;
    case "renewal": return <Renewal />;
    case "exit": return <Exit />;
    default: return <Calculator />;
  }
}
