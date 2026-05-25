export type HapticStyle = "light" | "medium" | "heavy";

const PATTERNS: Record<HapticStyle, number[]> = {
    light:  [8],
    medium: [12],
    heavy:  [20],
};

export function haptic(style: HapticStyle = "light"): void {
    if (typeof navigator === "undefined" || !navigator.vibrate) return;
    navigator.vibrate(PATTERNS[style]);
}
