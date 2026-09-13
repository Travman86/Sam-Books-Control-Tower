import * as React from "react"
import { useState } from "react"
import { Link, useLocation } from "wouter"
import {
  Radar,
  LayoutGrid,
  Rocket,
  ClipboardCheck,
  Activity,
  Gauge,
  LayoutDashboard,
  FolderKanban,
  FileText,
  CheckSquare,
  ActivitySquare,
  ListTodo,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  Menu,
} from "lucide-react"
import { cn } from "@/lib/utils"
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet"
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible"

/**
 * This app IS the Sam Books Control Tower — a cross-project back-office, not
 * just a code-authorization tool. "Sam Books" is a single expandable nav
 * item holding the live operational view (proxied from the connected Sam
 * Books instance, see pages/sam-books-*.tsx); "Authorization" below it is
 * this app's own project/feature governance workflow.
 */

const SAM_BOOKS_NAV = [
  { href: "/sam-books", label: "Overview", exact: true },
  { href: "/sam-books/projects", label: "Projects" },
  { href: "/sam-books/approvals", label: "Approvals" },
  { href: "/sam-books/agent-runs", label: "Agent runs" },
  { href: "/sam-books/performance", label: "Performance" },
]

const AUTHORIZATION_NAV = [
  { href: "/", label: "Dashboard", icon: LayoutDashboard, exact: true },
  { href: "/projects", label: "Connections", icon: FolderKanban },
  { href: "/policies", label: "Policies", icon: FileText },
  { href: "/reviews", label: "Reviews", icon: CheckSquare },
  { href: "/actions", label: "Actions", icon: ListTodo },
  { href: "/activity", label: "Activity", icon: ActivitySquare },
]

const SAM_BOOKS_SUB_ICON: Record<string, React.ElementType> = {
  "/sam-books": LayoutGrid,
  "/sam-books/projects": Rocket,
  "/sam-books/approvals": ClipboardCheck,
  "/sam-books/agent-runs": Activity,
  "/sam-books/performance": Gauge,
}

type NavItem = { href: string; label: string; icon?: React.ElementType; exact?: boolean }

function isActiveItem(location: string, item: NavItem): boolean {
  return item.exact ? location === item.href : location === item.href || location.startsWith(item.href + "/")
}

function isSamBooksActive(location: string): boolean {
  return location === "/sam-books" || location.startsWith("/sam-books/")
}

function SamBooksNav({ location, collapsed, onNavigate }: { location: string; collapsed: boolean; onNavigate?: () => void }) {
  const [open, setOpen] = useState(isSamBooksActive(location))

  if (collapsed) {
    // Collapsed rail: skip the expand/collapse affordance, just show the
    // group's icon linking straight to the overview page.
    return (
      <Link
        href="/sam-books"
        title="Sam Books"
        className={cn(
          "flex items-center justify-center h-10 rounded-md",
          isSamBooksActive(location) ? "bg-sidebar-accent text-sidebar-accent-foreground" : "text-sidebar-foreground/70 hover:bg-sidebar-accent/50",
        )}
      >
        <Radar className="w-4 h-4" />
      </Link>
    )
  }

  return (
    <Collapsible open={open} onOpenChange={setOpen}>
      <div className="px-3 pb-1.5 pt-4 text-[10px] font-semibold uppercase tracking-widest text-sidebar-foreground/40">
        Sam Books
      </div>
      <CollapsibleTrigger asChild>
        <button
          type="button"
          className={cn(
            "w-full flex items-center gap-3 h-10 px-3 rounded-md text-sm font-medium transition-colors",
            isSamBooksActive(location)
              ? "bg-sidebar-accent text-sidebar-accent-foreground"
              : "text-sidebar-foreground/70 hover:bg-sidebar-accent/50 hover:text-sidebar-foreground",
          )}
        >
          <Radar className={cn("w-4 h-4 shrink-0", isSamBooksActive(location) ? "text-sidebar-primary" : "text-sidebar-foreground/50")} />
          <span className="flex-1 text-left">Sam Books</span>
          <ChevronDown className={cn("w-3.5 h-3.5 shrink-0 transition-transform", open && "rotate-180")} />
        </button>
      </CollapsibleTrigger>
      <CollapsibleContent className="space-y-0.5 pt-0.5 pl-6">
        {SAM_BOOKS_NAV.map((item) => {
          const active = isActiveItem(location, item)
          const Icon = SAM_BOOKS_SUB_ICON[item.href] ?? LayoutGrid
          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={onNavigate}
              className={cn(
                "flex items-center gap-2.5 h-9 px-3 rounded-md text-sm transition-colors",
                active
                  ? "bg-sidebar-accent text-sidebar-accent-foreground font-medium"
                  : "text-sidebar-foreground/60 hover:bg-sidebar-accent/50 hover:text-sidebar-foreground",
              )}
            >
              <Icon className={cn("w-3.5 h-3.5 shrink-0", active ? "text-sidebar-primary" : "text-sidebar-foreground/40")} />
              {item.label}
            </Link>
          )
        })}
      </CollapsibleContent>
    </Collapsible>
  )
}

