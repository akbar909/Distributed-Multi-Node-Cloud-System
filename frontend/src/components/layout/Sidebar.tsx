/**
 * Sidebar navigation component for desktop layout.
 * Dark navy design with active state indicators.
 */

import { NavLink } from "react-router-dom";
import {
  LayoutDashboard,
  Upload,
  ListTodo,
  Monitor,
  BarChart3,
  History,
  Cloud,
  Cpu,
} from "lucide-react";

const navItems = [
  { to: "/", icon: LayoutDashboard, label: "Dashboard" },
  { to: "/upload", icon: Upload, label: "Upload & Process" },
  { to: "/tasks", icon: ListTodo, label: "Task Monitor" },
  { to: "/workers", icon: Monitor, label: "Workers" },
  { to: "/benchmarks", icon: BarChart3, label: "Benchmarks" },
  { to: "/history", icon: History, label: "History" },
];

interface SidebarProps {
  deploymentMode?: string;
}

export default function Sidebar({ deploymentMode = "local" }: SidebarProps) {
  return (
    <aside className="hidden lg:flex lg:flex-col lg:w-64 bg-navy-900 text-white min-h-screen fixed left-0 top-0 z-30">
      {/* Logo */}
      <div className="flex items-center gap-3 px-6 py-5 border-b border-white/10">
        <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-brand-600 shadow-lg shadow-brand-600/30">
          <Cpu className="w-5 h-5 text-white" />
        </div>
        <div>
          <h1 className="text-base font-bold tracking-tight">CDC Processor</h1>
          <p className="text-xs text-gray-400 font-medium">Image Pipeline</p>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
        {navItems.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.to === "/"}
            className={({ isActive }) =>
              `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-200 group focus-ring ${
                isActive
                  ? "bg-brand-600/20 text-brand-400 shadow-sm"
                  : "text-gray-400 hover:text-white hover:bg-white/5"
              }`
            }
          >
            <item.icon
              className="w-5 h-5 flex-shrink-0 transition-colors"
              strokeWidth={1.8}
            />
            <span>{item.label}</span>
          </NavLink>
        ))}
      </nav>

      {/* Deployment Mode Badge */}
      <div className="px-4 py-4 border-t border-white/10">
        <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-white/5">
          <Cloud className="w-4 h-4 text-brand-400" />
          <span className="text-xs font-medium text-gray-300">
            {deploymentMode === "cloud" ? "Cloud Deployment" : "Local Docker"}
          </span>
          <span
            className={`ml-auto w-2 h-2 rounded-full ${
              deploymentMode === "cloud" ? "bg-brand-400" : "bg-success-400"
            } animate-pulse-slow`}
          />
        </div>
      </div>
    </aside>
  );
}
