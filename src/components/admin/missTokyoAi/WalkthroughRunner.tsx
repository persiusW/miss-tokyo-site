"use client";

// Runs a walkthrough across pages: one card with the step's instruction and
// Back / Next / Exit. On the step's page it rings the step's control (via the
// Spotlight); on another page it offers "Take me there" first. A control that
// can't be found leaves the text showing and the tour carries on.
import { useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useMissTokyoAi } from "@/lib/ai/missTokyoAi/client/store";
import { useMissTokyoAiUser } from "./MissTokyoAi";
import { findWalkthrough } from "@/lib/ai/missTokyoAi/walkthroughs";
import { ROUTES, type StaffRole } from "@/lib/ai/missTokyoAi/routes";
import { ANCHORS } from "@/lib/ai/missTokyoAi/anchors";

/** An order's own page; its address changes per order. */
const ORDER_PAGE = /^\/sales\/orders\/[^/]+$/;

export function WalkthroughRunner() {
    const { walk, setWalk, setSpotlight, features, featuresKnown } = useMissTokyoAi();
    const user = useMissTokyoAiUser();
    const pathname = usePathname();
    const router = useRouter();

    const tour = walk ? findWalkthrough(walk.id, user.role as StaffRole) : null;
    const step = tour && walk ? tour.steps[walk.step] : null;
    const stepPath = step ? ROUTES[step.route].path : null;
    const onOrderPage = !!step && "orderPage" in step && !!step.orderPage;
    const here = onOrderPage ? ORDER_PAGE.test(pathname) : !!stepPath && pathname === stepPath;
    // A control inside a Settings tab opens that tab.
    const anchorDef = step?.anchor ? ANCHORS[step.anchor] : null;
    const tab = anchorDef && "tab" in anchorDef ? String(anchorDef.tab) : null;
    const stepHref = stepPath && tab ? `${stepPath}?tab=${encodeURIComponent(tab)}` : stepPath;

    // A tour the person can no longer run (role changed, switch turned off) just ends.
    useEffect(() => {
        if (walk && (!tour || !step || (featuresKnown && !features.walkthroughs))) setWalk(null);
    }, [walk, tour, step, featuresKnown, features.walkthroughs, setWalk]);

    // Ring the step's control once we are on its page.
    useEffect(() => {
        if (!step || !here) return;
        if (step.anchor) setSpotlight({ anchor: step.anchor, label: ANCHORS[step.anchor].label, startedAt: Date.now() });
        else setSpotlight(null);
    }, [step, here, setSpotlight]);

    if (!walk || !tour || !step || !features.walkthroughs) return null;
    const last = walk.step >= tour.steps.length - 1;
    const exit = () => { setSpotlight(null); setWalk(null); };

    return (
        <div className="mtai-walk" role="dialog" aria-label={`Walkthrough: ${tour.title}`}>
            <div className="mtai-walk-head">
                <span className="mtai-eyebrow">Step {walk.step + 1} of {tour.steps.length}</span>
                <button type="button" className="mtai-walk-x" onClick={exit} aria-label="Exit walkthrough">×</button>
            </div>
            <div className="mtai-walk-title">{tour.title}</div>
            <p>{step.text}</p>
            {!here && onOrderPage && <p className="mtai-walk-hint">Open the order from Orders. This card waits for you.</p>}
            <div className="mtai-walk-actions">
                <button type="button" className="mtai-action show" disabled={walk.step === 0} onClick={() => setWalk({ id: walk.id, step: walk.step - 1 })}>Back</button>
                {!here ? (
                    <button type="button" className="mtai-action go" onClick={() => stepHref && router.push(stepHref)}>
                        {onOrderPage ? "Open Orders →" : "Take me there →"}
                    </button>
                ) : last ? (
                    <button type="button" className="mtai-action go" onClick={exit}>Done</button>
                ) : (
                    <button type="button" className="mtai-action go" onClick={() => setWalk({ id: walk.id, step: walk.step + 1 })}>Next</button>
                )}
            </div>
        </div>
    );
}