function NavGroup({
  title,
  items,
  location,
  collapsed,
  onNavigate,
}: {
  title: string
  items: NavItem[]
  location: string
  collapsed: boolean
  onNavigate?: () => void
}) {
  return (
    <div className="space-y-0.5">
      {!collapsed && (
        <div className="px-3 pb-1.5 pt-4 text-[10px] font-semibold uppercase tracking-widest text-sidebar-foreground/40">
          {title}
        </div>
      )}
      {items.map((item) => {
        const active = isActiveItem(location, item)
        const Icon = item.icon
        return (
          <Link
            key={item.href}
            href={item.href}
            title={collapsed ? item.label : undefined}
            onClick={onNavigate}
            className={cn(
              "flex items-center gap-3 h-10 rounded-md text-sm font-medium transition-colors",
              collapsed ? "justify-center px-0" : "px-3",
              active
                ? "bg-sidebar-accent text-sidebar-accent-foreground"
                : "text-sidebar-foreground/70 hover:bg-sidebar-accent/50 hover:text-sidebar-foreground",
            )}
          >
            {Icon && <Icon className={cn("w-4 h-4 shrink-0", active ? "text-sidebar-primary" : "text-sidebar-foreground/50")} />}
            {!collapsed && <span className="whitespace-nowrap">{item.label}</span>}
          </Link>
        )
      })}
    </div>
  )
}

function Brand({ collapsed }: { collapsed?: boolean }) {
  return (
    <div className={cn("h-16 flex items-center gap-3 border-b border-sidebar-border shrink-0", collapsed ? "justify-center px-0" : "px-5")}>
      <div className="w-9 h-9 shrink-0 rounded-lg bg-sidebar-primary text-sidebar-primary-foreground flex items-center justify-center">
        <Radar className="w-5 h-5" />
      </div>
      {!collapsed && <span className="font-semibold text-sidebar-foreground tracking-tight text-base whitespace-nowrap">Control Tower</span>}
    </div>
  )
}

export function Layout({ children }: { children: React.ReactNode }) {
  const [location] = useLocation()
  const [collapsed, setCollapsed] = useState(false)
  const [mobileOpen, setMobileOpen] = useState(false)

  return (
    <div className="min-h-[100dvh] flex flex-col md:flex-row bg-background">
      {/* Mobile header */}
      <div className="md:hidden flex items-center justify-between px-4 h-14 bg-sidebar border-b border-sidebar-border sticky top-0 z-30">
        <Link href="/sam-books" className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-md bg-sidebar-primary text-sidebar-primary-foreground flex items-center justify-center">
            <Radar className="w-4 h-4" />
          </div>
          <span className="font-semibold text-sidebar-foreground text-sm">Control Tower</span>
        </Link>
        <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
          <SheetTrigger asChild>
            <button type="button" aria-label="Open menu" className="p-2 text-sidebar-foreground/70">
              <Menu className="w-5 h-5" />
            </button>
          </SheetTrigger>
          <SheetContent side="left" className="w-64 bg-sidebar border-sidebar-border p-0">
            <div className="flex flex-col h-full">
              <Brand />
              <nav className="flex-1 px-3 py-2 overflow-y-auto">
                <SamBooksNav location={location} collapsed={false} onNavigate={() => setMobileOpen(false)} />
                <NavGroup title="Authorization" items={AUTHORIZATION_NAV} location={location} collapsed={false} onNavigate={() => setMobileOpen(false)} />
              </nav>
            </div>
          </SheetContent>
        </Sheet>
      </div>

      {/* Desktop sidebar */}
      <aside
        style={{ width: collapsed ? 64 : 240 }}
        className="hidden md:flex bg-sidebar border-r border-sidebar-border flex-col shrink-0 relative z-10 transition-[width] duration-200 ease-in-out"
      >
        <Brand collapsed={collapsed} />
        <nav className="flex-1 px-3 py-2 overflow-y-auto">
          <SamBooksNav location={location} collapsed={collapsed} />
          <NavGroup title="Authorization" items={AUTHORIZATION_NAV} location={location} collapsed={collapsed} />
        </nav>
        <button
          type="button"
          onClick={() => setCollapsed((v) => !v)}
          aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
          className="absolute -right-3 top-16 w-6 h-6 rounded-full bg-sidebar border border-sidebar-border shadow-sm flex items-center justify-center text-sidebar-foreground/60 hover:text-sidebar-foreground transition-colors z-20"
        >
          {collapsed ? <ChevronRight className="w-3.5 h-3.5" /> : <ChevronLeft className="w-3.5 h-3.5" />}
        </button>
      </aside>

      <main className="flex-1 flex flex-col min-w-0">
        <div className="flex-1 overflow-auto p-6 md:p-10">
          <div className="max-w-6xl mx-auto">{children}</div>
        </div>
      </main>
    </div>
  )
}
