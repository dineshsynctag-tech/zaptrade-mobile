/**
 * NYSE regular-session calendar, used by the mock backend and as a client-side
 * fallback. The real `/market-status` endpoint is authoritative.
 */
import type { MarketStatus } from '@/types/order';

/** Full-day NYSE closures. Early closes are not modelled. */
const HOLIDAYS = new Set([
  // 2026
  '2026-01-01', '2026-01-19', '2026-02-16', '2026-04-03', '2026-05-25',
  '2026-06-19', '2026-07-03', '2026-09-07', '2026-11-26', '2026-12-25',
  // 2027
  '2027-01-01', '2027-01-18', '2027-02-15', '2027-03-26', '2027-05-31',
  '2027-06-18', '2027-07-05', '2027-09-06', '2027-11-25', '2027-12-24',
]);

const PRE_OPEN = 4 * 60;
const OPEN = 9 * 60 + 30;
const CLOSE = 16 * 60;
const POST_CLOSE = 20 * 60;

interface EtParts {
  date: string; // YYYY-MM-DD
  minutes: number; // minutes since ET midnight
  weekday: number; // 0 = Sun
}

const etFormatter = new Intl.DateTimeFormat('en-US', {
  timeZone: 'America/New_York',
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
  hour: '2-digit',
  minute: '2-digit',
  hourCycle: 'h23',
  weekday: 'short',
});

const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

export function etParts(now: Date): EtParts {
  const p = Object.fromEntries(etFormatter.formatToParts(now).map((x) => [x.type, x.value]));
  return {
    date: `${p.year}-${p.month}-${p.day}`,
    minutes: Number(p.hour) * 60 + Number(p.minute),
    weekday: WEEKDAYS.indexOf(p.weekday),
  };
}

function addDays(date: string, days: number): string {
  const d = new Date(`${date}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

function weekdayOf(date: string): number {
  return new Date(`${date}T12:00:00Z`).getUTCDay();
}

export function isTradingDay(date: string): boolean {
  const wd = weekdayOf(date);
  return wd !== 0 && wd !== 6 && !HOLIDAYS.has(date);
}

export function nextTradingDayAfter(date: string): string {
  let d = addDays(date, 1);
  while (!isTradingDay(d)) d = addDays(d, 1);
  return d;
}

/** `count` trading days starting at `start` (inclusive if it is one). */
export function tradingDaysFrom(start: string, count: number): string[] {
  const days: string[] = [];
  let d = isTradingDay(start) ? start : nextTradingDayAfter(start);
  while (days.length < count) {
    days.push(d);
    d = nextTradingDayAfter(d);
  }
  return days;
}

export function previousTradingDayBefore(date: string): string {
  let d = addDays(date, -1);
  while (!isTradingDay(d)) d = addDays(d, -1);
  return d;
}

/** 09:30 ET on `date` as an ISO string (handles EST/EDT). */
function openInstant(date: string): string {
  for (const offset of ['-04:00', '-05:00']) {
    const candidate = new Date(`${date}T09:30:00${offset}`);
    const p = etParts(candidate);
    if (p.date === date && p.minutes === OPEN) return candidate.toISOString();
  }
  return new Date(`${date}T13:30:00Z`).toISOString();
}

export function computeMarketStatus(now: Date = new Date()): MarketStatus {
  const { date, minutes } = etParts(now);
  const tradingToday = isTradingDay(date);

  let state: MarketStatus['state'] = 'closed';
  if (tradingToday) {
    if (minutes >= OPEN && minutes < CLOSE) state = 'open';
    else if (minutes >= PRE_OPEN && minutes < OPEN) state = 'pre';
    else if (minutes >= CLOSE && minutes < POST_CLOSE) state = 'post';
  }

  // New orders target today until the close, then the next session.
  const nextTradingDate = tradingToday && minutes < CLOSE ? date : nextTradingDayAfter(date);
  const nextOpenDate = tradingToday && minutes < OPEN ? date : nextTradingDayAfter(date);

  return {
    state,
    nextOpen: openInstant(nextOpenDate),
    nextTradingDate,
    isHoliday: HOLIDAYS.has(date),
  };
}
