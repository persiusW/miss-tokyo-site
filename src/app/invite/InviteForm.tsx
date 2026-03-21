"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { acceptInvite } from "./actions";
import { toast } from "@/lib/toast";
import { Eye, EyeOff } from "lucide-react";
import { createClient } from "@/lib/supabaseBrowser";

export default function InviteForm({ inviteId, email, fullName, role, token }: any) {
    const router = useRouter();
    const supabase = createClient();
    const [password, setPassword] = useState("");
    const [loading, setLoading] = useState(false);
    const [showPassword, setShowPassword] = useState(false);

    const ROLE_LABELS: Record<string, string> = {
        admin: "Administrator",
        owner: "Owner",
        sales_staff: "Sales Staff",
        rider: "Dispatch Rider",
        support: "Support Staff",
        content_editor: "Content Editor"
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);

        try {
            const res = await acceptInvite({ inviteId, token, password, fullName, role, email });
            
            if (!res.success) {
                toast.error(res.error || "Failed to create account.");
                setLoading(false);
                return;
            }

            // Establish browser session
            const { error: signInError } = await supabase.auth.signInWithPassword({
                email,
                password
            });

            if (signInError) {
                toast.error("Account created, but automatic login failed: " + signInError.message);
                setLoading(false);
                return;
            }

            toast.success("Account created successfully!");
            router.push("/admin");
            router.refresh();
        } catch (err: any) {
            toast.error("An unexpected error occurred.");
            console.error(err);
            setLoading(false);
        }
    };

    return (
        <div className="bg-white p-8 rounded-2xl shadow-sm border border-neutral-200 w-full max-w-md">
            <div className="mb-6 space-y-1">
                <h2 className="font-semibold text-lg">Accept Invitation</h2>
                <p className="text-sm text-neutral-500">You've been invited to join Miss Tokyo as a <strong className="text-black">{ROLE_LABELS[role] || role}</strong>.</p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-6">
                <div>
                    <label className="block text-[10px] uppercase tracking-widest font-semibold text-neutral-500 mb-2">Email</label>
                    <input
                        type="email"
                        disabled
                        value={email}
                        className="w-full border-b border-neutral-200 bg-neutral-50 text-neutral-500 py-2 outline-none text-sm cursor-not-allowed"
                    />
                </div>
                
                <div>
                    <label className="block text-[10px] uppercase tracking-widest font-semibold text-neutral-500 mb-2">Full Name</label>
                    <input
                        type="text"
                        disabled
                        value={fullName}
                        className="w-full border-b border-neutral-200 bg-neutral-50 text-neutral-500 py-2 outline-none text-sm cursor-not-allowed"
                    />
                </div>

                <div>
                    <label className="block text-[10px] uppercase tracking-widest font-semibold text-neutral-500 mb-2">Create a Password</label>
                    <div className="relative">
                        <input
                            type={showPassword ? "text" : "password"}
                            required
                            minLength={6}
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            className="w-full border-b border-neutral-300 bg-transparent py-2 outline-none focus:border-black text-sm transition-colors pr-10"
                            placeholder="At least 6 characters"
                        />
                        <button
                            type="button"
                            onClick={() => setShowPassword(!showPassword)}
                            className="absolute right-0 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-black p-2"
                        >
                            {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                        </button>
                    </div>
                </div>

                <button
                    type="submit"
                    disabled={loading || password.length < 6}
                    className="w-full py-3 bg-black text-white text-xs uppercase tracking-widest font-semibold hover:bg-neutral-800 transition-colors disabled:opacity-50 rounded-lg"
                >
                    {loading ? "Creating Account..." : "Accept & Create Account"}
                </button>
            </form>
        </div>
    );
}
