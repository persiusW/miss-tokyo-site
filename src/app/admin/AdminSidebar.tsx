"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard, Package, ShoppingBag, Clock, Gift, Tag, Bell,
  ExternalLink, LogOut, ChevronRight, Users, Layers, Settings, UserCog,
} from "lucide-react";
import { createClient } from "@/lib/supabaseBrowser";

type Role = "owner" | "admin" | "sales_staff";

interface NavItem {
  label: string;
  href: string;
  icon: React.ElementType;
  roles: Role[]; // which roles can see this item
}

interface NavGroup {
  group: string;
  items: NavItem[];
}

const NAV_GROUPS: NavGroup[] = [
  {
    group: "Store",
    items: [
      { label: "Overview",        href: "/admin",                  icon: LayoutDashboard, roles: ["owner", "admin"] },
      { label: "Orders",          href: "/admin/orders",           icon: ShoppingBag,     roles: ["owner", "admin", "sales_staff"] },
      { label: "Products",        href: "/admin/products",         icon: Package,         roles: ["owner", "admin", "sales_staff"] },
      { label: "Categories",      href: "/admin/categories",       icon: Layers,          roles: ["owner", "admin", "sales_staff"] },
      { label: "Customers",       href: "/admin/customers",        icon: Users,           roles: ["owner", "admin", "sales_staff"] },
    ],
  },
  {
    group: "Marketing",
    items: [
      { label: "Abandoned Carts", href: "/admin/abandoned-carts",  icon: Clock,           roles: ["owner", "admin"] },
      { label: "Gift Cards",      href: "/admin/gift-cards",       icon: Gift,            roles: ["owner", "admin"] },
      { label: "Discounts",       href: "/admin/discounts",        icon: Tag,             roles: ["owner", "admin"] },
      { label: "Back in Stock",   href: "/admin/back-in-stock",    icon: Bell,            roles: ["owner", "admin"] },
    ],
  },
  {
    group: "Settings",
    items: [
      { label: "Team",            href: "/admin/settings/team",    icon: UserCog,         roles: ["owner", "admin"] },
      { label: "Settings",        href: "/admin/settings",         icon: Settings,        roles: ["owner", "admin"] },
    ],
  },
];

const ROLE_LABELS: Record<Role, string> = {
  owner: "Owner",
  admin: "Admin",
  sales_staff: "Sales Staff",
};

interface AdminSidebarProps {
  role: Role;
  user: { name: string; email: string; role: Role };
}

export function AdminSidebar({ role, user }: AdminSidebarProps) {
  const pathname = usePathname();
  const supabase = createClient();

  const handleLogout = async () => {
    await supabase.auth.signOut();
    window.location.href = "/admin/login";
  };

  return (
    <aside className="fixed top-0 left-0 h-full w-56 bg-white border-r border-gray-200 flex flex-col z-40">
      {/* Brand */}
      <div className="px-5 py-5 border-b border-gray-100">
        <p className="text-xs font-bold uppercase tracking-[0.2em] text-black"
          style={{ fontFamily: "var(--font-cinzel), Georgia, serif" }}>
          Miss Tokyo
        </p>
        <p className="text-[9px] uppercase tracking-widest text-gray-400 mt-0.5"
          style={{ fontFamily: "Arial, sans-serif" }}>
          Admin Dashboard
        </p>
      </div>

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto py-3 px-2 space-y-4">
        {NAV_GROUPS.map((group) => {
          const visibleItems = group.items.filter(item => item.roles.includes(role));
          if (visibleItems.length === 0) return null;
          return (
            <div key={group.group}>
              <p className="px-3 mb-1 text-[9px] uppercase tracking-widest text-gray-400"
                style={{ fontFamily: "Arial, sans-serif" }}>
                {group.group}
              </p>
              <div className="space-y-0.5">
                {visibleItems.map(({ label, href, icon: Icon }) => {
                  const active = pathname === href;
                  return (
                    <Link key={href} href={href}
                      className={`flex items-center gap-2.5 px-3 py-2.5 text-[11px] uppercase tracking-wide transition-colors ${
                        active ? "bg-black text-white" : "text-gray-600 hover:bg-gray-50 hover:text-black"
                      }`}
                      style={{ fontFamily: "Arial, sans-serif" }}>
                      <Icon size={13} strokeWidth={active ? 2 : 1.5} className="shrink-0" />
                      <span>{label}</span>
                      {active && <ChevronRight size={10} className="ml-auto opacity-50" />}
                    </Link>
                  );
                })}
              </div>
            </div>
          );
        })}
      </nav>

      {/* Current user chip */}
      <div className="px-4 py-3 border-t border-gray-100 border-b border-gray-100">
        <p className="text-[10px] font-medium text-gray-900 truncate" style={{ fontFamily: "Arial, sans-serif" }}>{user.name}</p>
        <p className="text-[9px] text-gray-400 truncate" style={{ fontFamily: "Arial, sans-serif" }}>{user.email}</p>
        <span className="mt-1 inline-block text-[8px] uppercase tracking-widest bg-gray-100 text-gray-500 px-1.5 py-0.5"
          style={{ fontFamily: "Arial, sans-serif" }}>
          {ROLE_LABELS[user.role]}
        </span>
      </div>

      {/* Footer links */}
      <div className="px-2 py-3 space-y-0.5">
        <Link href="/" target="_blank"
          className="flex items-center gap-2.5 px-3 py-2 text-[11px] uppercase tracking-wide text-gray-500 hover:text-black transition-colors"
          style={{ fontFamily: "Arial, sans-serif" }}>
          <ExternalLink size={13} strokeWidth={1.5} /> View Store
        </Link>
        <button 
          onClick={handleLogout}
          className="w-full flex items-center gap-2.5 px-3 py-2 text-[11px] uppercase tracking-wide text-gray-500 hover:text-red-600 transition-colors"
          style={{ fontFamily: "Arial, sans-serif" }}>
          <LogOut size={13} strokeWidth={1.5} /> Sign Out
        </button>
      </div>
    </aside>
  );
}
