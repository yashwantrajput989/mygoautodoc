import { ReactNode } from "react";
import { Link, useLocation } from "react-router-dom";
import {
  LayoutDashboard,
  FileText,
  ClipboardCheck,
  Copy,
  BarChart3,
  Settings,
  Search,
  Bell,
  User,
  ChevronLeft,
  Menu,
} from "lucide-react";
import { useState } from "react";
import { cn } from "@/lib/utils";

const navItems = [
  { title: "Dashboard", path: "/", icon: LayoutDashboard },
  { title: "Documents", path: "/documents", icon: FileText },
  { title: "Duplicate Monitor", path: "/duplicate-monitor", icon: Copy },
  { title: "Analytics", path: "/analytics", icon: BarChart3 },
  { title: "Settings", path: "/settings", icon: Settings },
];

interface AppShellProps {
  children: ReactNode;
}

export function AppShell({ children }: AppShellProps) {
  const location = useLocation();
  const [collapsed, setCollapsed] = useState(false);

  return (
    <div className="min-h-screen flex flex-col w-full">
      {/* Shell Bar */}
      <header className="h-16 bg-white border-b border-border text-foreground flex items-center px-6 shrink-0 z-50 shadow-sm">
        <div className="flex items-center gap-3 mr-8 ml-2">
          <img src="/logo.png" alt="MY DocSyncAI" className="h-12 w-auto" />
        </div>

        <div className="flex-1 flex justify-center max-w-md mx-auto">
          <div className="relative w-full">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <input
              type="text"
              placeholder="Search documents, suppliers..."
              className="w-full h-10 pl-10 pr-4 rounded-md bg-muted/50 text-sm text-foreground placeholder:text-muted-foreground border-none outline-none focus:ring-1 focus:ring-primary transition-all"
            />
          </div>
        </div>

        <div className="flex items-center gap-2 ml-auto">
          <button className="relative p-2 rounded hover:bg-muted transition-colors">
            <Bell className="h-5 w-5 text-muted-foreground" />
            <span className="absolute top-2 right-2 w-2 h-2 rounded-full bg-primary border-2 border-white" />
          </button>
          <button className="flex items-center gap-3 p-1.5 rounded-full hover:bg-muted transition-colors border border-transparent hover:border-border ml-2 px-3">
            <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center text-primary-foreground">
              <User className="h-4 w-4" />
            </div>
            <span className="text-sm font-medium hidden sm:inline">Admin User</span>
          </button>
        </div>
      </header>

      <div className="flex flex-1 overflow-hidden">
        {/* Side Navigation */}
        <nav
          className={cn(
            "bg-sidebar border-r border-sidebar-border shrink-0 transition-all duration-200 flex flex-col",
            collapsed ? "w-14" : "w-64"
          )}
        >
          <div className="flex-1 py-4 flex flex-col">
            <div className="flex-1">
              {navItems.map((item) => {
                const isActive = location.pathname.startsWith(item.path) && (item.path !== "/" || location.pathname === "/");
                return (
                  <Link
                    key={item.path}
                    to={item.path}
                    className={cn(
                      "flex items-center gap-3 px-3 py-3 mx-2 rounded-md text-sm transition-all duration-200 group mb-1",
                      isActive
                        ? "bg-primary text-primary-foreground font-semibold shadow-sm"
                        : "text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
                    )}
                    title={collapsed ? item.title : undefined}
                  >
                    <item.icon className={cn("h-5 w-5 shrink-0", isActive ? "text-primary-foreground" : "text-muted-foreground group-hover:text-primary")} />
                    {!collapsed && <span className="truncate">{item.title}</span>}
                  </Link>
                );
              })}
            </div>

            {/* Collapse Toggle Button */}
            <div className="p-2 border-t border-sidebar-border">
              <button
                onClick={() => setCollapsed(!collapsed)}
                className="w-full flex items-center justify-center gap-2 py-2 rounded-md hover:bg-sidebar-accent text-sidebar-foreground transition-colors"
                title={collapsed ? "Expand Sidebar" : "Collapse Sidebar"}
              >
                {collapsed ? (
                  <Menu className="h-5 w-5" />
                ) : (
                  <>
                    <ChevronLeft className="h-5 w-5" />
                    <span className="text-xs font-semibold uppercase tracking-wider">Collapse</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </nav>

        {/* Main Content */}
        <main className="flex-1 flex flex-col min-h-0 overflow-hidden bg-background">
          {children}
        </main>
      </div>
    </div>
  );
}
