import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Refund Policy | Miss Tokyo",
};

export default function RefundPolicy() {
  return (
    <div className="max-w-3xl mx-auto py-16 px-4 sm:px-6">
      <h1 className="font-serif text-3xl md:text-4xl uppercase text-center text-gray-900 mb-12 tracking-wide">
        Refund Policy
      </h1>
      <div className="prose-content space-y-6 text-gray-700 leading-relaxed text-sm">
        <p>
          At Miss Tokyo, customer satisfaction is important to us. If you are not fully satisfied with your purchase, you may request a return within 72&nbsp;hours of receiving your order.
        </p>

        <h2 className="font-sans text-lg font-semibold text-gray-900 mt-8 mb-4">
          To be eligible for a return:
        </h2>
        <ul className="list-disc ml-6 space-y-2">
          <li>Items must be unused, unworn, and in original condition with tags attached.</li>
          <li>Returns must be requested within the 72-hour return window after delivery.</li>
          <li>Items damaged due to misuse or normal wear are not eligible for return.</li>
        </ul>

        <h2 className="font-sans text-lg font-semibold text-gray-900 mt-8 mb-4">
          Once your return is approved and received, we will:
        </h2>
        <ul className="list-disc ml-6 space-y-2">
          <li>Offer an exchange, or</li>
          <li>Provide store credit equal to the purchase value.</li>
        </ul>

        <h2 className="font-sans text-lg font-semibold text-gray-900 mt-8 mb-4">Note:</h2>
        <p>
          Delivery fees are non-refundable, and customers may be responsible for return shipping costs unless the item received was incorrect or defective.
        </p>
      </div>
    </div>
  );
}
