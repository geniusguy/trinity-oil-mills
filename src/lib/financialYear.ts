/** Validates C0001/2024-25 (FY) or legacy C0001/2026 (calendar year). */
export const INVOICE_NUMBER_FULL_REGEX = /^[CR]\d{4}\/(?:\d{4}-\d{2}|\d{4})$/;

/**
 * Indian financial year: 1 April – 31 March.
 * Example: 2 Feb 2025 belongs to FY 2024-25 (1 Apr 2024 – 31 Mar 2025).
 */

export function getFinancialYearStartYear(d: Date): number {
  const m = d.getMonth(); // 0 = Jan; April = 3
  const y = d.getFullYear();
  return m >= 3 ? y : y - 1;
}

export function getFinancialYearStartDate(startYear: number): Date {
  return new Date(startYear, 3, 1); // 1 April
}

export function getFinancialYearEndDate(startYear: number): Date {
  return new Date(startYear + 1, 2, 31, 23, 59, 59, 999); // 31 March
}

/** Full label e.g. "2024-25" (matches common invoice / GST usage). */
export function formatFinancialYearLabel(startYear: number): string {
  const endYy = String(startYear + 1).slice(-2);
  return `${startYear}-${endYy}`;
}

/** Compact label e.g. "24-25". */
export function formatFinancialYearLabelCompact(startYear: number): string {
  return `${String(startYear).slice(-2)}-${String(startYear + 1).slice(-2)}`;
}

export function getFinancialYearLabelForDate(d: Date): string {
  return formatFinancialYearLabel(getFinancialYearStartYear(d));
}

/** Suffix for invoice numbers: `C0001/2024-25` */
export function getInvoiceFinancialYearSuffix(d: Date): string {
  return getFinancialYearLabelForDate(d);
}

export function getFinancialYearBoundsForDate(d: Date): {
  startYear: number;
  start: Date;
  end: Date;
} {
  const startYear = getFinancialYearStartYear(d);
  return {
    startYear,
    start: getFinancialYearStartDate(startYear),
    end: getFinancialYearEndDate(startYear),
  };
}

export function getCurrentFinancialYearBounds(now: Date = new Date()) {
  return getFinancialYearBoundsForDate(now);
}

/** e.g. "24-25" for current FY */
export function getCurrentFinancialYearLabelCompact(now: Date = new Date()): string {
  return formatFinancialYearLabelCompact(getFinancialYearStartYear(now));
}

export function getPreviousFinancialYearBounds(now: Date = new Date()) {
  const { startYear } = getFinancialYearBoundsForDate(now);
  const prev = startYear - 1;
  return {
    startYear: prev,
    start: getFinancialYearStartDate(prev),
    end: getFinancialYearEndDate(prev),
  };
}

/** Indian FY quarter: Q1 Apr–Jun, Q2 Jul–Sep, Q3 Oct–Dec, Q4 Jan–Mar. */
export function getFinancialYearQuarter(d: Date): 1 | 2 | 3 | 4 {
  const m = d.getMonth();
  if (m >= 3 && m <= 5) return 1;
  if (m >= 6 && m <= 8) return 2;
  if (m >= 9 && m <= 11) return 3;
  return 4;
}

/** Period key for grouping, e.g. `2024-FYQ1`. */
export function getFinancialYearQuarterPeriodKey(d: Date): string {
  const fyStart = getFinancialYearStartYear(d);
  const q = getFinancialYearQuarter(d);
  return `${fyStart}-FYQ${q}`;
}

/** Period key for FY, e.g. `2024-25`. */
export function getFinancialYearPeriodKey(d: Date): string {
  return getFinancialYearLabelForDate(d);
}

/**
 * Calendar month key (YYYY-MM) — still Gregorian; use for month dropdowns.
 * FY month index 1 = April … 12 = March optional later.
 */
export function isDateInFinancialYear(saleDate: Date, fyStartYear: number): boolean {
  const start = getFinancialYearStartDate(fyStartYear);
  const end = getFinancialYearEndDate(fyStartYear);
  return saleDate >= start && saleDate <= end;
}

/** Parse `2024-25` or `24-25` → start year (full). */
export function parseFinancialYearLabelToStartYear(label: string): number | null {
  const t = label.trim();
  const m = t.match(/^(\d{2,4})-(\d{2})$/);
  if (!m) return null;
  let start = parseInt(m[1], 10);
  if (m[1].length === 2) {
    start += start >= 70 ? 1900 : 2000;
  }
  const endYy = parseInt(m[2], 10);
  const expectedEnd = (start + 1) % 100;
  if (endYy !== expectedEnd) return null;
  return start;
}

/**
 * Current FY quarter date range (start inclusive, end inclusive end-of-day).
 */
export function getFinancialYearQuarterBounds(
  fyStartYear: number,
  quarter: 1 | 2 | 3 | 4
): { start: Date; end: Date } {
  let startM: number;
  let endM: number;
  let startY = fyStartYear;
  let endY = fyStartYear;
  if (quarter === 1) {
    startM = 3;
    endM = 5;
  } else if (quarter === 2) {
    startM = 6;
    endM = 8;
  } else if (quarter === 3) {
    startM = 9;
    endM = 11;
  } else {
    startM = 0;
    endM = 2;
    startY = fyStartYear + 1;
    endY = fyStartYear + 1;
  }
  const start = new Date(startY, startM, 1);
  const end = new Date(endY, endM + 1, 0, 23, 59, 59, 999);
  return { start, end };
}

/** For "this quarter" quick select: FY quarter containing `now`. */
export function getCurrentFinancialYearQuarterBounds(now: Date = new Date()) {
  const fyStart = getFinancialYearStartYear(now);
  const q = getFinancialYearQuarter(now);
  return getFinancialYearQuarterBounds(fyStart, q);
}
