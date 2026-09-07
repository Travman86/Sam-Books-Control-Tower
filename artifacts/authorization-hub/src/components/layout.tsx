import * as React from "react"
import { Link, useLocation } from "wouter"
import { Shield, LayoutDashboard, FolderKanban, FileText, CheckSquare, ActivitySquare, ListTodo } from "lucide-react"
import { cn } from "@/lib/utils"

export function Layout({ children }: { children: React.ReactNode }) {
  const [location] = useLocation()

  const navItems = [
    { href: "/", label: "Dashboard", icon: LayoutDashboard },
    { href: "/projects", label: "Projects", icon: FolderKanban },
    { href: "/policies", label: "Policies", icon: FileText },
    { href: "/reviews", label: "Reviews", icon: CheckSquare },
    { href: "/actions", label: "Actions", icon: ListTodo },
    { href: "/activity", label: "Activity", icon: ActivitySquare },
  ]

  return (
    <div className="min-h-[100dvh] flex bg-background">
      <aside className="w-64 bg-sidebar border-r border-sidebar-border flex flex-col shrink-0">
        <div className="h-16 flex items-center px-6 border-b border-sidebar-border">
          <Shield className="w-6 h-6 text-sidebar-primary mr-3" />
          <span className="font-semibold text-sidebar-foreground tracking-wide text-sm uppercase">Auth Hub</span>
        </div>
        <nav className="flex-1 py-6 px-3 space-y-1">
          {navItems.map((item) => {
            const isActive = location === item.href || (item.href !== "/" && location.startsWith(item.href))
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "flex items-center px-3 py-2.5 rounded-md text-sm font-medium transition-colors",
                  isActive
                    ? "bg-sidebar-accent text-sidebar-accent-foreground"
                    : "text-sidebar-foreground/70 hover:bg-sidebar-accent/50 hover:text-sidebar-foreground"
                )}
              >
                <item.icon className={cn("w-4 h-4 mr-3", isActive ? "text-sidebar-primary" : "text-sidebar-foreground/50")} />
                {item.label}
              </Link>
            )
          })}
        </nav>
      </aside>
      <main className="flex-1 flex flex-col min-w-0">
        <div className="flex-1 overflow-auto p-6 md:p-10">
          <div className="max-w-5xl mx-auto">
            {children}
          </div>
        </div>
      </main>
    </div>
  )
}
