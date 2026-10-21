/**
 * Main application layout with sidebar (desktop) and mobile nav.
 */

import { Outlet } from "react-router-dom";
import Sidebar from "./Sidebar";
import MobileNav from "./MobileNav";

interface AppLayoutProps {
  deploymentMode?: string;
}

export default function AppLayout({ deploymentMode }: AppLayoutProps) {
  return (
    <div className="min-h-screen bg-gray-50">
      <Sidebar deploymentMode={deploymentMode} />
      <MobileNav />

      {/* Main content area - offset for sidebar on desktop, top bar on mobile */}
      <main className="lg:ml-64 pt-14 lg:pt-0 min-h-screen">
        <div className="px-4 sm:px-6 lg:px-8 py-6 lg:py-8 max-w-7xl mx-auto">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
