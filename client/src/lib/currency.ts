/**
 * Currency utilities for RetailOps Lite.
 * All monetary amounts in the system are stored and calculated in integer paise.
 * 1 Rupee = 100 Paise.
 */

/**
 * Format paise into Indian Rupee display format.
 * E.g., 59900 -> "₹599.00", 0 -> "₹0.00"
 */
export function formatPaise(paise: number | null | undefined): string {
  if (paise === null || paise === undefined || isNaN(paise)) {
    return '₹0.00'
  }

  const rupees = paise / 100
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(rupees)
}

/**
 * Convert paise to rupees (decimal).
 * E.g., 59900 -> 599.00
 */
export function paiseToRupees(paise: number): number {
  return Number((paise / 100).toFixed(2))
}

/**
 * Convert rupees to integer paise safely (avoiding float precision bugs).
 * E.g., "599.50" or 599.5 -> 59950
 */
export function rupeesToPaise(rupees: number | string): number {
  const numeric = typeof rupees === 'string' ? parseFloat(rupees) : rupees
  if (isNaN(numeric) || numeric < 0) {
    return 0
  }
  return Math.round(numeric * 100)
}
