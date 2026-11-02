import { useLocation } from 'react-router-dom'
import { MobileNav } from './mobile-nav'
import { NAV_ITEMS } from '@/lib/constants'
import { Badge } from '@/components/ui/badge'
import { ShieldAlert } from 'lucide-react'

export function AppHeader() {
  const location = useLocation()
  const currentNav = NAV_ITEMS.find((item) =>
    item.href === '/' ? location.pathname === '/' : location.pathname.startsWith(item.href),
  )

  return (
    <header className="sticky top-0 z-30 flex h-16 w-full items-center justify-between border-b bg-background/95 px-4 backdrop-blur-sm sm:px-6">
      <div className="flex items-center gap-3">
        <MobileNav />
        <div>
          <h2 className="text-base font-semibold tracking-tight text-foreground sm:text-lg">
            {currentNav?.title || 'Overview'}
          </h2>
          <p className="hidden text-xs text-muted-foreground sm:block">
            {currentNav?.description || 'Retail operations platform'}
          </p>
        </div>
      </div>

      <div className="flex items-center gap-3">
        <Badge
          variant="outline"
          className="gap-1.5 border-amber-300 bg-amber-50/70 px-2.5 py-1 text-xs text-amber-800 dark:border-amber-800 dark:bg-amber-950/30 dark:text-amber-300"
        >
          <ShieldAlert className="h-3.5 w-3.5 text-amber-600 dark:text-amber-400" />
          <span className="hidden sm:inline">Contract Status:</span> Disconnected
        </Badge>
      </div>
    </header>
  )
}
