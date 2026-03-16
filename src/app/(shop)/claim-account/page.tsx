"use client";

import { useState, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { Mail, Lock, CheckCircle2, Loader2, ArrowRight } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { toast } from "@/lib/toast";

function ClaimAccountContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const email = searchParams.get("email") || "";
  
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  const handleClaim = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password.length < 6) {
      toast.error("Password must be at least 6 characters.");
      return;
    }

    setLoading(true);
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { role: "customer" } 
      }
    });

    if (error) {
      toast.error(error.message);
    } else {
      setSuccess(true);
      toast.success("Account claimed successfully!");
      // Optionally redirect after delay
      setTimeout(() => router.push("/login"), 3000);
    }
    setLoading(false);
  };

  if (success) {
    return (
      <div className="text-center py-20 px-6">
        <div className="flex justify-center mb-6">
          <CheckCircle2 size={48} className="text-black" />
        </div>
        <h1 className="text-2xl font-semibold mb-4 font-serif">Account Secured</h1>
        <p className="text-gray-500 text-sm max-w-xs mx-auto mb-8 font-sans leading-relaxed">
          Your Miss Tokyo account is now active. You can track your orders and manage your saved addresses.
        </p>
        <button onClick={() => router.push("/login")}
          className="bg-black text-white text-[11px] uppercase tracking-widest px-8 py-3.5 hover:bg-gray-900 transition-colors flex items-center gap-2 mx-auto">
          Sign In <ArrowRight size={14} />
        </button>
      </div>
    );
  }

  return (
    <div className="max-w-md mx-auto py-24 px-6">
      <div className="text-center mb-12">
        <h1 className="text-3xl font-semibold mb-3 font-serif">Establish Your Account</h1>
        <p className="text-xs text-gray-400 uppercase tracking-widest font-sans">Track your Miss Tokyo orders</p>
      </div>

      <form onSubmit={handleClaim} className="space-y-8">
        <div>
          <label className="block text-[10px] uppercase tracking-widest font-bold text-gray-400 mb-2">Authenticated Email</label>
          <div className="relative border-b border-gray-100 py-1">
            <Mail size={14} className="absolute left-0 top-1/2 -translate-y-1/2 text-gray-300" />
            <input type="email" value={email} disabled
              className="w-full pl-6 bg-transparent text-xs text-gray-400 outline-none cursor-not-allowed" />
          </div>
        </div>

        <div>
          <label className="block text-[10px] uppercase tracking-widest font-bold text-gray-400 mb-2">Create Password</label>
          <div className="relative border-b border-gray-100 py-1 focus-within:border-black transition-colors">
            <Lock size={14} className="absolute left-0 top-1/2 -translate-y-1/2 text-gray-300" />
            <input type="password" required value={password} onChange={e => setPassword(e.target.value)} placeholder="Minimum 6 characters"
              className="w-full pl-6 bg-transparent text-xs outline-none" />
          </div>
        </div>

        <button type="submit" disabled={loading || !email}
          className="w-full bg-black text-white text-[10px] uppercase tracking-widest py-4 hover:bg-gray-900 transition-colors disabled:opacity-50 flex items-center justify-center gap-2">
          {loading ? <Loader2 size={14} className="animate-spin" /> : "Authorize Account"}
        </button>
      </form>

      <div className="mt-12 pt-12 border-t border-gray-50 text-center">
        <p className="text-[10px] text-gray-300 uppercase tracking-widest leading-relaxed">
          By securing your account, you agree to our <br />
          <span className="text-gray-400 underline cursor-pointer">Terms of Service</span> and <span className="text-gray-400 underline cursor-pointer">Privacy Policy</span>.
        </p>
      </div>
    </div>
  );
}

export default function ClaimAccountPage() {
  return (
    <Suspense fallback={<div className="py-40 text-center text-xs font-serif italic text-gray-400">Loading access parameters...</div>}>
      <ClaimAccountContent />
    </Suspense>
  );
}
