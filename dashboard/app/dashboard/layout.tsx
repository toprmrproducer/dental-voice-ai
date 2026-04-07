"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter, usePathname } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { getClinicId, getUserRole } from "@/lib/auth";
import {
  LayoutDashboard,
  Phone,
  RefreshCcw,
  BarChart3,
  Settings,
  LogOut,
  Menu,
  X,
} from "lucide-react";

const NAV_ITEMS = [
  { href: "/dashboard", label: "Overview", icon: LayoutDashboard, roles: ["owner", "staff"] },
  { href: "/dashboard/calls", label: "Call History", icon: Phone, roles: ["owner", "staff"] },
  { href: "/dashboard/recall", label: "Recall Campaigns", icon: RefreshCcw, roles: ["owner"] },
  { href: "/dashboard/metrics", label: "Analytics", icon: BarChart3, roles: ["owner"] },
  { href: "/dashboard/settings", label: "Settings", icon: Settings, roles: ["owner"] },
];

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const supabase = createClient();

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user: u } }) => {
      if (!u) {
        router.push("/login");
      } else {
        setUser(u);
      }
      setLoading(false);
    });
  }, [router, supabase.auth]);

  const handleSignOut = useCallback(async () => {
    await supabase.auth.signOut();
    router.push("/login");
  }, [router, supabase.auth]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-dental-600" />
      </div>
    );
  }

  if (!user) return null;

  const role = getUserRole(user);
  const clinicId = getClinicId(user);
  const filteredNav = NAV_ITEMS.filter((item) => item.roles.includes(role));

  return (
    <div className="min-h-screen flex bg-gray-50">
      {/* Desktop Sidebar */}
      <aside className="hidden md:flex md:w-64 md:flex-col md:fixed md:inset-y-0 bg-white border-r border-gray-200">
        <div className="flex-1 flex flex-col pt-6 pb-4 overflow-y-auto">
          <div className="px-6 mb-8">
            <h2 className="text-xl font-bold text-dental-700">Dental AI</h2>
            <p className="text-xs text-slate-500 mt-1">{user.email}</p>
          </div>

          <nav className="flex-1 px-3 space-y-1">
            {filteredNav.map((item) => {
              const active = pathname === item.href;
              return (
                <a
                  key={item.href}
                  href={item.href}
                  className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition ${
                    active
                      ? "bg-dental-50 text-dental-700"
                      : "text-slate-600 hover:bg-gray-50 hover:text-slate-800"
                  }`}
                >
                  <item.icon className="w-5 h-5" />
                  {item.label}
                </a>
              );
            })}
          </nav>
        </div>

        <div className="px-3 pb-4">
          <button
            onClick={handleSignOut}
            className="flex items-center gap-3 px-3 py-2.5 w-full rounded-lg text-sm font-medium text-slate-600 hover:bg-gray-50 hover:text-slate-800 transition"
          >
            <LogOut className="w-5 h-5" />
            Sign Out
          </button>
        </div>
      </aside>

      {/* Mobile header */}
      <div className="md:hidden fixed top-0 inset-x-0 z-50 bg-white border-b border-gray-200 px-4 py-3 flex items-center justify-between">
        <h2 className="text-lg font-bold text-dental-700">Dental AI</h2>
        <button onClick={() => setSidebarOpen(!sidebarOpen)}>
          {sidebarOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
        </button>
      </div>

      {/* Mobile sidebar overlay */}
      {sidebarOpen && (
        <div className="md:hidden fixed inset-0 z-40 bg-black/30" onClick={() => setSidebarOpen(false)}>
          <div className="w-64 bg-white h-full pt-16 px-3" onClick={(e) => e.stopPropagation()}>
            <nav className="space-y-1">
              {filteredNav.map((item) => {
                const active = pathname === item.href;
                return (
                  <a
                    key={item.href}
                    href={item.href}
                    onClick={() => setSidebarOpen(false)}
                    className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition ${
                      active
                        ? "bg-dental-50 text-dental-700"
                        : "text-slate-600 hover:bg-gray-50"
                    }`}
                  >
                    <item.icon className="w-5 h-5" />
                    {item.label}
                  </a>
                );
              })}
            </nav>
            <button
              onClick={handleSignOut}
              className="flex items-center gap-3 px-3 py-2.5 mt-4 w-full rounded-lg text-sm font-medium text-slate-600 hover:bg-gray-50 transition"
            >
              <LogOut className="w-5 h-5" />
              Sign Out
            </button>
          </div>
        </div>
      )}

      {/* Main content */}
      <main className="flex-1 md:ml-64 pt-4 md:pt-0">
        <div className="p-6 md:p-8 max-w-7xl mx-auto md:mt-0 mt-14">{children}</div>
      </main>
    </div>
  );
}
