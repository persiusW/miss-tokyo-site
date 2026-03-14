"use client";

import { useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabaseBrowser";
import { getFriendlyAuthError } from "@/lib/utils/auth-errors";
import { Eye, EyeOff } from "lucide-react";

export default function RegisterPage() {
  const supabase = createClient();
  // ... existing form state ...

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");

    if (form.password !== form.confirmPassword) {
      setError("Passwords do not match.");
      return;
    }
    if (form.password.length < 6) {
      setError("Password must be at least 6 characters.");
      return;
    }

    setLoading(true);
    try {
      const { error: signUpError } = await supabase.auth.signUp({
        email: form.email,
        password: form.password,
        options: {
          data: {
            full_name: form.full_name,
            phone: form.phone,
          },
        },
      });

      if (signUpError) {
        setError(getFriendlyAuthError(signUpError));
        setLoading(false);
        return;
      }

      setSuccess(true);
    } catch (err) {
      console.error("Registration error:", err);
      setError("An unexpected error occurred.");
    } finally {
      setLoading(false);
    }
  }

  if (success) {
    return (
      <div className="min-h-[80vh] flex items-center justify-center px-4">
        <div className="w-full max-w-md text-center">
          <div className="w-16 h-16 bg-green-50 rounded-full flex items-center justify-center mx-auto mb-6">
            <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h1 className="text-2xl text-gray-900 mb-3" style={{ fontFamily: "var(--font-cinzel), 'Cinzel', Georgia, serif" }}>
            Check Your Email
          </h1>
          <p className="text-sm text-gray-500 leading-relaxed max-w-xs mx-auto">
            We've sent a confirmation link to <strong className="text-gray-900">{form.email}</strong>. 
            Click the link to activate your account.
          </p>
          <Link
            href="/account"
            className="mt-8 inline-block bg-black text-white text-[11px] uppercase tracking-widest px-8 py-3 rounded-md hover:bg-gray-900 transition-colors"
          >
            Back to Sign In
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-[80vh] flex items-center justify-center px-4 py-14">
      <div className="w-full max-w-md">
        <h1
          className="text-4xl text-center text-gray-900 mb-2"
          style={{ fontFamily: "var(--font-cinzel), 'Cinzel', Georgia, serif" }}
        >
          Create Account
        </h1>
        <p className="text-xs text-center text-gray-400 uppercase tracking-widest mb-10"
          style={{ fontFamily: "Arial, 'Helvetica Neue', sans-serif" }}>
          Join Miss Tokyo for faster checkout &amp; order tracking
        </p>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Full Name */}
          <div>
            <label className="block text-[10px] uppercase tracking-widest text-gray-500 mb-1.5"
              style={{ fontFamily: "Arial, 'Helvetica Neue', sans-serif" }}>
              Full Name <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              required
              value={form.full_name}
              onChange={(e) => update("full_name", e.target.value)}
              className="w-full border border-gray-300 px-4 py-3 text-sm outline-none focus:border-black transition-colors rounded-md"
              placeholder="Miriam Aseye"
            />
          </div>

          {/* Email */}
          <div>
            <label className="block text-[10px] uppercase tracking-widest text-gray-500 mb-1.5"
              style={{ fontFamily: "Arial, 'Helvetica Neue', sans-serif" }}>
              Email Address <span className="text-red-500">*</span>
            </label>
            <input
              type="email"
              required
              value={form.email}
              onChange={(e) => update("email", e.target.value)}
              className="w-full border border-gray-300 px-4 py-3 text-sm outline-none focus:border-black transition-colors rounded-md"
              placeholder="you@example.com"
            />
          </div>

          {/* Phone */}
          <div>
            <label className="block text-[10px] uppercase tracking-widest text-gray-500 mb-1.5"
              style={{ fontFamily: "Arial, 'Helvetica Neue', sans-serif" }}>
              Phone Number
            </label>
            <input
              type="tel"
              value={form.phone}
              onChange={(e) => update("phone", e.target.value)}
              className="w-full border border-gray-300 px-4 py-3 text-sm outline-none focus:border-black transition-colors rounded-md"
              placeholder="055 000 0000"
            />
          </div>

          {/* Password */}
          <div>
            <label className="block text-[10px] uppercase tracking-widest text-gray-500 mb-1.5"
              style={{ fontFamily: "Arial, 'Helvetica Neue', sans-serif" }}>
              Password <span className="text-red-500">*</span>
            </label>
            <div className="relative">
              <input
                type={showPw ? "text" : "password"}
                required
                value={form.password}
                onChange={(e) => update("password", e.target.value)}
                className="w-full border border-gray-300 px-4 py-3 text-sm outline-none focus:border-black transition-colors rounded-md pr-11"
                placeholder="At least 6 characters"
              />
              <button type="button" onClick={() => setShowPw(!showPw)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-black">
                {showPw ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </div>

          {/* Confirm Password */}
          <div>
            <label className="block text-[10px] uppercase tracking-widest text-gray-500 mb-1.5"
              style={{ fontFamily: "Arial, 'Helvetica Neue', sans-serif" }}>
              Confirm Password <span className="text-red-500">*</span>
            </label>
            <div className="relative">
              <input
                type={showConfirm ? "text" : "password"}
                required
                value={form.confirmPassword}
                onChange={(e) => update("confirmPassword", e.target.value)}
                className="w-full border border-gray-300 px-4 py-3 text-sm outline-none focus:border-black transition-colors rounded-md pr-11"
                placeholder="Repeat your password"
              />
              <button type="button" onClick={() => setShowConfirm(!showConfirm)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-black">
                {showConfirm ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </div>

          {error && (
            <p className="text-xs text-red-600 uppercase tracking-wide" style={{ fontFamily: "Arial, sans-serif" }}>
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-black text-white text-[11px] uppercase tracking-widest py-4 rounded-md hover:bg-gray-900 transition-colors disabled:opacity-50 mt-2"
            style={{ fontFamily: "Arial, 'Helvetica Neue', sans-serif" }}
          >
            {loading ? "Creating account…" : "Create Account"}
          </button>
        </form>

        {/* Divider */}
        <div className="flex items-center gap-3 my-6">
          <div className="flex-1 h-px bg-gray-200" />
          <span className="text-[10px] uppercase tracking-widest text-gray-400" style={{ fontFamily: "Arial, sans-serif" }}>or</span>
          <div className="flex-1 h-px bg-gray-200" />
        </div>

        <p className="text-center text-xs text-gray-400" style={{ fontFamily: "Arial, sans-serif" }}>
          Already have an account?{" "}
          <Link href="/account" className="underline text-black hover:text-gray-600">
            Sign In
          </Link>
        </p>

        <p className="text-center text-[10px] text-gray-400 mt-4 leading-relaxed max-w-xs mx-auto" style={{ fontFamily: "Arial, sans-serif" }}>
          By creating an account you agree to our{" "}
          <Link href="/terms-and-conditions" className="underline hover:text-black">Terms</Link> and{" "}
          <Link href="/privacy-policy" className="underline hover:text-black">Privacy Policy</Link>.
        </p>
      </div>
    </div>
  );
}
