export const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL || '/api'

export const APP_CONFIG = {
  name: 'RetailOps Lite',
  tagline: 'Smart Inventory & Order Management',
  company: 'RetailOps Inc.',
  currencySymbol: '₹',
  defaultPageSize: 20,
}

export const NAV_ITEMS = [
  {
    title: 'Dashboard',
    href: '/',
    icon: 'LayoutDashboard',
    description: 'Operational overview, KPIs, and real-time alerts',
  },
  {
    title: 'Products',
    href: '/products',
    icon: 'Package',
    description: 'Catalog management, pricing, and active listings',
  },
  {
    title: 'Orders',
    href: '/orders',
    icon: 'ShoppingCart',
    description: 'Customer order tracking, fulfillment, and state workflow',
  },
  {
    title: 'Inventory',
    href: '/inventory',
    icon: 'Boxes',
    description: 'Stock levels, restock alerts, and audit trail',
  },
] as const
