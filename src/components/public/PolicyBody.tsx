// A policy page's text, in the layout the policy pages have always used.
// The words come from Content › Pages (or the original when nothing is saved).
import Link from "next/link";
import { bodyBlocks, inlineParts, type PolicyDoc } from "@/lib/content/pageDocs";

const LINK = "border-b border-black hover:text-neutral-500 transition-colors";

export function RichLine({ text }: { text: string }) {
    return (
        <>
            {inlineParts(text).map((p, i) => {
                if (p.kind === "text") return <span key={i}>{p.text}</span>;
                if (p.href.startsWith("/")) return <Link key={i} href={p.href} className={LINK}>{p.text}</Link>;
                const external = p.href.startsWith("https:");
                return <a key={i} href={p.href} className={LINK} {...(external ? { target: "_blank", rel: "noopener noreferrer" } : {})}>{p.text}</a>;
            })}
        </>
    );
}

function Body({ body }: { body: string }) {
    return (
        <>
            {bodyBlocks(body).map((b, i) => b.kind === "p"
                ? <p key={i}><RichLine text={b.text} /></p>
                : (
                    <ul key={i} className="space-y-3 list-none">
                        {b.items.map((t, j) => <li key={j} className="pl-4 border-l border-neutral-200"><RichLine text={t} /></li>)}
                    </ul>
                ))}
        </>
    );
}

export function PolicyBody({ doc }: { doc: PolicyDoc }) {
    return (
        <div className="space-y-12 text-sm text-neutral-700 leading-relaxed">
            {doc.intro && (
                <section className="space-y-4">
                    <Body body={doc.intro} />
                </section>
            )}
            {doc.sections.map((s, i) => (
                <section key={i}>
                    {s.heading && (
                        <h2 className="text-xs font-semibold uppercase tracking-widest mb-4 text-neutral-400">{s.heading}</h2>
                    )}
                    <div className="space-y-4"><Body body={s.body} /></div>
                </section>
            ))}
        </div>
    );
}
