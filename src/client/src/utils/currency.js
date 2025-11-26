/**
 * Currency Formatting Utility
 * 
 * Centralized currency formatting for consistent display across the application
 */

/**
 * Format a number as currency (USD)
 * @param {number} amount - The amount to format
 * @param {object} options - Formatting options
 * @returns {string} Formatted currency string (e.g., "$1,234.56")
 */
export function formatCurrency(amount, options = {}) {
  const {
    minimumFractionDigits = 2,
    maximumFractionDigits = 2,
    showZero = true
  } = options

  // Handle null, undefined, or NaN
  if (amount == null || isNaN(amount)) {
    return showZero ? '$0.00' : '-'
  }

  const num = typeof amount === 'string' ? parseFloat(amount) : amount

  if (isNaN(num)) {
    return showZero ? '$0.00' : '-'
  }

  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits,
    maximumFractionDigits
  }).format(num)
}

/**
 * Format a number as currency without the dollar sign (for tables where $ is in header)
 * @param {number} amount - The amount to format
 * @param {object} options - Formatting options
 * @returns {string} Formatted number string (e.g., "1,234.56")
 */
export function formatCurrencyValue(amount, options = {}) {
  const {
    minimumFractionDigits = 2,
    maximumFractionDigits = 2,
    showZero = true
  } = options

  // Handle null, undefined, or NaN
  if (amount == null || isNaN(amount)) {
    return showZero ? '0.00' : '-'
  }

  const num = typeof amount === 'string' ? parseFloat(amount) : amount

  if (isNaN(num)) {
    return showZero ? '0.00' : '-'
  }

  return new Intl.NumberFormat('en-US', {
    minimumFractionDigits,
    maximumFractionDigits
  }).format(num)
}

