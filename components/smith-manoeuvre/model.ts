export type ScenarioKey = "rent" | "home" | "smith";

export type Assumptions = {
  startAge: number;
  horizon: number;
  startingIncome: number;
  incomeGrowth: number;
  savingsRate: number;
  startingSavings: number;
  purchaseYear: number;
  homePrice: number;
  downPayment: number;
  mortgageRate: number;
  amortizationYears: number;
  homeAppreciation: number;
  homeVolatility: number;
  rentMonthly: number;
  rentGrowth: number;
  propertyTaxRate: number;
  maintenanceRate: number;
  homeInsurance: number;
  cashReturn: number;
  equityReturn: number;
  equityVolatility: number;
  distributionYield: number;
  helocRate: number;
  inflation: number;
  sellingCosts: number;
  smithReborrowRate: number;
  taxRefundToMortgage: number;
  marketHomeCorrelation: number;
  simulationTrials: number;
};

export type MarketPath = {
  equityReturns: number[];
  homeReturns: number[];
  incomeGrowth: number[];
  helocRates: number[];
};

export type YearResult = {
  year: number;
  age: number;
  grossIncome: number;
  afterTaxIncome: number;
  rent: number;
  homeValue: number;
  mortgage: number;
  heloc: number;
  homeEquity: number;
  regularPortfolio: number;
  smithPortfolio: number;
  downPaymentFund: number;
  portfolio: number;
  portfolioAcb: number;
  annualTaxSavings: number;
  annualMortgageInterest: number;
  annualMortgagePrincipal: number;
  annualHelocInterest: number;
  annualHousingCash: number;
  nominalNetWorth: number;
  realNetWorth: number;
  purchased: boolean;
};

export type ScenarioProjection = {
  key: ScenarioKey;
  results: YearResult[];
  actualPurchaseYear: number | null;
};

export type ProjectionSet = Record<ScenarioKey, ScenarioProjection>;

export type FanPoint = {
  year: number;
  age: number;
  p025: number;
  p10: number;
  p25: number;
  p50: number;
  p75: number;
  p90: number;
  p975: number;
};

export type FanSeries = Record<ScenarioKey, FanPoint[]>;

export type SimulationDistribution = {
  fan: FanSeries;
  samples: Record<ScenarioKey, number[][]>;
  trials: number;
};

export const SCENARIOS: Array<{
  key: ScenarioKey;
  label: string;
  shortLabel: string;
  color: string;
}> = [
  {
    key: "rent",
    label: "Rent + index",
    shortLabel: "Rent",
    color: "#1558d6",
  },
  {
    key: "home",
    label: "Home + mortgage",
    shortLabel: "Home",
    color: "#d45532",
  },
  {
    key: "smith",
    label: "Smith + index",
    shortLabel: "Smith",
    color: "#08756f",
  },
];

export const DEFAULT_ASSUMPTIONS: Assumptions = {
  startAge: 26,
  horizon: 30,
  startingIncome: 180_000,
  incomeGrowth: 3.5,
  savingsRate: 40,
  startingSavings: 0,
  purchaseYear: 5,
  homePrice: 1_000_000,
  downPayment: 20,
  mortgageRate: 4.5,
  amortizationYears: 25,
  homeAppreciation: 3.5,
  homeVolatility: 8,
  rentMonthly: 3_000,
  rentGrowth: 3,
  propertyTaxRate: 0.336394,
  maintenanceRate: 1,
  homeInsurance: 1_500,
  cashReturn: 3,
  equityReturn: 6.5,
  equityVolatility: 18,
  distributionYield: 2,
  helocRate: 5.5,
  inflation: 2,
  sellingCosts: 3.5,
  smithReborrowRate: 100,
  taxRefundToMortgage: 100,
  marketHomeCorrelation: 20,
  simulationTrials: 720,
};

const FEDERAL_BRACKETS = [
  [58_523, 0.14],
  [117_045, 0.205],
  [181_440, 0.26],
  [258_482, 0.29],
  [Number.POSITIVE_INFINITY, 0.33],
] as const;

const BC_BRACKETS = [
  [50_363, 0.056],
  [100_728, 0.077],
  [115_648, 0.105],
  [140_430, 0.1229],
  [190_405, 0.147],
  [265_545, 0.168],
  [Number.POSITIVE_INFINITY, 0.205],
] as const;

