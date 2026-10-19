import * as React from "react"
import { useState } from "react"
import { Link, useLocation } from "wouter"
import {
  Radar, LayoutGrid, Rocket, ClipboardCheck, Activity, Gauge, LayoutDashboard, FolderKanban, FileText,
  CheckSquare, ActivitySquare, ListTodo, ChevronLeft, ChevronRight, Menu, LogOut, Route, Inbox,
  ShieldCheck, Network, Siren,
} from "lucide-react"
import { useFilters, useMonitoring } from "@/lib/monitoring"
import { cn } from "@/lib/utils"
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet"
import { useLogoutMutation } from "@/hooks/use-auth"

const MONITORING_NAV: NavItem[] = [
  { href: "/", label: "Overview", icon: LayoutGrid, exact: true },
  { href: "/journeys", label: "User journeys", icon: Route, exact: true },
  { href: "/journeys/statements", label: "Statements", icon: FileText },
  { href: "/imports", label: "Imports & queues", icon: Inbox },
  { href: "/performance", label: "Performance", icon: Gauge },
  { href: "/data-quality", label: "Data quality", icon: ShieldCheck },
  { href: "/dependencies", label: "Dependencies", icon: Network },
  { href: "/incidents", label: "Incidents", icon: Siren },
  { href: "/releases", label: "Releases", icon: Rocket },
]

const GOVERNANCE_NAV: NavItem[] = [
  { href: "/governance", label: "Governance home", icon: LayoutDashboard, exact: true },
  { href: "/projects", label: "Connections", icon: FolderKanban },
  { href: "/reviews", label: "Reviews", icon: CheckSquare },
  { href: "/actions", label: "Actions", icon: ListTodo },
  { href: "/activity", label: "Activity", icon: ActivitySquare },
  { href: "/policies", label: "Policies", icon: FileText },
  { href: "/sam-books/approvals", label: "Sam Books approvals", icon: ClipboardCheck },
  { href: "/sam-books/projects", label: "Sam Books projects", icon: FolderKanban },
  { href: "/sam-books/agent-runs", label: "Agent runs", icon: Activity },
]

type NavItem = { href: string; label: string; icon?: React.ElementType; exact?: boolean }

function isActiveItem(location: string, item: NavItem): boolean {
  if (item.href === "/") return location === "/" || location === "/sam-books"
  if (item.href === "/performance" && location === "/sam-books/performance") return true
  return item.exact ? location === item.href : location === item.href || location.startsWith(item.href + "/")
}

const GOV_PREFIXES = ["/governance", "/projects", "/reviews", "/actions", "/activity", "/policies"]
function isGovernance(location: string) {
  if (location === "/sam-books" || location === "/sam-books/performance") return false
  return location.startsWith("/sam-books/") || GOV_PREFIXES.some((p) => location === p || location.startsWith(p + "/"))
}

function FilterBar({ governance }: { governance: boolean }) {
  const { org, days, setOrg, setDays } = useFilters()
  const { data } = useMonitoring()
  if (governance) {
    return <div data-testid="note-filters-na" className="px-6 md:px-10 py-2 text-xs text-slate-600 bg-white/70 border-b border-slate-200">Shared monitoring filters (environment, organization, time) do not apply to governance screens.</div>
  }
  const orgs = data?.overview?.organizations ?? []
  return (
    <div className="px-6 md:px-10 py-2 bg-white/70 border-b border-slate-200 flex flex-wrap items-center gap-x-4 gap-y-2 text-xs" data-testid="bar-filters">
      <label className="flex items-center gap-1.5 text-slate-600">Environment
        <span className="border border-slate-200 bg-white rounded px-2 py-1 text-slate-800" data-testid="text-env">{!data ? "Unknown" : !data.connection.configured ? <b className="text-slate-500">Not connected</b> : <>{data.connection.hostname ?? "Connected deployment"} <b className="text-slate-500">NOT VERIFIED</b></>}</span>
      </label>
      <label className="flex items-center gap-1.5 text-slate-600">Organization
        <select data-testid="select-org" value={org} onChange={(e) => setOrg(e.target.value)} className="border border-slate-200 bg-white rounded px-2 py-1 text-slate-800 max-w-[12rem]">
          <option value="all">All organizations</option>
          {orgs.map((o) => <option key={o.id} value={String(o.id)}>{o.name}</option>)}
        </select>
      </label>
      <div className="flex items-center gap-1.5 text-slate-600">Time
        {([7, 30] as const).map((d) => (
          <button key={d} type="button" data-testid={`button-days-${d}`} onClick={() => setDays(d)} className={cn("rounded px-2 py-1 border", days === d ? "bg-teal-700 text-white border-teal-700" : "bg-white border-slate-200 text-slate-700")}>{d}d</button>
        ))}
      </div>
      <span className="text-slate-500">Applies to org list, failure sample and 7d/30d metrics. Queue counts are fixed 24h and global.</span>
    </div>
  )
}

