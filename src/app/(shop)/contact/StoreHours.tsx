"use client";

type Props = {
    weekday: string;
    saturday: string;
    sunday: string;
    note: string;
};

export function StoreHours({ weekday, saturday, sunday, note }: Props) {
    // 0=Sun, 1=Mon..5=Fri, 6=Sat
    const day = new Date().getDay();
    const todayIndex = day === 0 ? 2 : day === 6 ? 1 : 0; // 0=weekday, 1=saturday, 2=sunday

    const rows = [
        { label: "Monday – Friday", time: weekday.includes("·") ? weekday.split("·")[1]?.trim() : weekday, idx: 0 },
        { label: "Saturday",        time: saturday.includes("·") ? saturday.split("·")[1]?.trim() : saturday, idx: 1 },
        { label: "Sunday",          time: sunday.includes("·") ? sunday.split("·")[1]?.trim() : sunday, idx: 2 },
    ];

    return (
        <div className="mt-4 rounded-xl border border-[var(--border)] bg-white p-5">
            <p className="text-[10px] font-semibold uppercase tracking-widest text-[var(--muted)] mb-4">
                Store Hours
            </p>
            <div className="space-y-3">
                {rows.map(row => {
                    const isToday = row.idx === todayIndex;
                    return (
                        <div
                            key={row.idx}
                            className={`flex items-center justify-between text-sm ${
                                isToday ? "font-semibold" : "text-[var(--muted)]"
                            }`}
                        >
                            <span style={isToday ? { color: "var(--gold)" } : {}}>
                                {row.label}
                            </span>
                            <span style={isToday ? { color: "var(--gold)" } : {}}>
                                {row.time}
                            </span>
                        </div>
                    );
                })}
            </div>
            <p className="mt-4 text-[11px] text-[var(--muted)] flex items-center gap-1.5">
                <span className="inline-block w-2 h-2 rounded-full bg-green-500 shrink-0" />
                {note}
            </p>
        </div>
    );
}