const clamp = (value: number, min: number, max: number) =>
  Math.min(max, Math.max(min, Number.isFinite(value) ? value : min));

const rate = (value: number) => value / 100;

const progressiveTax = (
  income: number,
  brackets: ReadonlyArray<readonly [number, number]>,
  indexFactor: number
) => {
  let tax = 0;
  let floor = 0;
  const taxable = Math.max(0, income);
  for (const [rawCeiling, bracketRate] of brackets) {
    const ceiling = Number.isFinite(rawCeiling)
      ? rawCeiling * indexFactor
      : Number.POSITIVE_INFINITY;
    tax += Math.max(0, Math.min(taxable, ceiling) - floor) * bracketRate;
    if (taxable <= ceiling) break;
    floor = ceiling;
  }
  return tax;
};

const payrollContributions = (income: number, indexFactor: number) => {
  const ympe = 74_600 * indexFactor;
  const yampe = 85_000 * indexFactor;
  const exemption = 3_500 * indexFactor;
  const cppEligible = Math.max(0, Math.min(income, ympe) - exemption);
  const baseCpp = cppEligible * 0.0495;
  const firstAdditionalCpp = cppEligible * 0.01;
  const cpp2 = Math.max(0, Math.min(income, yampe) - ympe) * 0.04;
  const ei = Math.min(income, 68_900 * indexFactor) * 0.0163;
  return {
    baseCpp,
    firstAdditionalCpp,
    cpp2,
    ei,
    total: baseCpp + firstAdditionalCpp + cpp2 + ei,
  };
};

export const incomeTax = (
  grossIncome: number,
  interestDeduction: number,
  year: number,
  inflationPct: number
) => {
  const indexFactor = Math.pow(1 + rate(inflationPct), year);
  const payroll = payrollContributions(grossIncome, indexFactor);
  const taxableIncome = Math.max(
    0,
    grossIncome - payroll.firstAdditionalCpp - payroll.cpp2 - interestDeduction
  );

  const federalBpaMax = 16_452 * indexFactor;
  const federalBpaMin = 14_829 * indexFactor;
  const phaseStart = 181_440 * indexFactor;
  const phaseEnd = 258_482 * indexFactor;
  const phase = clamp(
    (taxableIncome - phaseStart) / Math.max(1, phaseEnd - phaseStart),
    0,
    1
  );
  const federalBpa = federalBpaMax - (federalBpaMax - federalBpaMin) * phase;
  const employmentAmount = Math.min(grossIncome, 1_501 * indexFactor);
  const federalCredits =
    (federalBpa + employmentAmount + payroll.baseCpp + payroll.ei) * 0.14;
  const bcCredits =
    (13_216 * indexFactor + payroll.baseCpp + payroll.ei) * 0.056;

  const federal = Math.max(
    0,
    progressiveTax(taxableIncome, FEDERAL_BRACKETS, indexFactor) - federalCredits
  );
  const bc = Math.max(
    0,
    progressiveTax(taxableIncome, BC_BRACKETS, indexFactor) - bcCredits
  );

  return {
    incomeTax: federal + bc,
    payroll: payroll.total,
    afterTaxIncome: grossIncome - federal - bc - payroll.total,
  };
};

export const marginalTaxRate = (
  grossIncome: number,
  year: number,
  inflationPct: number
) => {
  const increment = 100;
  const base = incomeTax(grossIncome, 0, year, inflationPct).incomeTax;
  const next = incomeTax(grossIncome + increment, 0, year, inflationPct).incomeTax;
  return clamp((next - base) / increment, 0, 0.6);
};

const propertyTransferTax = (price: number) => {
  const first = Math.min(price, 200_000) * 0.01;
  const second = Math.max(0, Math.min(price, 2_000_000) - 200_000) * 0.02;
  const third = Math.max(0, price - 2_000_000) * 0.03;
  const residentialSurcharge = Math.max(0, price - 3_000_000) * 0.02;
  return first + second + third + residentialSurcharge;
};

const monthlyPayment = (principal: number, annualRate: number, years: number) => {
  if (principal <= 0 || years <= 0) return 0;
  const monthlyRate = annualRate / 12;
  const months = Math.max(1, Math.round(years * 12));
  if (monthlyRate === 0) return principal / months;
  return (
    (principal * monthlyRate * Math.pow(1 + monthlyRate, months)) /
    (Math.pow(1 + monthlyRate, months) - 1)
  );
};

