import type { Metadata } from "next";
import { TillTodayV2 } from "@/components/admin/v2/till/TillRoute";

export const metadata: Metadata = { title: "Today's sales" };
export const dynamic = "force-dynamic";

// /till/today (was /pos/history).
export default async function TillTodayRoute({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
    return <TillTodayV2 searchParams={await searchParams} />;
}
