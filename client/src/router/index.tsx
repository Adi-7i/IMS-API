import { createBrowserRouter } from 'react-router-dom'
import { AppLayout } from '@/components/layout/app-layout'
import { DashboardPage } from '@/pages/dashboard-page'
import { ProductsPage } from '@/pages/products-page'
import { OrdersPage } from '@/pages/orders-page'
import { InventoryPage } from '@/pages/inventory-page'
import { NotFoundPage } from '@/pages/not-found-page'

export const router = createBrowserRouter([
  {
    path: '/',
    element: <AppLayout />,
    children: [
      {
        index: true,
        element: <DashboardPage />,
      },
      {
        path: 'products',
        element: <ProductsPage />,
      },
      {
        path: 'orders',
        element: <OrdersPage />,
      },
      {
        path: 'inventory',
        element: <InventoryPage />,
      },
      {
        path: '*',
        element: <NotFoundPage />,
      },
    ],
  },
])