const amortizeYear = (
  openingBalance: number,
  monthlyRate: number,
  monthlyMortgagePayment: number
) => {
  let balance = Math.max(0, openingBalance);
  let interest = 0;
  let principal = 0;
  let payments = 0;
  for (let month = 0; month < 12 && balance > 0; month += 1) {
    const monthInterest = balance * monthlyRate;
    const payment = Math.min(balance + monthInterest, monthlyMortgagePayment);
    const monthPrincipal = Math.max(0, payment - monthInterest);
    interest += monthInterest;
    principal += monthPrincipal;
    payments += payment;
    balance = Math.max(0, balance - monthPrincipal);
  }
  return { balance, interest, principal, payments };
};

const growPortfolio = (
  value: number,
  acb: number,
  annualReturn: number,
  distributionYield: number,
  grossIncome: number,
  year: number,
  inflation: number
) => {
  const grossDistribution = Math.max(0, value * distributionYield);
  const baseTax = incomeTax(grossIncome, 0, year, inflation).incomeTax;
  const taxWithDistribution = incomeTax(
    grossIncome + grossDistribution,
    0,
    year,
    inflation
  ).incomeTax;
  const distributionTax = Math.max(0, taxWithDistribution - baseTax);
  const endingValue = Math.max(0, value * (1 + annualReturn) - distributionTax);
  const endingAcb = Math.max(
    0,
    acb + Math.max(0, grossDistribution - distributionTax)
  );
  return { value: endingValue, acb: endingAcb };
};

const liquidatingTax = (
  portfolio: number,
  acb: number,
  grossIncome: number,
  year: number,
  inflation: number
) => {
  const taxableGain = Math.max(0, portfolio - acb) * 0.5;
  if (taxableGain === 0) return 0;
  const baseTax = incomeTax(grossIncome, 0, year, inflation).incomeTax;
  const taxWithGain = incomeTax(
    grossIncome + taxableGain,
    0,
    year,
    inflation
  ).incomeTax;
  return Math.max(0, taxWithGain - baseTax);
};

export const createBasePath = (assumptions: Assumptions): MarketPath => {
  const years = Math.max(1, Math.round(assumptions.horizon));
  return {
    equityReturns: Array.from({ length: years + 1 }, (_, year) =>
      year === 0 ? 0 : rate(assumptions.equityReturn)
    ),
    homeReturns: Array.from({ length: years + 1 }, (_, year) =>
      year === 0 ? 0 : rate(assumptions.homeAppreciation)
    ),
    incomeGrowth: Array.from({ length: years + 1 }, (_, year) =>
      year === 0 ? 0 : rate(assumptions.incomeGrowth)
    ),
    helocRates: Array.from({ length: years + 1 }, () =>
      rate(assumptions.helocRate)
    ),
  };
};

export const createStressPath = (assumptions: Assumptions): MarketPath => {
  const path = createBasePath(assumptions);
  const crashYear = Math.min(5, Math.max(1, Math.round(assumptions.horizon / 3)));
  if (crashYear <= assumptions.horizon) {
    path.equityReturns[crashYear] = -0.37;
    path.homeReturns[crashYear] = -0.15;
    path.incomeGrowth[crashYear] = -0.1;
    path.helocRates[crashYear] += 0.02;
  }
  if (crashYear + 1 <= assumptions.horizon) {
    path.equityReturns[crashYear + 1] = 0.26;
    path.homeReturns[crashYear + 1] = -0.05;
    path.incomeGrowth[crashYear + 1] = 0;
    path.helocRates[crashYear + 1] += 0.02;
  }
  if (crashYear + 2 <= assumptions.horizon) {
    path.equityReturns[crashYear + 2] = 0.15;
    path.homeReturns[crashYear + 2] = 0.1;
    path.incomeGrowth[crashYear + 2] = 0.08;
  }
  return path;
};

