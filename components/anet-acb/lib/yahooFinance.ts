import type { PricePoint } from '../types';

export { fetchExchangeRates } from 'canada-acb';

const CORS_PROXIES = [
  'https://corsproxy.io/?url=',
  'https://api.allorigins.win/raw?url=',
];

function formatDateUTC(d: Date): string {
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}-${String(d.getUTCDate()).padStart(2, '0')}`;
}

function parseDateUTC(dateStr: string): Date {
  const [y, m, d] = dateStr.split('-').map(Number);
  return new Date(Date.UTC(y, m - 1, d));
}

async function fetchWithCorsProxy(url: string): Promise<Response> {
  // Try direct first (Bank of Canada may allow CORS)
  try {
    const resp = await fetch(url);
    if (resp.ok) return resp;
  } catch {
    // Fall through to proxies
  }

  for (const proxy of CORS_PROXIES) {
    try {
      const resp = await fetch(proxy + encodeURIComponent(url));
      if (resp.ok) return resp;
    } catch {
      continue;
    }
  }

  throw new Error(`Failed to fetch: ${url}`);
}

async function fetchYahooChart(
  symbol: string,
  period1: number,
  period2: number,
  interval = '1d',
): Promise<{ timestamps: number[]; closes: number[] }> {
  const baseUrl = `https://query1.finance.yahoo.com/v8/finance/chart/${symbol}?period1=${period1}&period2=${period2}&interval=${interval}`;

  for (const proxy of CORS_PROXIES) {
    try {
      const url = proxy + encodeURIComponent(baseUrl);
      const resp = await fetch(url);
      if (!resp.ok) continue;

      const json = await resp.json();
      const result = json?.chart?.result?.[0];
      if (!result) continue;

      const timestamps: number[] = result.timestamp || [];
      const closes: number[] = result.indicators?.quote?.[0]?.close || [];
      return { timestamps, closes };
    } catch {
      continue;
    }
  }

  throw new Error(`Failed to fetch Yahoo Finance data for ${symbol}`);
}

export async function fetchStockPrices(
  startDate: string,
  endDate: string,
): Promise<PricePoint[]> {
  const start = parseDateUTC(startDate);
  start.setUTCDate(start.getUTCDate() - 60);
  const end = parseDateUTC(endDate);
  end.setUTCDate(end.getUTCDate() + 60);

  const period1 = Math.floor(start.getTime() / 1000);
  const period2 = Math.floor(end.getTime() / 1000);

  const { timestamps, closes } = await fetchYahooChart('ANET', period1, period2);

  const points: PricePoint[] = [];
  for (let i = 0; i < timestamps.length; i++) {
    if (closes[i] != null) {
      const d = new Date(timestamps[i] * 1000);
      points.push({ date: formatDateUTC(d), close: closes[i] });
    }
  }

  return points;
}
