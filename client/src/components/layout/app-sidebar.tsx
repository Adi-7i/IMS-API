import { NavLink } from 'react-router-dom'
import {
  LayoutDashboard,
  Package,
  ShoppingCart,
  Boxes,
  Store,
  Layers,
} from 'lucide-react'
import { NAV_ITEMS, APP_CONFIG } from '@/lib/constants'
import { cn } from '@/lib/cn'
import { Badge } from '@/components/ui/badge'

const ICON_MAP = {
  LayoutDashboard,
  Package,
  ShoppingCart,
  Boxes,
}

interface AppSidebarProps {
  className?: string
  onItemClick?: () => void
}

export function AppSidebar({ className, onItemClick }: AppSidebarProps) {
  return (
    <aside
      className={cn(
        'flex h-full w-64 flex-col border-r bg-card text-card-foreground',
        className,
      )}
    >
      {/* Brand Header */}
      <div className="flex h-16 items-center gap-3 border-b px-6">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary text-primary-foreground shadow-sm">
          <Store className="h-5 w-5" />
        </div>
        <div className="flex flex-col">
          <span className="font-semibold tracking-tight text-foreground">
            {APP_CONFIG.name}
          </span>
          <span className="text-[11px] text-muted-foreground font-medium">
            Operations Suite
          </span>
        </div>
      </div>

      {/* Navigation */}
      <div className="flex-1 overflow-y-auto px-4 py-5">
        <div className="mb-2 px-3 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
          Core Operations
        </div>
        <nav className="space-y-1">
          {NAV_ITEMS.map((item) => {
            const Icon = ICON_MAP[item.icon as keyof typeof ICON_MAP] || Layers

            return (
              <NavLink
                key={item.href}
                to={item.href}
                onClick={onItemClick}
                end={item.href === '/'}
                className={({ isActive }) =>
                  cn(
                    'group flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors',
                    isActive
                      ? 'bg-primary text-primary-foreground shadow-xs'
                      : 'text-muted-foreground hover:bg-muted hover:text-foreground',
                  )
                }
              >
                {({ isActive }) => (
                  <>
                    <Icon
                      className={cn(
                        'h-4 w-4 shrink-0 transition-colors',
                        isActive
                          ? 'text-primary-foreground'
                          : 'text-muted-foreground group-hover:text-foreground',
                      )}
                    />
                    <span>{item.title}</span>
                  </>
                )}
              </NavLink>
            )
          })}
        </nav>
      </div>

      {/* Backend Contract Status Badge */}
      <div className="border-t p-4">
        <div className="rounded-xl border bg-muted/40 p-3.5 text-xs">
          <div className="flex items-center justify-between">
            <span className="font-medium text-foreground">Retail Operations</span>
            <Badge variant="outline" className="text-[10px] bg-background">
              RetailOps Lite
            </Badge>
          </div>
          <div className="mt-2.5 flex items-center gap-2 text-muted-foreground">
            <span className="relative flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500" />
            </span>
            <span className="text-[11px]">Inventory & Orders</span>
          </div>
          <p className="mt-1 text-[10px] text-muted-foreground leading-normal">
            Connected inventory and order management.
          </p>
        </div>
      </div>
    </aside>
  )
}
