import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { createClient } from "@/lib/supabaseServer";
import { AdminSidebar } from "./AdminSidebar";

export const metadata = { title: "Admin | Miss Tokyo" };

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const headerList = await headers();
  const pathname = headerList.get("x-pathname") || "";
  
  // Skip RBAC check if we are on the login page
  if (pathname === "/admin/login") {
    return <>{children}</>;
  }

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect("/admin/login");
  }

  // Fetch profile to get the role
  const { data: profile, error } = await supabase
    .from("profiles")
    .select("role, full_name")
    .eq("id", user.id)
    .single();

  if (error || !profile || !["owner", "admin", "sales_staff"].includes(profile.role)) {
    // Customers and unauthorized users are redirected to their account portal
    redirect("/account");
  }

  const currentUser = {
    name: profile.full_name || "Staff Member",
    email: user.email!,
    role: profile.role as "owner" | "admin" | "sales_staff",
  };

  return (
    <div className="flex min-h-screen bg-gray-50">
      <AdminSidebar role={currentUser.role} user={currentUser} />
      <main className="flex-1 ml-56 min-h-screen">
        {children}
      </main>
    </div>
  );
}
