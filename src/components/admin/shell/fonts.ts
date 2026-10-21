// Admin v2 typefaces, self-hosted by next/font (two only: no JetBrains Mono).
import { Cormorant_Garamond, Manrope } from "next/font/google";

const display = Cormorant_Garamond({ subsets: ["latin"], weight: ["500", "600"], variable: "--mt2-display", display: "swap" });
const ui = Manrope({ subsets: ["latin"], weight: ["400", "500", "600", "700"], variable: "--mt2-ui", display: "swap" });

export const v2FontClass = `${display.variable} ${ui.variable}`;