export const projectScenario = (
  assumptions: Assumptions,
  key: ScenarioKey,
  path: MarketPath = createBasePath(assumptions)
): ScenarioProjection => {
  const horizon = clamp(Math.round(assumptions.horizon), 10, 40);
  const inflation = rate(assumptions.inflation);
  const mortgageRate = rate(assumptions.mortgageRate);
  const monthlyMortgagePaymentRate = mortgageRate / 12;
  const distributionYield = rate(assumptions.distributionYield);
  const savingsRate = rate(assumptions.savingsRate);
  const reborrowRate = rate(assumptions.smithReborrowRate);
  const refundRecycleRate = rate(assumptions.taxRefundToMortgage);

  let income = Math.max(0, assumptions.startingIncome);
  let rent = Math.max(0, assumptions.rentMonthly * 12);
  let marketHomePrice = Math.max(0, assumptions.homePrice);
  let homeValue = 0;
  let mortgage = 0;
  let heloc = 0;
  let regularPortfolio = key === "rent" ? Math.max(0, assumptions.startingSavings) : 0;
  let regularAcb = regularPortfolio;
  let smithPortfolio = 0;
  let smithAcb = 0;
  let downPaymentFund = key === "rent" ? 0 : Math.max(0, assumptions.startingSavings);
  let purchased = false;
  let actualPurchaseYear: number | null = null;
  let fixedMonthlyPayment = 0;

  const makeResult = (
    year: number,
    annualTaxSavings = 0,
    annualMortgageInterest = 0,
    annualMortgagePrincipal = 0,
    annualHelocInterest = 0,
    annualHousingCash = 0
  ): YearResult => {
    const portfolio = regularPortfolio + smithPortfolio;
    const acb = regularAcb + smithAcb;
    const liquidationTax = liquidatingTax(
      portfolio,
      acb,
      income,
      year,
      assumptions.inflation
    );
    const homeAfterSellingCosts = homeValue * (1 - rate(assumptions.sellingCosts));
    const nominalNetWorth =
      portfolio -
      liquidationTax +
      downPaymentFund +
      homeAfterSellingCosts -
      mortgage -
      heloc;
    const homeEquity = Math.max(0, homeValue - mortgage - heloc);
    return {
      year,
      age: assumptions.startAge + year,
      grossIncome: income,
      afterTaxIncome: incomeTax(income, 0, year, assumptions.inflation)
        .afterTaxIncome,
      rent,
      homeValue,
      mortgage,
      heloc,
      homeEquity,
      regularPortfolio,
      smithPortfolio,
      downPaymentFund,
      portfolio,
      portfolioAcb: acb,
      annualTaxSavings,
      annualMortgageInterest,
      annualMortgagePrincipal,
      annualHelocInterest,
      annualHousingCash,
      nominalNetWorth,
      realNetWorth: nominalNetWorth / Math.pow(1 + inflation, year),
      purchased,
    };
  };

  const results: YearResult[] = [makeResult(0)];

  for (let year = 1; year <= horizon; year += 1) {
    let purchasedThisYear = false;
    income *= 1 + (path.incomeGrowth[year] ?? rate(assumptions.incomeGrowth));
    rent *= 1 + rate(assumptions.rentGrowth);
    marketHomePrice *= 1 + (path.homeReturns[year] ?? rate(assumptions.homeAppreciation));

    const regularGrowth = growPortfolio(
      regularPortfolio,
      regularAcb,
      path.equityReturns[year] ?? rate(assumptions.equityReturn),
      distributionYield,
      income,
      year,
      assumptions.inflation
    );
    regularPortfolio = regularGrowth.value;
    regularAcb = regularGrowth.acb;

    const smithGrowth = growPortfolio(
      smithPortfolio,
      smithAcb,
      path.equityReturns[year] ?? rate(assumptions.equityReturn),
      distributionYield,
      income,
      year,
      assumptions.inflation
    );
    smithPortfolio = smithGrowth.value;
    smithAcb = smithGrowth.acb;
    downPaymentFund *= 1 + rate(assumptions.cashReturn);

    if (key !== "rent" && !purchased && year >= assumptions.purchaseYear) {
      const downPayment = marketHomePrice * rate(assumptions.downPayment);
      const closingCash = downPayment + propertyTransferTax(marketHomePrice) + 4_000;
      if (downPaymentFund >= closingCash) {
        purchased = true;
        purchasedThisYear = true;
        actualPurchaseYear = year;
        homeValue = marketHomePrice;
        mortgage = Math.max(0, homeValue - downPayment);
        downPaymentFund -= closingCash;
        regularPortfolio += downPaymentFund;
        regularAcb += downPaymentFund;
        downPaymentFund = 0;
        fixedMonthlyPayment = monthlyPayment(
          mortgage,
          mortgageRate,
          assumptions.amortizationYears
        );
      }
    }

    if (purchased && !purchasedThisYear) {
      homeValue *= 1 + (path.homeReturns[year] ?? rate(assumptions.homeAppreciation));
    }

    const employment = incomeTax(income, 0, year, assumptions.inflation);
    const nonHousingConsumption =
      employment.afterTaxIncome * (1 - savingsRate) - rent;

    let annualTaxSavings = 0;
    let annualMortgageInterest = 0;
    let annualMortgagePrincipal = 0;
    let annualHelocInterest = 0;
    let annualHousingCash = rent;

    if (key === "rent" || !purchased) {
      const contribution = Math.max(
        0,
        employment.afterTaxIncome - nonHousingConsumption - rent
      );
      if (key === "rent") {
        regularPortfolio += contribution;
        regularAcb += contribution;
      } else {
        downPaymentFund += contribution;
      }
    } else {
      const amortization = amortizeYear(
        mortgage,
        monthlyMortgagePaymentRate,
        fixedMonthlyPayment
      );
      annualMortgageInterest = amortization.interest;
      annualMortgagePrincipal = amortization.principal;
      mortgage = amortization.balance;

      annualHelocInterest =
        key === "smith" ? heloc * (path.helocRates[year] ?? rate(assumptions.helocRate)) : 0;
      if (key === "smith" && annualHelocInterest > 0) {
        const taxWithoutDeduction = incomeTax(
          income,
          0,
          year,
          assumptions.inflation
        ).incomeTax;
        const taxWithDeduction = incomeTax(
          income,
          annualHelocInterest,
          year,
          assumptions.inflation
        ).incomeTax;
        annualTaxSavings = Math.max(0, taxWithoutDeduction - taxWithDeduction);
      }

      const ownerOperatingCosts =
        homeValue *
          (rate(assumptions.propertyTaxRate) + rate(assumptions.maintenanceRate)) +
        assumptions.homeInsurance * Math.pow(1 + inflation, year);
      annualHousingCash =
        amortization.payments + ownerOperatingCosts + annualHelocInterest;

      const recycledRefund = Math.min(
        mortgage,
        annualTaxSavings * refundRecycleRate
      );
      mortgage -= recycledRefund;

      if (key === "smith") {
        const targetBorrow = (amortization.principal + recycledRefund) * reborrowRate;
        const maxHeloc = Math.min(homeValue * 0.65, homeValue * 0.8 - mortgage);
        const newBorrowing = Math.max(0, Math.min(targetBorrow, maxHeloc - heloc));
        heloc += newBorrowing;
        smithPortfolio += newBorrowing;
        smithAcb += newBorrowing;
      }

      const availableForInvesting =
        employment.afterTaxIncome -
        nonHousingConsumption -
        annualHousingCash +
        annualTaxSavings -
        recycledRefund;
      if (availableForInvesting >= 0) {
        regularPortfolio += availableForInvesting;
        regularAcb += availableForInvesting;
      } else {
        const withdrawal = Math.min(regularPortfolio, -availableForInvesting);
        const acbShare = regularPortfolio > 0 ? regularAcb / regularPortfolio : 0;
        regularPortfolio -= withdrawal;
        regularAcb = Math.max(0, regularAcb - withdrawal * acbShare);
      }
    }

    results.push(
      makeResult(
        year,
        annualTaxSavings,
        annualMortgageInterest,
        annualMortgagePrincipal,
        annualHelocInterest,
        annualHousingCash
      )
    );
  }

  return { key, results, actualPurchaseYear };
};

