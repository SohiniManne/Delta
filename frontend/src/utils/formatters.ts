/**
 * Indian Rupee (₹) and Indian Numbering System Formatting Utilities
 */

export function formatINR(val: number | null | undefined, decimals = 2): string {
  if (val === null || val === undefined || isNaN(val)) return '₹0.00';
  
  const fixed = val.toFixed(decimals);
  const parts = fixed.split('.');
  const intPart = parts[0];
  const decPart = parts.length > 1 ? `.${parts[1]}` : '';

  // Indian currency grouping: 3 digits for rightmost group, then groups of 2 digits
  const lastThree = intPart.substring(intPart.length - 3);
  const otherNumbers = intPart.substring(0, intPart.length - 3);
  const formattedInt = otherNumbers !== '' ? otherNumbers.replace(/\B(?=(\d{2})+(?!\d))/g, ',') + ',' + lastThree : lastThree;

  return `₹${formattedInt}${decPart}`;
}

export function formatDeltaINR(val: number, isDegraded = false): string {
  const isPositive = val >= 0;
  const sign = isPositive ? '+' : '-';
  const absVal = Math.abs(val);
  const formatted = formatINR(absVal, isDegraded ? 1 : 2);
  const prefix = isDegraded ? '~' : '';
  return `${prefix}${sign}${formatted}`;
}

export function formatPercentDelta(val: number, isDegraded = false): string {
  const isPositive = val >= 0;
  const sign = isPositive ? '+' : '';
  const digits = isDegraded ? 1 : 2;
  const prefix = isDegraded ? '~' : '';
  return `${prefix}${sign}${val.toFixed(digits)}%`;
}

export function formatMarketCapINR(val: number | null | undefined): string {
  if (!val || isNaN(val)) return '—';

  // 1 Crore = 10,000,000 (10^7)
  // 1 Lakh Crore = 1,00,000 Crore = 10^12
  const crore = val / 1e7;

  if (crore >= 100000) {
    const lakhCrore = crore / 100000;
    return `₹${lakhCrore.toFixed(2)} L Cr`;
  }

  if (crore >= 1) {
    const fixedCr = crore.toFixed(crore >= 100 ? 0 : 1);
    return `₹${Number(fixedCr).toLocaleString('en-IN')} Cr`;
  }

  return formatINR(val, 0);
}

export function formatIndianNumber(val: number): string {
  return Number(val).toLocaleString('en-IN');
}
