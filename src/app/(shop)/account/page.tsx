"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabaseBrowser";
import { getFriendlyAuthError } from "@/lib/utils/auth-errors";
import { User, Package, MapPin, LogOut, ChevronRight, Eye, EyeOff } from "lucide-react";

type Tab = "profile" | "orders" | "addresses";

export default function AccountPage() {
  const supabase = createClient();
  const [tab, setTab] = useState<Tab>("profile");
  const [session, setSession] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  // Login form
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [loginError, setLoginError] = useState("");
  const [loginLoading, setLoginLoading] = useState(false);

  // Profile
  const [profile, setProfile] = useState({ full_name: "", phone: "" });
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  // Orders
  const [orders, setOrders] = useState<any[]>([]);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setLoading(false);
      if (data.session) loadUserData(data.session.user.id, data.session.user.email!);
    });
    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      if (session) loadUserData(session.user.id, session.user.email!);
    });
    return () => listener.subscription.unsubscribe();
  }, []);

  async function loadUserData(userId: string, userEmail: string) {
    // Load orders
    const { data: ordersData } = await supabase
      .from("orders")
      .select("*")
      .eq("customer_email", userEmail)
      .order("created_at", { ascending: false })
      .limit(20);
    if (ordersData) setOrders(ordersData);

    // Load saved profile metadata from user_metadata
    const { data: userData } = await supabase.auth.getUser();
    const meta = userData.user?.user_metadata || {};
    setProfile({
      full_name: meta.full_name || "",
      phone: meta.phone || "",
    });
  }

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setLoginLoading(true);
    setLoginError("");
    try {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) setLoginError(getFriendlyAuthError(error));
    } catch (err) {
      console.error("Account login error:", err);
      setLoginError("An unexpected error occurred.");
    } finally {
      setLoginLoading(false);
    }
  }

  async function handleSaveProfile(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    await supabase.auth.updateUser({ data: profile });
    setSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  }

  async function handleLogout() {
    await supabase.auth.signOut();
    setOrders([]);
    setProfile({ full_name: "", phone: "" });
  }

  if (loading) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <p className="text-xs uppercase tracking-widest text-gray-400 animate-pulse">Loading…</p>
      </div>
    );
  }

  /* ── NOT LOGGED IN ── */
  if (!session) {
    return (
      <div className="min-h-[80vh] flex items-center justify-center px-4">
        <div className="w-full max-w-md">
          <h1 className="font-serif text-4xl text-center text-gray-900 mb-2">Welcome Back</h1>
          <p className="text-xs text-center text-gray-400 uppercase tracking-widest mb-10">
            Sign in to your Miss Tokyo account
          </p>

          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="block text-[10px] uppercase tracking-widest text-gray-500 mb-1.5">
                Email Address
              </label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full border border-gray-300 px-4 py-3 text-sm outline-none focus:border-black transition-colors rounded-md"
                placeholder="you@example.com"
              />
            </div>
            <div>
              <label className="block text-[10px] uppercase tracking-widest text-gray-500 mb-1.5">
                Password
              </label>
              <div className="relative">
                <input
                  type={showPw ? "text" : "password"}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full border border-gray-300 px-4 py-3 text-sm outline-none focus:border-black transition-colors rounded-md pr-11"
                  placeholder="••••••••"
                />
                <button
                  type="button"
                  onClick={() => setShowPw(!showPw)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-black"
                >
                  {showPw ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            {loginError && (
              <p className="text-xs text-red-600 uppercase tracking-wide">{loginError}</p>
            )}

            <button
              type="submit"
              disabled={loginLoading}
              className="w-full bg-black text-white text-[11px] uppercase tracking-widest py-4 rounded-md hover:bg-gray-900 transition-colors disabled:opacity-50"
            >
              {loginLoading ? "Signing in…" : "Sign In"}
            </button>
          </form>

          <p className="text-center text-xs text-gray-400 mt-6">
            Don't have an account?{" "}
            <Link href="/register" className="underline text-black hover:text-gray-600">
              Create one
            </Link>
          </p>
        </div>
      </div>
    );
  }

  /* ── LOGGED IN ── */
  const tabs: { id: Tab; label: string; icon: React.ReactNode }[] = [
    { id: "profile", label: "My Profile", icon: <User size={16} strokeWidth={1.5} /> },
    { id: "orders", label: "Order History", icon: <Package size={16} strokeWidth={1.5} /> },
    { id: "addresses", label: "Saved Addresses", icon: <MapPin size={16} strokeWidth={1.5} /> },
  ];

  return (
    <div className="max-w-screen-xl mx-auto px-4 sm:px-6 md:px-10 py-12">
      {/* Page title */}
      <div className="flex items-center justify-between mb-10 border-b border-gray-200 pb-6">
        <div>
          <h1 className="font-serif text-3xl text-gray-900">My Account</h1>
          <p className="text-xs text-gray-400 mt-1 uppercase tracking-wider">{session.user.email}</p>
        </div>
        <button
          onClick={handleLogout}
          className="flex items-center gap-1.5 text-[11px] uppercase tracking-widest text-gray-500 hover:text-black transition-colors border border-gray-300 px-4 py-2 rounded-md hover:border-black"
        >
          <LogOut size={14} strokeWidth={1.5} />
          Sign Out
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-[220px_1fr] gap-10">
        {/* Sidebar tabs */}
        <nav className="flex md:flex-col gap-1">
          {tabs.map((t) => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`flex items-center gap-2.5 px-4 py-3 text-[11px] uppercase tracking-widest rounded-md transition-colors text-left ${
                tab === t.id
                  ? "bg-black text-white"
                  : "text-gray-500 hover:bg-gray-100 hover:text-black"
              }`}
            >
              {t.icon}
              <span className="hidden sm:block">{t.label}</span>
            </button>
          ))}
        </nav>

        {/* Tab content */}
        <div>
          {/* ── PROFILE ── */}
          {tab === "profile" && (
            <form onSubmit={handleSaveProfile} className="max-w-lg space-y-5">
              <h2 className="font-serif text-2xl text-gray-900 mb-6">Personal Information</h2>
              <div>
                <label className="block text-[10px] uppercase tracking-widest text-gray-500 mb-1.5">
                  Full Name
                </label>
                <input
                  type="text"
                  value={profile.full_name}
                  onChange={(e) => setProfile({ ...profile, full_name: e.target.value })}
                  className="w-full border border-gray-300 px-4 py-3 text-sm outline-none focus:border-black transition-colors rounded-md"
                />
              </div>
              <div>
                <label className="block text-[10px] uppercase tracking-widest text-gray-500 mb-1.5">
                  Email Address
                </label>
                <input
                  type="email"
                  value={session.user.email}
                  disabled
                  className="w-full border border-gray-100 bg-gray-50 px-4 py-3 text-sm text-gray-400 rounded-md cursor-not-allowed"
                />
              </div>
              <div>
                <label className="block text-[10px] uppercase tracking-widest text-gray-500 mb-1.5">
                  Phone Number
                </label>
                <input
                  type="tel"
                  value={profile.phone}
                  onChange={(e) => setProfile({ ...profile, phone: e.target.value })}
                  className="w-full border border-gray-300 px-4 py-3 text-sm outline-none focus:border-black transition-colors rounded-md"
                  placeholder="055 000 0000"
                />
              </div>
              <button
                type="submit"
                disabled={saving}
                className={`bg-black text-white text-[11px] uppercase tracking-widest px-8 py-3 rounded-md transition-colors ${
                  saved ? "bg-green-700" : "hover:bg-gray-900"
                } disabled:opacity-50`}
              >
                {saving ? "Saving…" : saved ? "Saved ✓" : "Save Changes"}
              </button>
            </form>
          )}

          {/* ── ORDERS ── */}
          {tab === "orders" && (
            <div>
              <h2 className="font-serif text-2xl text-gray-900 mb-6">Order History</h2>
              {orders.length === 0 ? (
                <div className="text-center py-16 border border-dashed border-gray-200 rounded-md">
                  <Package size={40} strokeWidth={1} className="mx-auto text-gray-200 mb-3" />
                  <p className="text-xs uppercase tracking-widest text-gray-400">No orders yet</p>
                  <Link
                    href="/shop"
                    className="mt-4 inline-block text-[11px] uppercase tracking-widest border border-black px-6 py-2 rounded-md hover:bg-black hover:text-white transition-colors"
                  >
                    Start Shopping
                  </Link>
                </div>
              ) : (
                <ul className="space-y-3">
                  {orders.map((order) => (
                    <li
                      key={order.id}
                      className="border border-gray-200 rounded-md px-5 py-4 flex items-center justify-between hover:border-black transition-colors"
                    >
                      <div>
                        <p className="text-xs text-gray-900 uppercase tracking-wide font-medium">
                          {order.paystack_reference || order.id.slice(0, 8).toUpperCase()}
                        </p>
                        <p className="text-[10px] text-gray-400 mt-0.5 uppercase tracking-wide">
                          {new Date(order.created_at).toLocaleDateString("en-GB", {
                            day: "numeric", month: "short", year: "numeric",
                          })}
                          {" · "}
                          <span
                            className={`${
                              order.status === "delivered"
                                ? "text-green-600"
                                : order.status === "cancelled"
                                ? "text-red-500"
                                : "text-amber-600"
                            }`}
                          >
                            {order.status.charAt(0).toUpperCase() + order.status.slice(1)}
                          </span>
                        </p>
                      </div>
                      <div className="flex items-center gap-4">
                        <span className="font-serif text-lg text-gray-900">
                          GH₵{Number(order.total_amount).toFixed(2)}
                        </span>
                        <ChevronRight size={16} strokeWidth={1.5} className="text-gray-400" />
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )}

          {/* ── ADDRESSES ── */}
          {tab === "addresses" && (
            <div>
              <h2 className="font-serif text-2xl text-gray-900 mb-6">Saved Addresses</h2>
              <div className="text-center py-16 border border-dashed border-gray-200 rounded-md">
                <MapPin size={40} strokeWidth={1} className="mx-auto text-gray-200 mb-3" />
                <p className="text-xs uppercase tracking-widest text-gray-400 mb-4">
                  No saved addresses yet
                </p>
                <p className="text-[11px] text-gray-400 max-w-xs mx-auto">
                  Your delivery address will be saved automatically the next time you complete a checkout.
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
