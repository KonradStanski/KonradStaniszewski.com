import { useDeferredValue, useMemo, useState } from "react";
import {
  DebtConversionChart,
  FanChart,
  MortgagePaymentChart,
  OutcomeHeatmap,
  RidgelineChart,
  TemporalDensityChart,
  formatMoney,
} from "./smith-manoeuvre/charts";
import {
  DEFAULT_ASSUMPTIONS,
  SCENARIOS,
  createBasePath,
  createStressPath,
  marginalTaxRate,
  projectAll,
  simulateDistribution,
  type Assumptions,
  type ScenarioKey,
} from "./smith-manoeuvre/model";
import styles from "./smith-manoeuvre/SmithManoeuvrePlanner.module.css";

type NumberFieldProps = {
  id: keyof Assumptions;
  label: string;
  unit: string;
  value: number;
  min?: number;
  max?: number;
  step?: number;
  onChange: (key: keyof Assumptions, value: number) => void;
};

const NumberField = ({
  id,
  label,
  unit,
  value,
  min,
  max,
  step = 0.1,
  onChange,
}: NumberFieldProps) => (
  <div className={styles.numberField}>
    <label htmlFor={`smith-${id}`}>{label}</label>
    <div className={styles.inputWrap}>
      <input
        id={`smith-${id}`}
        inputMode="decimal"
        max={max}
        min={min}
        onChange={(event) => onChange(id, Number(event.target.value))}
        step={step}
        type="number"
        value={value}
      />
      <span className={styles.inputUnit}>{unit}</span>
    </div>
  </div>
);

type SidebarProps = {
  assumptions: Assumptions;
  onChange: (key: keyof Assumptions, value: number) => void;
  onReset: () => void;
  marginalRate: number;
  actualPurchaseYear: number | null;
};

const AssumptionSidebar = ({
  assumptions,
  onChange,
  onReset,
  marginalRate,
  actualPurchaseYear,
}: SidebarProps) => (
  <aside aria-label="Projection assumptions" className={styles.sidebar}>
    <div className={styles.sidebarInner}>
      <h2 className={styles.sidebarTitle}>Assumptions</h2>
      <div className={styles.inputGroups}>
        <section className={styles.inputGroup}>
          <h3>You</h3>
          <NumberField id="startingIncome" label="Gross income" min={0} onChange={onChange} step={5_000} unit="$" value={assumptions.startingIncome} />
          <NumberField id="incomeGrowth" label="Annual raise" min={-20} max={25} onChange={onChange} unit="%" value={assumptions.incomeGrowth} />
          <NumberField id="savingsRate" label="Savings rate" min={0} max={80} onChange={onChange} unit="%" value={assumptions.savingsRate} />
          <NumberField id="startingSavings" label="Starting savings" min={0} onChange={onChange} step={10_000} unit="$" value={assumptions.startingSavings} />
        </section>

        <section className={styles.inputGroup}>
          <h3>Housing</h3>
          <NumberField id="purchaseYear" label="Target buy year" min={1} max={20} onChange={onChange} step={1} unit="yr" value={assumptions.purchaseYear} />
          <NumberField id="homePrice" label="Home price today" min={100_000} onChange={onChange} step={25_000} unit="$" value={assumptions.homePrice} />
          <NumberField id="downPayment" label="Down payment" min={20} max={100} onChange={onChange} unit="%" value={assumptions.downPayment} />
          <NumberField id="mortgageRate" label="Mortgage rate" min={0} max={20} onChange={onChange} unit="%" value={assumptions.mortgageRate} />
          <NumberField id="amortizationYears" label="Amortization" min={5} max={30} onChange={onChange} step={1} unit="yr" value={assumptions.amortizationYears} />
          <NumberField id="homeAppreciation" label="Home appreciation" min={-10} max={15} onChange={onChange} unit="%" value={assumptions.homeAppreciation} />
          <NumberField id="rentMonthly" label="Comparable rent" min={0} onChange={onChange} step={100} unit="/mo" value={assumptions.rentMonthly} />
          <NumberField id="rentGrowth" label="Rent growth" min={-5} max={15} onChange={onChange} unit="%" value={assumptions.rentGrowth} />
          <NumberField id="propertyTaxRate" label="Property tax" min={0} max={5} onChange={onChange} step={0.01} unit="%" value={assumptions.propertyTaxRate} />
          <NumberField id="maintenanceRate" label="Maintenance reserve" min={0} max={10} onChange={onChange} unit="%" value={assumptions.maintenanceRate} />
        </section>

        <section className={styles.inputGroup}>
          <h3>Markets</h3>
          <NumberField id="equityReturn" label="Equity return" min={-5} max={20} onChange={onChange} unit="%" value={assumptions.equityReturn} />
          <NumberField id="equityVolatility" label="Equity volatility" min={1} max={50} onChange={onChange} unit="%" value={assumptions.equityVolatility} />
          <NumberField id="homeVolatility" label="Home volatility" min={1} max={35} onChange={onChange} unit="%" value={assumptions.homeVolatility} />
          <NumberField id="distributionYield" label="Taxable distributions" min={0} max={10} onChange={onChange} unit="%" value={assumptions.distributionYield} />
          <NumberField id="cashReturn" label="Down-payment cash return" min={0} max={12} onChange={onChange} unit="%" value={assumptions.cashReturn} />
          <NumberField id="inflation" label="Inflation" min={0} max={12} onChange={onChange} unit="%" value={assumptions.inflation} />
          <NumberField id="simulationTrials" label="Monte Carlo paths" min={120} max={2400} onChange={onChange} step={120} unit="paths" value={assumptions.simulationTrials} />
        </section>

        <section className={styles.inputGroup}>
          <h3>Smith</h3>
          <NumberField id="helocRate" label="HELOC rate" min={0} max={25} onChange={onChange} unit="%" value={assumptions.helocRate} />
          <NumberField id="smithReborrowRate" label="Principal reborrowed" min={0} max={100} onChange={onChange} unit="%" value={assumptions.smithReborrowRate} />
          <NumberField id="taxRefundToMortgage" label="Tax refund recycled" min={0} max={100} onChange={onChange} unit="%" value={assumptions.taxRefundToMortgage} />
          <NumberField id="horizon" label="Horizon" min={10} max={40} onChange={onChange} step={1} unit="yr" value={assumptions.horizon} />
        </section>
      </div>
      <button className={styles.resetButton} onClick={onReset} type="button">
        Reset assumptions
      </button>
      <p className={styles.sidebarFoot}>
        2026 federal + B.C. tax brackets · current marginal rate ≈ {Math.round(marginalRate * 100)}%
        <br />
        Base-case home purchase: {actualPurchaseYear === null ? "not reached" : `year ${actualPurchaseYear}`}.
      </p>
    </div>
  </aside>
);

