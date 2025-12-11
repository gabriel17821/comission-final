/**
 * Format a number with thousands separators and two decimal places
 */
export const formatCurrency = (value: number): string => {
  return value.toLocaleString('en-US', { 
    minimumFractionDigits: 2, 
    maximumFractionDigits: 2 
  });
};

/**
 * Format a number with thousands separators (no decimals)
 */
export const formatNumber = (value: number): string => {
  return value.toLocaleString('en-US');
};

/**
 * Format input with thousands separators while typing
 */
export const formatInputNumber = (value: string): string => {
  // Remove all non-digits
  const numbers = value.replace(/\D/g, '');
  if (!numbers) return '';
  return parseInt(numbers, 10).toLocaleString('en-US');
};

/**
 * Parse formatted number back to number
 */
export const parseFormattedNumber = (value: string): number => {
  return parseInt(value.replace(/,/g, ''), 10) || 0;
};