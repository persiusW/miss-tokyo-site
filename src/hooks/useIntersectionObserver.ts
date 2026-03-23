import { useEffect, useRef, useState } from "react";

interface UseIntersectionObserverOptions extends IntersectionObserverInit {
    /** Once visible, freeze the `isIntersecting` state to `true` permanently. */
    freezeOnceVisible?: boolean;
}

/**
 * Tracks whether a DOM element is inside the viewport using IntersectionObserver.
 *
 * @returns A tuple of `[ref, isIntersecting]`.
 *          Attach `ref` to the element you want to observe.
 *
 * @example
 * const [ref, isVisible] = useIntersectionObserver({ threshold: 0.5 });
 * useEffect(() => { if (isVisible) play(); else pause(); }, [isVisible]);
 * return <div ref={ref}>...</div>;
 */
export function useIntersectionObserver<T extends Element = Element>(
    options: UseIntersectionObserverOptions = {},
): [React.RefObject<T | null>, boolean] {
    const {
        threshold = 0,
        root = null,
        rootMargin = "0%",
        freezeOnceVisible = false,
    } = options;

    const ref = useRef<T | null>(null);
    const [isIntersecting, setIsIntersecting] = useState(false);

    useEffect(() => {
        const element = ref.current;
        if (!element) return;

        // Once frozen we stop observing to avoid unnecessary callbacks
        if (freezeOnceVisible && isIntersecting) return;

        const observer = new IntersectionObserver(
            ([entry]) => {
                setIsIntersecting(entry.isIntersecting);
            },
            { threshold, root, rootMargin },
        );

        observer.observe(element);
        return () => observer.disconnect();
    // Re-run only when options change, not on every isIntersecting flip
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [threshold, root, rootMargin, freezeOnceVisible]);

    return [ref, isIntersecting];
}
