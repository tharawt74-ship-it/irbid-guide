export const formatCurrency = (value: number, hideNumbers: boolean, includeJOD: boolean = true) => {
  if (hideNumbers) return '*****' + (includeJOD ? ' د.أ' : '');
  const sign = value < 0 ? '-' : '';
  const absValue = Math.abs(value);
  // Using en-US for numbers to keep them consistent, but we want the minus on the left.
  // In RTL, standard '-' might jump to the right. 
  // We'll wrap the whole number in LRM (\u200E) to force LTR behavior for the number part.
  const formattedNumber = absValue.toLocaleString('en-US', {minimumFractionDigits: 4, maximumFractionDigits: 4});
  return `\u200E${sign}${formattedNumber}${includeJOD ? ' د.أ' : ''}`;
};

export const formatQuantity = (value: number | string, _hideNumbers: boolean) => {
  // Logic updated: Hide numbers should only affect financial data. Quantity is safe.
  if (typeof value === 'number') {
    const sign = value < 0 ? '-' : '';
    const absValue = Math.abs(value);
    const formattedNumber = absValue.toLocaleString('en-US', {minimumFractionDigits: 4, maximumFractionDigits: 4});
    return `\u200E${sign}${formattedNumber}`;
  }
  return value;
};