export const projectAll = (
  assumptions: Assumptions,
  path: MarketPath = createBasePath(assumptions)
): ProjectionSet => ({
  rent: projectScenario(assumptions, "rent", path),
  home: projectScenario(assumptions, "home", path),
  smith: projectScenario(assumptions, "smith", path),
});

const mulberry32 = (seed: number) => {
  let value = seed >>> 0;
  return () => {
    value += 0x6d2b79f5;
    let t = value;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4_294_967_296;
  };
};

const normal = (random: () => number) => {
  const u = Math.max(Number.EPSILON, random());
  const v = Math.max(Number.EPSILON, random());
  return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
};

const randomReturn = (mean: number, volatility: number, z: number) =>
  Math.exp(Math.log(1 + mean) - 0.5 * volatility * volatility + volatility * z) - 1;

export const createRandomPath = (
  assumptions: Assumptions,
  random: () => number,
  stress = false
): MarketPath => {
  const path = createBasePath(assumptions);
  const equityVol = rate(assumptions.equityVolatility);
  const homeVol = rate(assumptions.homeVolatility);
  const correlation = clamp(rate(assumptions.marketHomeCorrelation), -0.9, 0.9);
  for (let year = 1; year <= assumptions.horizon; year += 1) {
    const equityZ = normal(random);
    const independentHomeZ = normal(random);
    const homeZ =
      correlation * equityZ +
      Math.sqrt(Math.max(0, 1 - correlation * correlation)) * independentHomeZ;
    path.equityReturns[year] = randomReturn(
      rate(assumptions.equityReturn),
      equityVol,
      equityZ
    );
    path.homeReturns[year] = randomReturn(
      rate(assumptions.homeAppreciation),
      homeVol,
      homeZ
    );
  }

  if (stress) {
    const shock = createStressPath(assumptions);
    const crashYear = Math.min(5, Math.max(1, Math.round(assumptions.horizon / 3)));
    for (let year = crashYear; year <= Math.min(crashYear + 2, assumptions.horizon); year += 1) {
      path.equityReturns[year] = shock.equityReturns[year];
      path.homeReturns[year] = shock.homeReturns[year];
      path.incomeGrowth[year] = shock.incomeGrowth[year];
      path.helocRates[year] = shock.helocRates[year];
    }
  }
  return path;
};

