import { Outlet } from 'react-router-dom'
import { AppSidebar } from './app-sidebar'
import { AppHeader } from './app-header'
import { Toaster } from '@/components/ui/sonner'
import { TooltipProvider } from '@/components/ui/tooltip'

export function AppLayout() {
  return (
    <TooltipProvider>
      <div className="flex min-h-screen bg-muted/20 font-sans antialiased">
        {/* Desktop Sidebar */}
        <div className="hidden lg:block lg:w-64 lg:shrink-0">
          <div className="fixed inset-y-0 z-40 w-64">
            <AppSidebar />
          </div>
        </div>

        {/* Main Content Area */}
        <div className="flex min-w-0 flex-1 flex-col lg:pl-0">
          <AppHeader />
          <main className="flex-1 p-4 sm:p-6 lg:p-8">
            <div className="mx-auto max-w-7xl">
              <Outlet />
            </div>
          </main>
        </div>
      </div>
      <Toaster position="top-right" richColors />
    </TooltipProvider>
  )
}
