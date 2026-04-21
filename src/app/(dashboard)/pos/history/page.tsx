// src/app/(dashboard)/pos/history/page.tsx
'use client';

import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import Link from 'next/link';
import { ArrowLeft, ExternalLink, X } from 'lucide-react';
import type { PosStatus } from '@/types/pos';
import { toast } from '@/lib/toast';

type SessionRow = {
    id: string;
    customer_name: string;
    customer_email: string;
    customer_phone: string | null;
    total_amount: number;
    status: PosStatus;
    items: any[];
    notes: string | null;
    expires_at: string | null;
    paid_at: string | null;
    created_at: string;
    paystack_reference: string | null;
    staff_name: string | null;
    order_id: string | null;
};

const STATUS_STYLES: Record<PosStatus, string> = {
    draft: 'bg-neutral-100 text-neutral-600',
    pending_payment: 'bg-amber-50 text-amber-700',
    paid: 'bg-green-50 text-green-700',
    expired: 'bg-red-50 text-red-500',
    cancelled: 'bg-neutral-50 text-neutral-400',
};

type FilterTab = 'all' | PosStatus;

export default function POSHistoryPage() {
    const [sessions, setSessions] = useState<SessionRow[]>([]);
    const [loading, setLoading] = useState(true);
    const [filter, setFilter] = useState<FilterTab>('all');
    const [selected, setSelected] = useState<SessionRow | null>(null);
    const [cancelling, setCancelling] = useState(false);
    const [currentUserId, setCurrentUserId] = useState<string | null>(null);
    const [userRole, setUserRole] = useState<'admin' | 'owner' | 'sales_staff' | null>(null);

    const fetchSessions = useCallback(async (userId: string, role: string) => {
        setLoading(true);
        const isStaff = role === 'sales_staff';

        let query = supabase
            .from('pos_sessions')
            .select('id, customer_name, customer_email, customer_phone, total_amount, status, items, notes, expires_at, paid_at, created_at, paystack_reference, order_id, created_by')
            .order('created_at', { ascending: false })
            .limit(100);

        if (isStaff) {
            query = query.eq('created_by', userId);
        }

        const { data: rows, error: fetchError } = await query;
        if (fetchError) {
            toast.error('Failed to load sessions');
            setLoading(false);
            return;
        }
        const sessionList = rows ?? [];

        let nameMap: Record<string, string> = {};
        const staffIds = [...new Set(sessionList.map((r: any) => r.created_by).filter(Boolean))];
        if (staffIds.length > 0) {
            const { data: profiles } = await supabase
                .from('profiles')
                .select('id, full_name')
                .in('id', staffIds);
            for (const p of (profiles ?? [])) {
                nameMap[p.id] = p.full_name ?? '';
            }
        }

        setSessions(sessionList.map((row: any) => ({
            ...row,
            staff_name: nameMap[row.created_by] ?? null,
            items: Array.isArray(row.items) ? row.items : [],
        })));
        setLoading(false);
    }, []);

    useEffect(() => {
        (async () => {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) { setLoading(false); return; }

            const { data: profile, error: profileError } = await supabase
                .from('profiles')
                .select('role')
                .eq('id', user.id)
                .single();

            if (profileError && profileError.code !== 'PGRST116') {
                console.error('[POSHistory] profile fetch error:', profileError);
            }

            const role = (profile?.role as 'admin' | 'owner' | 'sales_staff') ?? 'sales_staff';
            setCurrentUserId(user.id);
            setUserRole(role);
            fetchSessions(user.id, role);
        })();
    }, [fetchSessions]);

    const refetch = () => {
        if (currentUserId && userRole) fetchSessions(currentUserId, userRole);
    };

    const filtered = filter === 'all' ? sessions : sessions.filter(s => s.status === filter);

    const handleCancel = async (sessionId: string) => {
        if (!confirm('Cancel this POS session?')) return;
        setCancelling(true);
        try {
            const res = await fetch('/api/pos/cancel', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ sessionId }),
            });
            if (!res.ok) throw new Error((await res.json()).error ?? 'Cancel failed');
            toast.success('Session cancelled');
            setSelected(null);
            refetch();
        } catch (e: any) {
            toast.error(e.message);
        } finally {
            setCancelling(false);
        }
    };

    const tabs: { key: FilterTab; label: string }[] = [
        { key: 'all', label: 'All' },
        { key: 'draft', label: 'Draft' },
        { key: 'pending_payment', label: 'Pending' },
        { key: 'paid', label: 'Paid' },
        { key: 'expired', label: 'Expired' },
        { key: 'cancelled', label: 'Cancelled' },
    ];

    return (
        <div className="p-8 max-w-7xl mx-auto">
            <div className="flex items-center gap-4 mb-8">
                <Link href="/pos" className="flex items-center gap-2 text-[10px] uppercase tracking-widest text-neutral-400 hover:text-black transition-colors">
                    <ArrowLeft size={12} /> Back to POS
                </Link>
                <h1 className="text-sm font-bold uppercase tracking-[0.3em]">
                    POS History{userRole === 'sales_staff' ? ' — My Orders' : ''}
                </h1>
            </div>

            <div className="flex gap-1 mb-6 border-b border-neutral-100">
                {tabs.map(t => (
                    <button key={t.key} onClick={() => setFilter(t.key)}
                        className={`pb-3 px-3 text-[10px] uppercase tracking-widest font-semibold border-b-2 transition-all ${filter === t.key ? 'border-black text-black' : 'border-transparent text-neutral-400 hover:text-black'}`}>
                        {t.label}
                    </button>
                ))}
            </div>

            {loading ? (
                <p className="text-[10px] uppercase tracking-widest text-neutral-400 py-12 text-center">Loading...</p>
            ) : filtered.length === 0 ? (
                <p className="text-[10px] uppercase tracking-widest text-neutral-400 py-12 text-center">No sessions found</p>
            ) : (
                <div className="overflow-x-auto">
                    <table className="w-full text-xs">
                        <thead>
                            <tr className="border-b border-neutral-100">
                                {['Ref', 'Customer', 'Items', 'Total', 'Staff', 'Status', 'Created', 'Expires / Paid'].map(h => (
                                    <th key={h} className="text-left text-[10px] uppercase tracking-widest font-semibold text-neutral-400 pb-3 pr-6">{h}</th>
                                ))}
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-neutral-50">
                            {filtered.map(s => (
                                <tr key={s.id} onClick={() => setSelected(s)} className="cursor-pointer hover:bg-neutral-50/50 transition-colors">
                                    <td className="py-3 pr-6 font-mono text-neutral-500">{s.id.slice(0, 8).toUpperCase()}</td>
                                    <td className="py-3 pr-6">
                                        <p className="font-semibold">{s.customer_name}</p>
                                        <p className="text-neutral-400 text-[10px]">{s.customer_email}</p>
                                    </td>
                                    <td className="py-3 pr-6 text-neutral-500">{s.items.length} item{s.items.length !== 1 ? 's' : ''}</td>
                                    <td className="py-3 pr-6 font-semibold">GH&#8373;{Number(s.total_amount).toFixed(2)}</td>
                                    <td className="py-3 pr-6 text-neutral-500">{s.staff_name ?? '—'}</td>
                                    <td className="py-3 pr-6">
                                        <span className={`px-2 py-1 text-[10px] uppercase tracking-widest font-semibold ${STATUS_STYLES[s.status]}`}>
                                            {s.status.replace('_', ' ')}
                                        </span>
                                    </td>
                                    <td className="py-3 pr-6 text-neutral-500">{new Date(s.created_at).toLocaleDateString()}</td>
                                    <td className="py-3 text-neutral-500 text-[10px]">
                                        {s.status === 'paid' && s.paid_at ? new Date(s.paid_at).toLocaleString() : s.expires_at ? new Date(s.expires_at).toLocaleString() : '—'}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}

            {selected && (
                <div className="fixed inset-0 z-50 flex items-center justify-end">
                    <div className="absolute inset-0 bg-black/30" onClick={() => setSelected(null)} />
                    <div className="relative bg-white w-full max-w-md h-full overflow-y-auto shadow-2xl p-8 space-y-6">
                        <div className="flex items-center justify-between">
                            <h2 className="text-sm font-bold uppercase tracking-[0.3em]">Session Detail</h2>
                            <button onClick={() => setSelected(null)}><X size={16} /></button>
                        </div>

                        <div className="space-y-1">
                            <p className="text-[10px] uppercase tracking-widest text-neutral-400">Ref</p>
                            <p className="font-mono text-sm">{selected.id.slice(0, 8).toUpperCase()}</p>
                        </div>
                        <div className="space-y-1">
                            <p className="text-[10px] uppercase tracking-widest text-neutral-400">Customer</p>
                            <p className="font-semibold text-sm">{selected.customer_name}</p>
                            <p className="text-xs text-neutral-500">{selected.customer_email}</p>
                            {selected.customer_phone && <p className="text-xs text-neutral-500">{selected.customer_phone}</p>}
                        </div>
                        <div className="space-y-2">
                            <p className="text-[10px] uppercase tracking-widest text-neutral-400">Items</p>
                            {selected.items.map((i: any, idx: number) => (
                                <div key={idx} className="flex justify-between text-xs py-2 border-b border-neutral-50">
                                    <div>
                                        <p className="font-semibold">{i.name}</p>
                                        {(i.size || i.color) && <p className="text-neutral-400 text-[10px]">{[i.size, i.color].filter(Boolean).join(' / ')}</p>}
                                    </div>
                                    <span className="text-neutral-500">×{i.quantity}</span>
                                </div>
                            ))}
                            <div className="flex justify-between font-bold text-sm pt-1">
                                <span>Total</span>
                                <span>GH&#8373;{Number(selected.total_amount).toFixed(2)}</span>
                            </div>
                        </div>

                        {selected.notes && (
                            <div className="space-y-1">
                                <p className="text-[10px] uppercase tracking-widest text-neutral-400">Notes</p>
                                <p className="text-xs text-neutral-600">{selected.notes}</p>
                            </div>
                        )}

                        {selected.status === 'paid' && selected.order_id && (
                            <Link href={`/sales/orders/${selected.order_id}`} className="flex items-center gap-2 text-[10px] uppercase tracking-widest text-black hover:underline">
                                <ExternalLink size={10} /> View Order
                            </Link>
                        )}

                        {selected.status === 'pending_payment' && selected.paystack_reference && (
                            <div className="space-y-2">
                                <p className="text-[10px] uppercase tracking-widest text-neutral-400">Payment Link</p>
                                <p className="text-[10px] font-mono break-all text-neutral-600">
                                    https://paystack.com/pay/{selected.paystack_reference}
                                </p>
                                <button
                                    onClick={() => navigator.clipboard.writeText(`https://paystack.com/pay/${selected.paystack_reference}`).then(() => toast.success('Copied'))}
                                    className="text-[10px] uppercase tracking-widest underline text-neutral-500 hover:text-black"
                                >
                                    Copy Link
                                </button>
                            </div>
                        )}

                        {['draft', 'pending_payment'].includes(selected.status) && (
                            <button
                                onClick={() => handleCancel(selected.id)}
                                disabled={cancelling}
                                className="w-full py-3 border border-red-200 text-red-600 text-[10px] uppercase tracking-widest font-bold hover:bg-red-50 transition-colors disabled:opacity-40"
                            >
                                {cancelling ? 'Cancelling...' : 'Cancel Session'}
                            </button>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}