const percentile = (sorted: number[], probability: number) => {
  if (sorted.length === 0) return 0;
  const index = (sorted.length - 1) * probability;
  const lower = Math.floor(index);
  const upper = Math.ceil(index);
  if (lower === upper) return sorted[lower];
  return sorted[lower] + (sorted[upper] - sorted[lower]) * (index - lower);
};

export const simulateDistribution = (
  assumptions: Assumptions,
  stress = false,
  simulations = Math.round(assumptions.simulationTrials)
): SimulationDistribution => {
  const trialCount = clamp(Math.round(simulations), 120, 2_400);
  const horizon = clamp(Math.round(assumptions.horizon), 10, 40);
  const random = mulberry32(stress ? 8_208_2008 : 20_260_828);
  const paths: Record<ScenarioKey, number[][]> = {
    rent: Array.from({ length: horizon + 1 }, () => []),
    home: Array.from({ length: horizon + 1 }, () => []),
    smith: Array.from({ length: horizon + 1 }, () => []),
  };

  for (let simulation = 0; simulation < trialCount; simulation += 1) {
    const marketPath = createRandomPath(assumptions, random, stress);
    const projection = projectAll(assumptions, marketPath);
    for (const scenario of SCENARIOS) {
      projection[scenario.key].results.forEach((result, year) => {
        paths[scenario.key][year].push(result.realNetWorth);
      });
    }
  }

  const fan = SCENARIOS.reduce((series, scenario) => {
    series[scenario.key] = paths[scenario.key].map((values, year) => {
      values.sort((a, b) => a - b);
      return {
        year,
        age: assumptions.startAge + year,
        p025: percentile(values, 0.025),
        p10: percentile(values, 0.1),
        p25: percentile(values, 0.25),
        p50: percentile(values, 0.5),
        p75: percentile(values, 0.75),
        p90: percentile(values, 0.9),
        p975: percentile(values, 0.975),
      };
    });
    return series;
  }, {} as FanSeries);

  return { fan, samples: paths, trials: trialCount };
};

export const simulateFan = (
  assumptions: Assumptions,
  stress = false,
  simulations = Math.round(assumptions.simulationTrials)
): FanSeries => simulateDistribution(assumptions, stress, simulations).fan;

export const winnerAt = (
  assumptions: Assumptions,
  equityReturn: number,
  homeAppreciation: number,
  horizon: number
): ScenarioKey => {
  const local = {
    ...assumptions,
    horizon: Math.max(horizon, assumptions.purchaseYear),
    equityReturn,
    homeAppreciation,
  };
  const projection = projectAll(local);
  let winner: ScenarioKey = "rent";
  let best = Number.NEGATIVE_INFINITY;
  for (const scenario of SCENARIOS) {
    const result = projection[scenario.key].results[Math.min(horizon, local.horizon)];
    if (result.realNetWorth > best) {
      best = result.realNetWorth;
      winner = scenario.key;
    }
  }
  return winner;
};
