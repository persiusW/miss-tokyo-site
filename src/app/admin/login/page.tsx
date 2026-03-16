"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabaseBrowser";
import { getFriendlyAuthError } from "@/lib/utils/auth-errors";
import { Eye, EyeOff, Lock } from "lucide-react";

export default function AdminLoginPage() {
  const router = useRouter();
  const supabase = createClient();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      const { data, error: signInError } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (signInError) {
        setError(getFriendlyAuthError(signInError));
        setLoading(false);
        return;
      }

      if (!data.user) {
        setError("Unable to identify account. Please try again.");
        setLoading(false);
        return;
      }

      // After login, check if the user is actually staff
      const { data: profile, error: profileError } = await supabase
        .from("profiles")
        .select("role")
        .eq("id", data.user.id)
        .single();

      if (profileError || !profile || !["owner", "admin", "sales_staff"].includes(profile.role)) {
        await supabase.auth.signOut();
        setError(profileError ? "System error verifying credentials." : "Access denied. Authorized staff only.");
        setLoading(false);
        return;
      }

      // Success - redirect to dashboard using full refresh to ensure middleware picks up cookies
      window.location.href = "/admin";
    } catch (err: any) {
      console.error("Login unexpected error:", err);
      setError("An unexpected error occurred. Please try again.");
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <div className="w-full max-w-sm">
        <div className="bg-white border border-gray-200 p-8 shadow-sm">
          <div className="text-center mb-8">
            <h1 className="text-xl font-bold uppercase tracking-[0.3em] text-black mb-2"
              style={{ fontFamily: "var(--font-cinzel), Georgia, serif" }}>
              Miss Tokyo
            </h1>
            <p className="text-[10px] uppercase tracking-widest text-gray-400 font-bold"
              style={{ fontFamily: "Arial, sans-serif" }}>
              Admin Access Terminal
            </p>
          </div>

          <form onSubmit={handleLogin} className="space-y-6">
            <div>
              <label className="block text-[10px] uppercase tracking-widest font-bold text-gray-500 mb-2"
                style={{ fontFamily: "Arial, sans-serif" }}>
                Staff Email
              </label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full border-b border-gray-100 py-3 text-sm outline-none focus:border-black transition-colors bg-transparent"
                placeholder="staff@misstokyo.com"
              />
            </div>

            <div>
              <label className="block text-[10px] uppercase tracking-widest font-bold text-gray-500 mb-2"
                style={{ fontFamily: "Arial, sans-serif" }}>
                Secret Key
              </label>
              <div className="relative">
                <input
                  type={showPw ? "text" : "password"}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full border-b border-gray-100 py-3 text-sm outline-none focus:border-black transition-colors bg-transparent pr-10"
                  placeholder="••••••••"
                />
                <button
                  type="button"
                  onClick={() => setShowPw(!showPw)}
                  className="absolute right-0 top-1/2 -translate-y-1/2 text-gray-400 hover:text-black"
                >
                  {showPw ? <EyeOff size={14} /> : <Eye size={14} />}
                </button>
              </div>
            </div>

            {error && (
              <div className="bg-red-50 p-3 flex gap-3 items-center border-l-2 border-red-600">
                <p className="text-[10px] uppercase tracking-wide text-red-700 font-bold">
                  {error}
                </p>
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-black text-white text-[11px] uppercase tracking-[0.2em] font-bold py-4 hover:bg-neutral-800 transition-all disabled:opacity-50 flex items-center justify-center gap-2"
              style={{ fontFamily: "Arial, sans-serif" }}
            >
              {loading ? "Authenticating..." : (
                <>
                  <Lock size={12} strokeWidth={2.5} />
                  Authorize Portal
                </>
              )}
            </button>
          </form>
        </div>
        
        <p className="text-center mt-8 text-[10px] uppercase tracking-widest text-gray-400 font-bold">
          © {new Date().getFullYear()} Miss Tokyo Atelier. Internal Use Only.
        </p>
      </div>
    </div>
  );
}