function NavSection({ title, items, location, collapsed, onNavigate }: { title: string; items: NavItem[]; location: string; collapsed: boolean; onNavigate?: () => void }) {
  return (
    <div className="space-y-0.5">
      {!collapsed && <div className="px-3 pb-1.5 pt-4 text-[10px] font-semibold uppercase tracking-widest text-sidebar-foreground/40">{title}</div>}
      {items.map((item) => {
        const active = isActiveItem(location, item)
        const Icon = item.icon
        return (
          <Link key={item.href} href={item.href} title={collapsed ? item.label : undefined} onClick={onNavigate}
            data-testid={`nav-${item.href.replace(/\//g, "-") || "root"}`}
            className={cn("flex items-center gap-3 h-9 rounded-md text-sm transition-colors", collapsed ? "justify-center px-0" : "px-3",
              active ? "bg-sidebar-accent text-sidebar-accent-foreground font-medium" : "text-sidebar-foreground/70 hover:bg-sidebar-accent/50 hover:text-sidebar-foreground")}>
            {Icon && <Icon className={cn("w-4 h-4 shrink-0", active ? "text-sidebar-primary" : "text-sidebar-foreground/50")} />}
            {!collapsed && <span className="whitespace-nowrap">{item.label}</span>}
          </Link>
        )
      })}
    </div>
  )
}

function SignOutButton({ collapsed }: { collapsed?: boolean }) {
  const logout = useLogoutMutation()
  return (
    <button
      type="button"
      onClick={() => logout.mutate()}
      disabled={logout.isPending}
      title={collapsed ? "Sign out" : undefined}
      className={cn(
        "flex items-center gap-3 h-10 rounded-md text-sm font-medium text-sidebar-foreground/70 hover:bg-sidebar-accent/50 hover:text-sidebar-foreground transition-colors disabled:opacity-50",
        collapsed ? "justify-center px-0 w-full" : "px-3 w-full",
      )}
    >
      <LogOut className="w-4 h-4 shrink-0" />
      {!collapsed && <span>{logout.isPending ? "Signing out…" : "Sign out"}</span>}
    </button>
  )
}

function Brand({ collapsed }: { collapsed?: boolean }) {
  return (
    <div className={cn("h-16 flex items-center gap-3 border-b border-sidebar-border shrink-0", collapsed ? "justify-center px-0" : "px-5")}>
      <div className="w-9 h-9 shrink-0 rounded-lg bg-sidebar-primary text-sidebar-primary-foreground flex items-center justify-center">
        <Radar className="w-5 h-5" />
      </div>
      {!collapsed && <div className="leading-tight whitespace-nowrap"><div className="font-semibold text-sidebar-foreground text-base">Sam Books</div><div className="text-[10px] tracking-[0.22em] font-semibold text-sidebar-primary">CONTROL TOWER</div></div>}
    </div>
  )
}

export function Layout({ children }: { children: React.ReactNode }) {
  const [location] = useLocation()
  const [collapsed, setCollapsed] = useState(false)
  const [mobileOpen, setMobileOpen] = useState(false)

  return (
    <div className="min-h-[100dvh] flex flex-col md:flex-row bg-background overflow-x-hidden">
      {/* Mobile header */}
      <div className="md:hidden flex items-center justify-between px-4 h-14 bg-sidebar border-b border-sidebar-border sticky top-0 z-30">
        <Link href="/" className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-md bg-sidebar-primary text-sidebar-primary-foreground flex items-center justify-center">
            <Radar className="w-4 h-4" />
          </div>
          <span className="font-semibold text-sidebar-foreground text-sm">Sam Books <span className="text-[10px] tracking-widest text-sidebar-primary">CONTROL TOWER</span></span>
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
                <NavSection title="Monitoring" items={MONITORING_NAV} location={location} collapsed={false} onNavigate={() => setMobileOpen(false)} />
                <NavSection title="Governance" items={GOVERNANCE_NAV} location={location} collapsed={false} onNavigate={() => setMobileOpen(false)} />
              </nav>
              <div className="px-3 py-3 border-t border-sidebar-border">
                <SignOutButton />
              </div>
            </div>
          </SheetContent>
        </Sheet>
      </div>

      {/* Desktop sidebar */}
      <aside
        style={{ width: collapsed ? 64 : 240 }}
        className="hidden md:flex md:sticky md:top-0 md:h-[100dvh] bg-sidebar border-r border-sidebar-border flex-col shrink-0 z-10 transition-[width] duration-200 ease-in-out"
      >
        <Brand collapsed={collapsed} />
        <nav className="flex-1 min-h-0 px-3 py-2 overflow-y-auto">
          <NavSection title="Monitoring" items={MONITORING_NAV} location={location} collapsed={collapsed} />
          <NavSection title="Governance" items={GOVERNANCE_NAV} location={location} collapsed={collapsed} />
        </nav>
        <div className={cn("px-3 py-3 border-t border-sidebar-border", collapsed && "px-2")}>
          <SignOutButton collapsed={collapsed} />
        </div>
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
        <FilterBar governance={isGovernance(location)} />
        <div className="flex-1 overflow-auto p-6 md:p-10">
          <div className="max-w-6xl mx-auto">{children}</div>
        </div>
      </main>
    </div>
  )
}
