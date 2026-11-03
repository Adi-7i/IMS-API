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
  const value = String(rupees).trim()
  if (!/^\d+(?:\.\d{1,2})?$/.test(value)) throw new Error('Enter a valid price with at most two decimal places')
  const [whole, fraction = ''] = value.split('.')
  const paise = Number(whole) * 100 + Number(fraction.padEnd(2, '0'))
  if (!Number.isSafeInteger(paise)) throw new Error('Price is too large')
  return paise
}
