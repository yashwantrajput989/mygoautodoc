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
  { title: "Manual Review", path: "/manual-review", icon: ClipboardCheck },
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
      <header className="h-12 bg-shell-bar text-shell-bar-foreground flex items-center px-4 shrink-0 z-50">
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="p-1.5 rounded hover:bg-white/10 mr-3 transition-colors"
        >
          {collapsed ? <Menu className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
        </button>
        <div className="flex items-center gap-2 mr-8">
          <div className="w-6 h-6 rounded bg-primary flex items-center justify-center">
            <FileText className="h-3.5 w-3.5 text-primary-foreground" />
          </div>
          <span className="font-semibold text-sm tracking-tight">Document Automation Hub</span>
        </div>

        <div className="flex-1 flex justify-center max-w-md mx-auto">
          <div className="relative w-full">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-white/50" />
            <input
              type="text"
              placeholder="Search documents, suppliers..."
              className="w-full h-7 pl-8 pr-3 rounded bg-white/10 text-xs text-white placeholder:text-white/40 border-none outline-none focus:bg-white/15 transition-colors"
            />
          </div>
        </div>

        <div className="flex items-center gap-1 ml-auto">
          <button className="relative p-2 rounded hover:bg-white/10 transition-colors">
            <Bell className="h-4 w-4" />
            <span className="absolute top-1 right-1 w-2 h-2 rounded-full bg-accent" />
          </button>
          <button className="flex items-center gap-2 p-1.5 rounded hover:bg-white/10 transition-colors">
            <div className="w-6 h-6 rounded-full bg-primary flex items-center justify-center">
              <User className="h-3.5 w-3.5" />
            </div>
            <span className="text-xs hidden sm:inline">Admin User</span>
          </button>
        </div>
      </header>

      <div className="flex flex-1 overflow-hidden">
        {/* Side Navigation */}
        <nav
          className={cn(
            "bg-sidebar border-r border-sidebar-border shrink-0 transition-all duration-200 flex flex-col",
            collapsed ? "w-12" : "w-56"
          )}
        >
          <div className="flex-1 py-2">
            {navItems.map((item) => {
              const isActive = location.pathname === item.path;
              return (
                <Link
                  key={item.path}
                  to={item.path}
                  className={cn(
                    "flex items-center gap-3 px-3 py-2.5 mx-1 rounded text-sm transition-colors",
                    isActive
                      ? "bg-primary/8 text-primary font-medium border-l-2 border-primary ml-0 pl-2.5"
                      : "text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
                  )}
                  title={collapsed ? item.title : undefined}
                >
                  <item.icon className="h-4 w-4 shrink-0" />
                  {!collapsed && <span>{item.title}</span>}
                </Link>
              );
            })}
          </div>
        </nav>

        {/* Main Content */}
        <main className="flex-1 overflow-auto bg-background">
          {children}
        </main>
      </div>
    </div>
  );
}
