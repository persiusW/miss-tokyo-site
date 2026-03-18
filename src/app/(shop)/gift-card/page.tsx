import { redirect } from "next/navigation";

// Permanent redirect — old route replaced by /gift-cards
export default function GiftCardRedirect() {
    redirect("/gift-cards");
}