const HeroFlow = () => (
  <section className={styles.hero}>
    <div className={styles.heroCopy}>
      <h1>Modeling the Smith Manoeuvre in Canada</h1>
      <p>
        A Smith Manoeuvre uses the home equity created by each mortgage payment to
        fund a taxable investment portfolio. A readvanceable mortgage restores one
        dollar of home equity line of credit (HELOC) room for every dollar of principal
        repaid. The homeowner borrows that dollar again, invests it, and repeats.
      </p>
      <p>
        The three scenarios use different leverage. Rent + index uses no debt. Home +
        mortgage uses mortgage debt to leverage the home. Smith + index uses mortgage
        debt for the home and HELOC debt for the index portfolio. Its incremental gain
        over conventional home ownership depends on the borrowed portfolio earning more
        after tax than the HELOC costs after tax.
      </p>
    </div>
    <div className={styles.flow} aria-label="Housing, debt, and investment exposure in each strategy">
      <div className={styles.flowHeader}>
        <span>Same income<br />and spending</span>
        <span>Housing</span>
        <span>Debt</span>
        <span>Investment funding</span>
      </div>
      <div className={`${styles.flowRow} ${styles.rentColor}`}>
        <div className={styles.flowLabel}>
          <span className={styles.flowNumber}>01</span>
          Rent + index
        </div>
        <div className={styles.flowNode}>Rent a home</div>
        <div className={styles.flowNode}>No mortgage or investment loan</div>
        <div className={styles.flowNode}>Index purchases funded from savings</div>
      </div>
      <div className={`${styles.flowRow} ${styles.homeColor}`}>
        <div className={styles.flowLabel}>
          <span className={styles.flowNumber}>02</span>
          Home + mortgage
        </div>
        <div className={styles.flowNode}>Own a home</div>
        <div className={styles.flowNode}>Mortgage debt secured by the home</div>
        <div className={styles.flowNode}>Index purchases funded from surplus savings</div>
      </div>
      <div className={`${styles.flowRow} ${styles.smithColor}`}>
        <div className={styles.flowLabel}>
          <span className={styles.flowNumber}>03</span>
          Smith + index
        </div>
        <div className={styles.flowNode}>Own the same home</div>
        <div className={styles.flowNode}>Mortgage debt plus HELOC investment debt</div>
        <div className={styles.flowNode}>Savings and reborrowed principal fund the index</div>
      </div>
      <div className={styles.flowFoot}>
        <span />
        <span>Rent is an expense. Owners gain or lose with the home price.</span>
        <span>Debt creates leverage and fixed interest costs.</span>
        <span>Every index portfolio receives the same market returns.</span>
      </div>
    </div>
  </section>
);

