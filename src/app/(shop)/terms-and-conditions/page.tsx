import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Terms & Conditions | Miss Tokyo",
};

export default function TermsAndConditions() {
  return (
    <div className="max-w-3xl mx-auto py-16 px-4 sm:px-6">
      <h1 className="font-serif text-3xl md:text-4xl uppercase text-center text-gray-900 mb-12 tracking-wide">
        Terms &amp; Conditions
      </h1>
      <div className="space-y-6 text-gray-700 leading-relaxed text-sm">
        <p>
          By using the Miss Tokyo website or purchasing from us, you agree to the following:
        </p>

        <h2 className="font-sans text-lg font-semibold text-gray-900 mt-8 mb-4">Orders &amp; Payments</h2>
        <ul className="list-disc ml-6 space-y-2">
          <li>All orders must be fully paid before processing and delivery.</li>
          <li>Prices and product availability may change without prior notice.</li>
        </ul>

        <h2 className="font-sans text-lg font-semibold text-gray-900 mt-8 mb-4">Products</h2>
        <ul className="list-disc ml-6 space-y-2">
          <li>We aim to display products accurately, but slight color or design differences may occur due to lighting or screen settings.</li>
        </ul>

        <h2 className="font-sans text-lg font-semibold text-gray-900 mt-8 mb-4">Returns &amp; Exchanges</h2>
        <ul className="list-disc ml-6 space-y-2">
          <li>Returns are only accepted within 72 hours after delivery and must meet our return conditions.</li>
        </ul>

        <h2 className="font-sans text-lg font-semibold text-gray-900 mt-8 mb-4">Limitation of Liability</h2>
        <p>Miss Tokyo is not responsible for:</p>
        <ul className="list-disc ml-6 space-y-2">
          <li>Delays caused by courier services or external factors</li>
          <li>Improper use of purchased products</li>
        </ul>

        <h2 className="font-sans text-lg font-semibold text-gray-900 mt-8 mb-4">Updates to Policies</h2>
        <p>We may update these policies at any time. Changes will be posted on this page.</p>
      </div>
    </div>
  );
}
