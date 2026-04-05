// src/app/(shop)/pay/[pos_id]/page.tsx
import { notFound } from 'next/navigation';
import Image from 'next/image';
import Link from 'next/link';
import type { PosSessionPublic } from '@/types/pos';

const BASE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://misstokyo.shop';
const EXPIRE_TOKEN = process.env.POS_EXPIRE_TOKEN ?? '';

async function getSession(posId: string): Promise<PosSessionPublic | null> {
    const res = await fetch(`${BASE_URL}/api/pos/session/${posId}`, { cache: 'no-store' });
    if (!res.ok) return null;
    return res.json();
}

async function triggerExpire() {
    // Fire-and-forget server-side only — token never exposed to client
    if (!EXPIRE_TOKEN) return;
    fetch(`${BASE_URL}/api/pos/expire`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${EXPIRE_TOKEN}` },
    }).catch(() => {});
}

export default async function PosPaymentPage({ params }: { params: Promise<{ pos_id: string }> }) {
    const { pos_id } = await params;
    const session = await getSession(pos_id);
    if (!session) notFound();

    const isExpired = session.status === 'expired'
        || (session.status === 'pending_payment' && session.expires_at && new Date(session.expires_at) < new Date());

    if (isExpired) {
        await triggerExpire();
        return (
            <main className="min-h-screen bg-white flex items-center justify-center p-8">
                <div className="max-w-sm w-full text-center space-y-6">
                    <p className="text-[10px] uppercase tracking-[0.4em] text-neutral-400">Miss Tokyo</p>
                    <h1 className="text-2xl uppercase tracking-widest font-bold">Link Expired</h1>
                    <p className="text-sm text-neutral-500 tracking-wide">
                        This payment link has expired. Please contact the store to generate a new one.
                    </p>
                    <Link href="/" className="block text-[11px] uppercase tracking-widest text-neutral-400 hover:text-black transition-colors">
                        Return to Store
                    </Link>
                </div>
            </main>
        );
    }

    if (session.status === 'paid') {
        return (
            <main className="min-h-screen bg-white flex items-center justify-center p-8">
                <div className="max-w-sm w-full text-center space-y-6">
                    <p className="text-[10px] uppercase tracking-[0.4em] text-neutral-400">Miss Tokyo</p>
                    <h1 className="text-2xl uppercase tracking-widest font-bold">Already Paid</h1>
                    <p className="text-sm text-neutral-500 tracking-wide">This order has already been paid. Thank you!</p>
                    <Link href="/" className="block text-[11px] uppercase tracking-widest text-neutral-400 hover:text-black transition-colors">
                        Return to Store
                    </Link>
                </div>
            </main>
        );
    }

    if (session.status === 'cancelled') {
        return (
            <main className="min-h-screen bg-white flex items-center justify-center p-8">
                <div className="max-w-sm w-full text-center space-y-6">
                    <p className="text-[10px] uppercase tracking-[0.4em] text-neutral-400">Miss Tokyo</p>
                    <h1 className="text-2xl uppercase tracking-widest font-bold">Order Cancelled</h1>
                    <p className="text-sm text-neutral-500 tracking-wide">This order has been cancelled. Please contact the store.</p>
                </div>
            </main>
        );
    }

    if (session.status !== 'pending_payment' || !session.paymentUrl) {
        notFound();
    }

    return (
        <main className="min-h-screen bg-white flex items-center justify-center p-8">
            <div className="max-w-sm w-full space-y-8">
                <div className="text-center">
                    <p className="text-[10px] uppercase tracking-[0.4em] text-neutral-400 mb-4">Miss Tokyo</p>
                    <h1 className="text-2xl uppercase tracking-widest font-bold mb-2">Your Order</h1>
                    <p className="text-sm text-neutral-500 tracking-wide">Review your items and complete payment below.</p>
                </div>

                {/* Items */}
                <div className="border border-neutral-100 divide-y divide-neutral-100">
                    {session.items.map((item, i) => (
                        <div key={i} className="flex gap-4 px-4 py-4">
                            {/* Thumbnail */}
                            {item.image_url ? (
                                <div className="w-16 h-20 shrink-0 bg-neutral-50 overflow-hidden relative">
                                    <Image src={item.image_url} alt={item.name} fill className="object-cover object-top" sizes="64px" />
                                </div>
                            ) : (
                                <div className="w-16 h-20 shrink-0 bg-neutral-100 flex items-center justify-center">
                                    <span className="text-[8px] text-neutral-300 uppercase tracking-widest">No img</span>
                                </div>
                            )}
                            {/* Details */}
                            <div className="flex-1 flex flex-col justify-center gap-0.5">
                                <p className="text-xs font-semibold uppercase tracking-wider leading-snug">{item.name}</p>
                                {item.sku && (
                                    <p className="text-[10px] text-neutral-400 uppercase tracking-widest">SKU: {item.sku}</p>
                                )}
                                {(item.size || item.color) && (
                                    <p className="text-[10px] text-neutral-500 uppercase tracking-widest">
                                        {[item.size, item.color].filter(Boolean).join(' / ')}
                                    </p>
                                )}
                                <p className="text-[10px] text-neutral-400 mt-0.5">
                                    GH&#8373;{Number(item.price).toFixed(2)} × {item.quantity}
                                </p>
                            </div>
                            {/* Line total */}
                            <div className="shrink-0 flex items-center">
                                <span className="text-xs font-semibold">GH&#8373;{(Number(item.price) * item.quantity).toFixed(2)}</span>
                            </div>
                        </div>
                    ))}
                    <div className="flex justify-between items-center px-4 py-3 bg-neutral-50">
                        <span className="text-xs uppercase tracking-widest font-bold">Total</span>
                        <span className="text-sm font-bold">GH&#8373;{Number(session.total_amount).toFixed(2)}</span>
                    </div>
                </div>

                {/* CTA — standard anchor redirect to Paystack hosted page */}
                <a
                    href={session.paymentUrl}
                    className="block w-full py-5 bg-black text-white text-[11px] uppercase tracking-[0.4em] font-black text-center hover:bg-neutral-900 transition-colors"
                >
                    Pay Now — GH&#8373;{Number(session.total_amount).toFixed(2)}
                </a>

                <p className="text-center text-[10px] text-neutral-400 uppercase tracking-widest">
                    Secure payment by Paystack
                </p>
            </div>
        </main>
    );
}
