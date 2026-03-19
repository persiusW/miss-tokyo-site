import { permanentRedirect } from "next/navigation";

export default function SalePage() {
    permanentRedirect("/shop?sale=true");
}
