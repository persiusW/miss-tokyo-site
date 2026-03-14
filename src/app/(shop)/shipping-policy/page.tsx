import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Shipping Policy | Miss Tokyo",
};

export default function ShippingPolicy() {
  return (
    <div className="max-w-3xl mx-auto py-16 px-4 sm:px-6">
      <h1 className="font-serif text-3xl md:text-4xl uppercase text-center text-gray-900 mb-12 tracking-wide">
        Shipping Policy
      </h1>
      <div className="space-y-6 text-gray-700 leading-relaxed text-sm">
        <h2 className="font-sans text-lg font-semibold text-gray-900 mt-8 mb-4">
          Miss Tokyo aims to deliver your order quickly and reliably.
        </h2>
        <ul className="list-disc ml-6 space-y-2">
          <li>Orders are processed after payment confirmation.</li>
          <li>Delivery is completed within 2–3 business days after the order is confirmed.</li>
          <li>Delivery times may vary slightly due to location, weekends, or public holidays.</li>
        </ul>
      </div>
    </div>
  );
}
