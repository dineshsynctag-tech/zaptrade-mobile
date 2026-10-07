const etTime = new Intl.DateTimeFormat('en-US', {
  timeZone: 'America/New_York',
  hour: '2-digit',
  minute: '2-digit',
  hourCycle: 'h23',
});

const istTime = new Intl.DateTimeFormat('en-US', {
  timeZone: 'Asia/Kolkata',
  hour: '2-digit',
  minute: '2-digit',
  hourCycle: 'h23',
});

const localTime = new Intl.DateTimeFormat('en-US', {
  hour: '2-digit',
  minute: '2-digit',
  hourCycle: 'h23',
});

const shortDate = new Intl.DateTimeFormat('en-US', {
  month: 'short',
  day: 'numeric',
  timeZone: 'UTC',
});

/** "09:31 ET" */
export function formatEt(iso: string | null): string {
  return iso ? `${etTime.format(new Date(iso))} ET` : '';
}

/** "19:01 IST" */
export function formatIst(iso: string | null): string {
  return iso ? `${istTime.format(new Date(iso))} IST` : '';
}

/** Wall-clock HH:MM in the device's zone (for "last updated" labels). */
export function formatLocalTime(ms: number): string {
  return localTime.format(new Date(ms));
}

/** "2026-10-08" → "Oct 8" */
export function formatTradeDate(date: string): string {
  return shortDate.format(new Date(`${date}T00:00:00Z`));
}
