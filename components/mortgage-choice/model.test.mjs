// Run with Node 24+: node --test components/mortgage-choice/model.test.mjs
import test from 'node:test';
import assert from 'node:assert/strict';
import { EXAMPLE, HOUSEHOLDS, PRODUCTS, SCENARIOS, payment, simulate, cashFlow, penalty, breakEven } from './model.ts';
const near = (actual, expected, tolerance = 0.01) => assert.ok(Math.abs(actual - expected) < tolerance, `${actual} differs from ${expected}`);

test('fixed schedule matches independently calculated worked example', () => {
  const r = simulate(EXAMPLE, 'fixed', 'flat');
  near(r.rows[0].payment, 3320.837725713);
  near(r.interest, 126028.58949);
  near(r.balance, 526778.32594785);
});
test('zero-interest loan amortizes without NaN and reaches zero on schedule', () => {
  near(payment(600000, 0, 300), 2000);
  const r = simulate({ ...EXAMPLE, fixed: 0 }, 'fixed', 'flat', { months: 300 });
  near(r.balance, 0); near(r.interest, 0); near(r.paid, 600000);
});
test('all product and scenario schedules reconcile cash paid, debt and interest', () => {
  for (const p of PRODUCTS) for (const s of SCENARIOS) {
    const r = simulate(EXAMPLE, p.key, s.key, { months: 120, renewalRate: 6 });
    near(r.paid + r.balance - EXAMPLE.principal, r.interest, 0.00001);
    assert.ok(r.rows.every(m => Number.isFinite(m.payment) && m.balance >= 0));
  }
});
test('zero principal produces zero borrowing costs for every contract', () => {
  for (const p of PRODUCTS) {
    const r = simulate({ ...EXAMPLE, principal: 0 }, p.key, 'rise');
    assert.equal(r.peak, 0); assert.equal(r.interest, 0); assert.equal(penalty(r, 24, 60, 3), 0);
  }
});
test('cut timing reproduces the article and changes only on the specified month', () => {
  const early = simulate(EXAMPLE, 'adjustable', 'early');
  const late = simulate(EXAMPLE, 'adjustable', 'late');
  assert.equal(early.rows[11].rate, 4); assert.equal(early.rows[12].rate, 3);
  assert.equal(late.rows[47].rate, 4); assert.equal(late.rows[48].rate, 3);
  near(early.interest, 89327.67945); near(late.interest, 106425.20029);
});
test('temporary spike can win on interest while requiring a larger payment', () => {
  const r = simulate(EXAMPLE, 'adjustable', 'spike');
  const fixed = simulate(EXAMPLE, 'fixed', 'flat');
  assert.ok(r.interest < fixed.interest); assert.ok(r.peak > fixed.peak);
  assert.equal(r.rows[23].rate, 6); assert.equal(r.rows[24].rate, 4);
  near(r.peak, 3815.83050);
});
test('held-payment contract resets when interest reaches its payment', () => {
  const r = simulate(EXAMPLE, 'held', 'flat', { rateAt: m => m < 13 ? 4 : 8 });
  assert.equal(r.firstReset, 13);
  assert.ok(r.rows[12].payment > r.rows[11].payment);
  assert.ok(r.rows.every(m => m.payment >= m.interest));
});
test('held payment accumulates more debt and recasts at renewal, not a month early', () => {
  const r = simulate(EXAMPLE, 'held', 'flat', { months: 61, renewalRate: 5.5, rateAt: m => m < 13 ? 4 : 5.5 });
  assert.equal(r.firstReset, null);
  near(r.rows[59].payment, 3156.12123); near(r.rows[59].balance, 558817.732947);
  near(r.rows[60].payment, 3824.49988);
});
test('no prepayment penalty at exact contract maturity', () => {
  for (const p of PRODUCTS) {
    const r = simulate(EXAMPLE, p.key, 'early');
    assert.equal(penalty(r, 60, 60, 3), 0);
    assert.ok(penalty(r, 59, 60, 3) > 0);
  }
});
test('early-exit estimate matches independent hand calculation', () => {
  const r = simulate(EXAMPLE, 'fixed', 'early', { months: 24 });
  near(penalty(r, 24, 60, 3), 25769.24951);
  const v = simulate(EXAMPLE, 'adjustable', 'early', { months: 24 });
  near(penalty(v, 24, 60, 3), 4265.294737);
});
test('short fixed term uses its renewal quote starting at month 37', () => {
  const r = simulate({ ...EXAMPLE, fixed: 4.3 }, 'fixed', 'flat', { termMonths: 36, renewalRate: 7 });
  assert.equal(r.rows[35].rate, 4.3); assert.equal(r.rows[36].rate, 7);
  assert.equal(penalty(r, 36, 36, 3), 0);
});
test('household shock applies for exactly its specified duration and stops at zero cash', () => {
  const mortgage = simulate({ ...EXAMPLE, principal: 0 }, 'fixed', 'flat', { months: 4 });
  const r = cashFlow(mortgage, { income: 1000, expenses: 800, reserve: 100, loss: 500, start: 2, duration: 2 });
  assert.deepEqual(r.rows.map(r => r.funding), [100, 300, 0, -300, -100]);
  assert.equal(r.firstShortfall, 3); assert.equal(r.minimumCash, 0); assert.equal(r.fundingNeeded, 300);
});
test('parental leave example identifies the funding gap even under fixed', () => {
  const h = HOUSEHOLDS.find(h => h.key === 'leave');
  const r = cashFlow(simulate(EXAMPLE, 'fixed', h.scenario, { months: 36 }), h.budget);
  assert.equal(r.firstShortfall, 16); near(r.fundingNeeded, 7375.07906);
});
test('break-even solver brackets both starting offer relationships', () => {
  for (const variable of [4, 5]) for (const month of [13, 25, 49]) {
    const loan = { ...EXAMPLE, variable };
    const rate = breakEven(loan, month);
    assert.notEqual(rate, null);
    const r = simulate(loan, 'adjustable', 'flat', { rateAt: m => m < month ? variable : rate });
    near(r.interest, simulate(loan, 'fixed', 'flat').interest, 0.001);
  }
});
