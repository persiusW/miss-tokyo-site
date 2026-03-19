import { permanentRedirect } from "next/navigation";

export default function DressesPage() {
    permanentRedirect("/shop?category=dresses");
}