const Progress = ({ active }: { active: 1 | 2 | 3 }) => (
  <nav aria-label="Article sections" className={styles.progress}>
    <span className={active === 1 ? styles.active : ""} data-number="1">How it works</span>
    <span className={active === 2 ? styles.active : ""} data-number="2">Projections</span>
    <span className={active === 3 ? styles.active : ""} data-number="3">Risk and sensitivity</span>
  </nav>
);

export const SmithManoeuvrePlanner = () => {
  const [assumptions, setAssumptions] = useState(DEFAULT_ASSUMPTIONS);
  const deferredAssumptions = useDeferredValue(assumptions);
  const [selectedScenario, setSelectedScenario] = useState<ScenarioKey>("smith");
  const [stress, setStress] = useState(false);
  const [hoverYear, setHoverYear] = useState(Math.round(DEFAULT_ASSUMPTIONS.horizon * 0.55));
  const [heatmapHorizon, setHeatmapHorizon] = useState(30);

  const distribution = useMemo(
    () => simulateDistribution(deferredAssumptions, stress),
    [deferredAssumptions, stress]
  );
  const fan = distribution.fan;
  const baseProjection = useMemo(
    () => projectAll(deferredAssumptions, createBasePath(deferredAssumptions)),
    [deferredAssumptions]
  );
  const displayedProjection = useMemo(
    () =>
      projectAll(
        deferredAssumptions,
        stress
          ? createStressPath(deferredAssumptions)
          : createBasePath(deferredAssumptions)
      ),
    [deferredAssumptions, stress]
  );
  const currentMarginalRate = marginalTaxRate(
    deferredAssumptions.startingIncome,
    0,
    deferredAssumptions.inflation
  );
  const afterTaxDebtCost =
    (deferredAssumptions.helocRate / 100) * (1 - currentMarginalRate);
  const exampleHelocBalance = 200_000;
  const exampleAnnualInterest =
    exampleHelocBalance * (deferredAssumptions.helocRate / 100);
  const exampleTaxReduction = exampleAnnualInterest * currentMarginalRate;
  const exampleAfterTaxInterest = exampleAnnualInterest - exampleTaxReduction;
  const expectedReturnSpread =
    deferredAssumptions.equityReturn / 100 - afterTaxDebtCost;
  const expectedSpreadDollars = exampleHelocBalance * expectedReturnSpread;
  const finalYear = Math.round(deferredAssumptions.horizon);
  const finalFan = SCENARIOS.map((scenario) => ({
    ...scenario,
    point: fan[scenario.key][finalYear] ?? fan[scenario.key][fan[scenario.key].length - 1],
  })).sort((a, b) => b.point.p50 - a.point.p50);
  const leading = finalFan[0];
  const runnerUp = finalFan[1];
  const purchaseYear = baseProjection.home.actualPurchaseYear;

  const updateAssumption = (key: keyof Assumptions, value: number) => {
    setAssumptions((current) => ({ ...current, [key]: Number.isFinite(value) ? value : 0 }));
    if (key === "horizon") {
      setHoverYear(Math.min(Math.round(value * 0.55), Math.round(value)));
      const available = [10, 20, 30].filter((year) => year <= Math.round(value));
      setHeatmapHorizon((current) =>
        available.includes(current) ? current : available[available.length - 1] ?? 10
      );
    }
  };

  return (
    <article className={`${styles.article} not-prose`}>
      <HeroFlow />

      <section className={styles.explanation} id="what-is-a-smith-manoeuvre">
        <h2>Leverage in each strategy</h2>
        <p>
          Rent + index holds an index portfolio funded entirely from savings and has no
          housing debt. Home + mortgage adds a leveraged property: the down payment buys
          the initial equity, and the mortgage finances the rest of the home. Its index
          portfolio still comes from surplus savings.
        </p>
        <p>
          Smith + index starts with the same leveraged home as Home + mortgage. It then
          adds a second leveraged position by reborrowing mortgage principal and buying
          index investments. Relative to conventional home ownership, the Smith strategy
          adds one asset, the borrowed portfolio, and one liability, the HELOC. Its
          incremental result is the portfolio’s after-tax return minus the HELOC’s
          after-tax financing cost, compounded over time.
        </p>

        <h3>Incremental Smith return versus conventional ownership</h3>
        <div className={styles.taxPrimer}>
          <div>
            <span className={styles.taxPrimerLabel}>Approximate annual tax saving</span>
            <code>deductible interest × marginal tax rate</code>
          </div>
          <div>
            <span className={styles.taxPrimerLabel}>Approximate after-tax HELOC cost</span>
            <code>HELOC rate × (1 − marginal tax rate)</code>
          </div>
        </div>

        <div className={styles.workedExample}>
          <dl>
            <div>
              <dt>HELOC balance</dt>
              <dd>{formatMoney(exampleHelocBalance, false)}</dd>
            </div>
            <div>
              <dt>Interest at {deferredAssumptions.helocRate.toFixed(2)}%</dt>
              <dd>{formatMoney(exampleAnnualInterest, false)} per year</dd>
            </div>
            <div>
              <dt>Estimated tax reduction at {Math.round(currentMarginalRate * 100)}%</dt>
              <dd>−{formatMoney(exampleTaxReduction, false)}</dd>
            </div>
            <div className={styles.workedExampleTotal}>
              <dt>Net annual interest cost</dt>
              <dd>{formatMoney(exampleAfterTaxInterest, false)}</dd>
            </div>
          </dl>
          <p>
            Assuming the full deduction is available, this effectively drops the
            borrowing rate from <strong>{deferredAssumptions.helocRate.toFixed(2)}%</strong> to{" "}
            <strong>{(afterTaxDebtCost * 100).toFixed(2)}%</strong>.
          </p>
        </div>

        <p>
          The model assumes a {deferredAssumptions.equityReturn.toFixed(1)}% nominal
          equity return. Compared with the {(afterTaxDebtCost * 100).toFixed(2)}%
          after-tax borrowing cost, that is a{" "}
          {Math.abs(expectedReturnSpread * 100).toFixed(2)} percentage-point expected{" "}
          {expectedReturnSpread >= 0 ? "spread" : "shortfall"} before tax and fees on
          the investment return. On a $200,000 balance, the difference is about{" "}
          {formatMoney(Math.abs(expectedSpreadDollars), false)} per year.{" "}
          {expectedReturnSpread >= 0
            ? "If that spread persists, the borrowed capital and its returns have more time to compound. This is how a Smith Manoeuvre can produce a higher net worth than a conventional mortgage when both portfolios earn the same market return. The stress scenarios below model years in which the spread turns negative."
            : "At these inputs, the after-tax borrowing cost exceeds the expected return."}
        </p>

        <p>
          For historical context, the MSCI ACWI returned 8.89% annualized on a
          gross-return basis in U.S. dollars from December 31, 1987 through July
          31, 2026. The same series suffered a 58.06% maximum drawdown. The model uses
          a lower default return of 6.5%. A long time horizon gives compounding and market
          recovery more time to work, while the HELOC interest remains payable during
          every downturn.
          Canadian-dollar returns will also differ because of currency movements.
          {" "}<a href="https://www.msci.com/documents/10199/255599/msci-acwi.pdf">MSCI ACWI factsheet</a>
        </p>

        <h3>When the interest may be deductible</h3>
        <p>
          The tax treatment depends on how each HELOC advance is used. If the money
          goes directly into a taxable account to buy investments with a reasonable
          expectation of producing income, such as dividends, interest, or fund
          distributions, the interest on that borrowing may be deductible on line 22100.
          The investments must have a reasonable prospect of producing income; expected
          capital appreciation by itself fails that test.
        </p>
        <p>
          The deduction reduces taxable income for the year. The portfolio’s dividends,
          distributions, and capital gains remain taxable under their usual rules. The
          deduction can exceed the income produced by the portfolio that year. CRA
          determines deductibility by tracing the borrowed money to its current use. A
          practical Smith setup therefore keeps HELOC advances separate from personal
          spending and sends them directly to a dedicated taxable investment account.
        </p>

        <h3>How one cycle works</h3>
        <ol className={styles.smithSteps}>
          <li>
            <strong>Make the mortgage payment.</strong>
            <span>The principal portion reduces the home mortgage.</span>
          </li>
          <li>
            <strong>Reborrow the principal.</strong>
            <span>A readvanceable mortgage adds the repaid principal to the HELOC limit.</span>
          </li>
          <li>
            <strong>Invest the HELOC advance.</strong>
            <span>Send it directly to a dedicated taxable investment account.</span>
          </li>
          <li>
            <strong>Claim eligible interest.</strong>
            <span>The deduction lowers taxable income if the legal tests continue to be met.</span>
          </li>
          <li>
            <strong>Optionally prepay and repeat.</strong>
            <span>Apply the tax saving to the mortgage, reborrow the new principal room, and invest again.</span>
          </li>
        </ol>

        <p className={styles.introSources}>
          Primary rules: <a href="https://laws-lois.justice.gc.ca/eng/acts/I-3.3/section-20.html">Income Tax Act, paragraph 20(1)(c)</a>,{" "}
          <a href="https://www.canada.ca/en/revenue-agency/services/tax/individuals/topics/about-your-tax-return/tax-return/completing-a-tax-return/deductions-credits-expenses/line-22100-carrying-charges-interest-expenses.html">CRA line 22100</a>, and{" "}
          <a href="https://www.canada.ca/en/revenue-agency/services/tax/technical-information/income-tax/income-tax-folios-index/series-3-property-investments-savings-plans/series-3-property-investments-savings-plan-folio-6-interest/income-tax-folio-s3-f6-c1-interest-deductibility.html">CRA Folio S3-F6-C1</a>.
        </p>
      </section>

      <div className={styles.modelGrid}>
        <main className={styles.mainColumn}>
          <Progress active={2} />
          <section className={styles.section} id="projections">
            <h2 className={styles.sectionTitle}>30-year projections</h2>
            <p className={styles.sectionLead}>
              The model runs the three plans through the same market paths. The charts
              show a range of outcomes, not one forecast. All values are after tax and in 2026 dollars.
            </p>
            <div className={styles.modelDefinition}>
              <h3>What the model tracks</h3>
              <p>
                For each year, the model tracks income, spending, cash, home value,
                mortgage debt, HELOC debt, investments, adjusted cost base, and tax.
              </p>
              <div className={styles.equationGrid}>
                <div className={styles.equationBlock}>
                  <code>C<sub>t</sub> = (1 − s)Y<sup>net</sup><sub>t</sub> − R<sub>t</sub></code>
                  <p>Every plan uses the same amount for non-housing spending.</p>
                </div>
                <div className={styles.equationBlock}>
                  <code>M<sub>m+1</sub> = M<sub>m</sub>(1 + i<sub>m</sub>) − P<sub>m</sub></code>
                  <p>The mortgage calculation separates interest from principal each month.</p>
                </div>
                <div className={styles.equationBlock}>
                  <code>D<sub>t</sub> = min(D<sub>t−1</sub> + ρQ<sub>t</sub>, 0.65H<sub>t</sub>, 0.80H<sub>t</sub> − M<sub>t</sub>)</code>
                  <p>The model applies the 65% HELOC limit and the 80% combined loan-to-value limit.</p>
                </div>
                <div className={styles.equationBlock}>
                  <code>NW<sub>t</sub> = V<sub>t</sub> − T<sup>sale</sup><sub>t</sub> + H<sub>t</sub>(1 − c) − M<sub>t</sub> − D<sub>t</sub></code>
                  <p>After-tax net worth assumes that the assets are sold at the end of the selected year.</p>
                </div>
              </div>
            </div>
            <div className={styles.projectionToolbar}>
              <div>
                <h3>Market paths</h3>
                <div className={styles.chartMeta}>
                  {stress ? "Every trial includes the same 2008-style shock." : "Each trial draws returns around the long-run inputs."}
                </div>
              </div>
              <div className={styles.scenarioToggle}>
                <button
                  className={`${styles.scenarioButton} ${!stress ? styles.scenarioButtonActive : ""}`}
                  onClick={() => setStress(false)}
                  type="button"
                >
                  Base distribution
                </button>
                <button
                  className={`${styles.scenarioButton} ${stress ? styles.scenarioButtonActive : ""}`}
                  onClick={() => setStress(true)}
                  type="button"
                >
                  2008-style shock
                </button>
              </div>
            </div>

            <table className={styles.outcomeTable}>
              <thead>
                <tr>
                  <th>Strategy</th>
                  <th>2.5th</th>
                  <th>10th percentile</th>
                  <th>Median</th>
                  <th>90th percentile</th>
                  <th>97.5th</th>
                  <th>Home purchase</th>
                </tr>
              </thead>
              <tbody>
                {SCENARIOS.map((scenario) => {
                  const point = fan[scenario.key][finalYear] ?? fan[scenario.key][fan[scenario.key].length - 1];
                  const modeledPurchase = displayedProjection[scenario.key].actualPurchaseYear;
                  return (
                    <tr key={scenario.key}>
                      <td>
                        <span className={styles.scenarioName} style={{ color: scenario.color }}>
                          <span className={styles.scenarioSwatch} />
                          {scenario.label}
                        </span>
                      </td>
                      <td>{formatMoney(point.p025)}</td>
                      <td>{formatMoney(point.p10)}</td>
                      <td><strong>{formatMoney(point.p50)}</strong></td>
                      <td>{formatMoney(point.p90)}</td>
                      <td>{formatMoney(point.p975)}</td>
                      <td>{scenario.key === "rent" ? "Not applicable" : modeledPurchase === null ? "Not reached" : `Year ${modeledPurchase}`}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>

            <FanChart
              fan={fan}
              horizon={deferredAssumptions.horizon}
              hoverYear={hoverYear}
              onHoverYear={setHoverYear}
              onSelect={setSelectedScenario}
              selected={selectedScenario}
              trials={distribution.trials}
            />
            <TemporalDensityChart distribution={distribution} horizon={deferredAssumptions.horizon} />
            <RidgelineChart distribution={distribution} horizon={deferredAssumptions.horizon} />
            <MortgagePaymentChart projection={displayedProjection} />
            <DebtConversionChart projection={displayedProjection} />
            <p className={styles.chartCaption}>
              With these inputs, {leading.label} has the highest median at age {deferredAssumptions.startAge + deferredAssumptions.horizon}. Its median is {formatMoney(leading.point.p50 - runnerUp.point.p50)} above {runnerUp.label}. Change the inputs to see when the ranking changes.
            </p>
          </section>

          <Progress active={3} />
          <section className={styles.section} id="sensitivity">
            <h2 className={styles.sectionTitle}>What changes the result</h2>
            <p className={styles.sectionLead}>
              The sensitivity map changes expected stock and home returns. The stress
              test changes markets, income, and borrowing costs at the same time.
            </p>
            <div className={styles.answerGrid}>
              <div>
                <div className={styles.heatmapHeader}>
                  <h3>Stock returns and home appreciation</h3>
                  <div className={styles.yearToggle}>
                    {[10, 20, 30].filter((year) => year <= deferredAssumptions.horizon).map((year) => (
                      <button
                        className={`${styles.yearButton} ${heatmapHorizon === year ? styles.yearButtonActive : ""}`}
                        key={year}
                        onClick={() => setHeatmapHorizon(year)}
                        type="button"
                      >
                        Year {year}
                      </button>
                    ))}
                  </div>
                </div>
                <OutcomeHeatmap assumptions={deferredAssumptions} horizon={heatmapHorizon} />
                <div className={styles.riskNote}>
                  <div aria-hidden="true" className={styles.riskIcon} />
                  <div>
                    <h3 className={styles.riskTitle}>Several risks can arrive in the same year</h3>
                    <p>
                      The stress path applies a 37% equity loss, a 15% home-price loss,
                      an income loss, and a two-point HELOC rate increase. This is not a worst case.
                    </p>
                  </div>
                </div>
              </div>

              <div>
                <h3 className={styles.taxTitle}>How much the deduction is worth</h3>
                <p className={styles.taxCopy}>
                  The model estimates a combined marginal tax rate of
                  <strong> {Math.round(currentMarginalRate * 100)}%</strong> at the input income.
                  The estimated after-tax HELOC cost is
                  <strong> {(afterTaxDebtCost * 100).toFixed(2)}%</strong>.
                </p>
                <div className={styles.equation}>
                  after-tax debt cost =<br />
                  HELOC rate × (1 − marginal tax rate)
                </div>
                <p className={styles.taxCopy}>
                  The estimate assumes that all HELOC interest remains deductible. The
                  Canada Revenue Agency requires a direct link to an eligible current use.
                </p>
                <ol className={styles.ledgerRules}>
                  <li className={styles.ledgerRule}>
                    <span className={styles.ledgerRuleNumber}>1</span>
                    <div>
                      <strong>Borrow only for eligible income-producing investments</strong>
                      <p>Borrowing for a TFSA, RRSP, or FHSA does not create deductible interest.</p>
                    </div>
                  </li>
                  <li className={styles.ledgerRule}>
                    <span className={styles.ledgerRuleNumber}>2</span>
                    <div>
                      <strong>Keep Smith debt and personal spending separate</strong>
                      <p>Use a dedicated borrowing sub-account and a dedicated non-registered investment account.</p>
                    </div>
                  </li>
                  <li className={styles.ledgerRule}>
                    <span className={styles.ledgerRuleNumber}>3</span>
                    <div>
                      <strong>Track the current use of every borrowed dollar</strong>
                      <p>Return-of-capital distributions and withdrawals can break the tracing chain if they are spent personally.</p>
                    </div>
                  </li>
                </ol>
              </div>
            </div>
          </section>

          <section className={styles.methodology} id="methodology">
            <div className={styles.methodDetail}>
              <h2>How the numbers are calculated</h2>
              <h3>Keeping spending equal</h3>
              <p>
                The renter invests the selected share of after-tax employment income.
                That rule defines the common non-housing consumption path.
              </p>
              <div className={styles.methodEquation}>
                C<sub>t</sub> = (1 − s)Y<sup>net</sup><sub>t</sub> − R<sub>t</sub>
              </div>
              <p>
                Each owner uses the same C<sub>t</sub>. The owner invests only the cash
                that remains after mortgage payments and ownership costs.
              </p>

              <h3>Calculating income tax</h3>
              <p>
                The engine applies indexed federal and British Columbia brackets.
                It also applies basic credits, CPP, CPP2, and EI.
              </p>
              <div className={styles.methodEquation}>
                T(y) = Σ<sub>k</sub> r<sub>k</sub> · max(0, min(y,b<sub>k</sub>) − b<sub>k−1</sub>) − credits
              </div>
              <p>
                The annual Smith tax saving is T(Y<sub>t</sub>) − T(Y<sub>t</sub> − I<sup>HELOC</sup><sub>t</sub>).
                The model does not use one fixed marginal rate for this calculation.
              </p>

              <h3>Simulating market returns</h3>
              <p>
                The simulation draws a new stock return and home-price return for each
                year. Within a trial, all three plans receive the same returns.
              </p>
              <div className={styles.methodEquation}>
                ln(1 + R<sup>e</sup><sub>t</sub>) = ln(1 + μ<sub>e</sub>) − σ²<sub>e</sub>/2 + σ<sub>e</sub>z<sup>e</sup><sub>t</sub>
                <br />
                z<sup>h</sup><sub>t</sub> = ρz<sup>e</sup><sub>t</sub> + √(1 − ρ²)ε<sub>t</sub>
              </div>
              <p>
                The fan bands come directly from percentiles of the simulated results.
                The heatmap groups those results into wealth ranges for each year. The
                distribution curves use Gaussian kernel smoothing.
              </p>

              <h3>Why these charts</h3>
              <ul>
                <li>The fan chart shows how uncertainty expands over time.</li>
                <li>The temporal heatmap shows skew and separate outcome clusters.</li>
                <li>The ridgelines show distribution shape at selected years.</li>
                <li>The stacked bars separate mortgage principal from mortgage interest.</li>
                <li>The sensitivity map shows conditional rankings across two return assumptions.</li>
              </ul>
              <p>
                A horizon graph is useful for fitting many time series into a small
                space. It is not used here because it does not show the range of possible
                outcomes clearly.
              </p>
            </div>
            <div className={styles.methodologyGrid}>
              <div className={styles.methodItem}>
                <span className={styles.methodIndex}>1</span>
                <h3>What changes each year</h3>
                <p>
                  The engine updates income, cash, home value, debt, portfolio value,
                  adjusted cost base, and tax each year.
                </p>
              </div>
              <div className={styles.methodItem}>
                <span className={styles.methodIndex}>2</span>
                <h3>Tax rules</h3>
                <p>
                  Federal and B.C. brackets, basic credits, CPP/CPP2, EI, 50% capital-gain
                  inclusion, PTT, and Vancouver&apos;s current residential property-tax rate.
                </p>
              </div>
              <div className={styles.methodItem}>
                <span className={styles.methodIndex}>3</span>
                <h3>Known gaps</h3>
                <p>
                  New savings use taxable accounts. The model omits registered-account
                  optimization, mortgage renewals, lender fees, AMT, and credit-line changes.
                </p>
              </div>
              <div className={styles.methodItem}>
                <span className={styles.methodIndex}>4</span>
                <h3>How to use the result</h3>
                <p>
                  Use the model to find sensitive assumptions and failure conditions.
                  Do not use one output as a personal recommendation.
                </p>
              </div>
            </div>
          </section>

          <section className={styles.sources}>
            <h2>Assumptions and sources</h2>
            <p>
              All scenarios use the same employment income and non-housing consumption.
              The renter invests the selected share of after-tax income. Each owner rents
              until the down payment, transfer tax, and closing costs are funded.
            </p>
            <p>
              Mortgage principal increases home equity. Mortgage interest, property tax,
              insurance, maintenance, and selling costs are expenses.
            </p>
            <p>
              The model taxes portfolio distributions each year as ordinary income. It
              reinvests the after-tax amount. This version does not separate eligible dividends,
              foreign dividends, interest income, or return of capital.
            </p>
            <p>
              The final net-worth value assumes that you sell the investments and the home.
              It applies the current 50% capital-gains inclusion rate and the principal-residence
              exemption. It subtracts selling costs, mortgage debt, and HELOC debt.
            </p>
            <ul>
              <li><a href="https://www.canada.ca/en/revenue-agency/services/tax/technical-information/income-tax/income-tax-folios-index/series-3-property-investments-savings-plans/series-3-property-investments-savings-plan-folio-6-interest/income-tax-folio-s3-f6-c1-interest-deductibility.html">CRA Income Tax Folio S3-F6-C1</a>: purpose, direct use, current use, tracing, and commingling.</li>
              <li><a href="https://www.canada.ca/en/revenue-agency/services/tax/individuals/topics/about-your-tax-return/tax-return/completing-a-tax-return/deductions-credits-expenses/line-22100-carrying-charges-interest-expenses.html">CRA line 22100</a>: investment interest and the exclusion for registered-plan borrowing.</li>
              <li><a href="https://www.canada.ca/en/revenue-agency/services/tax/individuals/tax-rates-brackets/current-year.html">CRA 2026 tax brackets</a>, <a href="https://www.canada.ca/en/revenue-agency/services/tax/businesses/topics/payroll/payroll-deductions-contributions/canada-pension-plan-cpp/cpp-contribution-rates-maximums-exemptions.html">CPP limits</a>, and <a href="https://www.canada.ca/en/employment-social-development/programs/ei/ei-list/reports/premium/rates2026.html">2026 EI rates</a>.</li>
              <li><a href="https://www.canada.ca/en/department-finance/services/publications/federal-tax-expenditures/2026.html">Department of Finance 2026 tax-expenditure report</a>: current one-half capital-gains inclusion.</li>
              <li><a href="https://www.canada.ca/en/revenue-agency/services/tax/individuals/topics/about-your-tax-return/tax-return/completing-a-tax-return/personal-income/line-12700-capital-gains/principal-residence-other-real-estate.html">CRA principal residence guidance</a>.</li>
              <li><a href="https://www.osfi-bsif.gc.ca/en/guidance/guidance-library/clarification-treatment-innovative-real-estate-secured-lending-products-under-guideline-b-20">OSFI combined-loan-plan guidance</a>: lending above 65% LTV must be amortizing and non-readvanceable, with an 80% combined ceiling.</li>
              <li><a href="https://www.canada.ca/en/financial-consumer-agency/services/mortgages/home-equity-line-credit.html">FCAC readvanceable mortgage overview</a>.</li>
              <li><a href="https://www2.gov.bc.ca/gov/content/taxes/property-taxes/property-transfer-tax">B.C. property transfer tax</a> and <a href="https://vancouver.ca/home-property-development/residential.aspx">City of Vancouver 2026 residential tax rate</a>.</li>
            </ul>
            <p className={styles.disclaimer}>
              Rules and rates are current to August 2026. They will change. This model is
              not tax software. Verify each tax rule, loan term, and investment product
              before you use debt.
            </p>
          </section>
        </main>

        <AssumptionSidebar
          actualPurchaseYear={purchaseYear}
          assumptions={assumptions}
          marginalRate={currentMarginalRate}
          onChange={updateAssumption}
          onReset={() => {
            setAssumptions(DEFAULT_ASSUMPTIONS);
            setHoverYear(Math.round(DEFAULT_ASSUMPTIONS.horizon * 0.55));
            setHeatmapHorizon(30);
          }}
        />
      </div>
    </article>
  );
};
