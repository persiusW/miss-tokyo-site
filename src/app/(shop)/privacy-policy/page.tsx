import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Privacy Policy | Miss Tokyo",
};

export default function PrivacyPolicy() {
  return (
    <div className="max-w-3xl mx-auto py-16 px-4 sm:px-6">
      <h1 className="font-serif text-3xl md:text-4xl uppercase text-center text-gray-900 mb-12 tracking-wide">
        Privacy Policy
      </h1>
      <div className="space-y-6 text-gray-700 leading-relaxed text-sm">
        <p>
          Miss Tokyo respects your privacy and is committed to protecting your personal information.
        </p>

        <h2 className="font-sans text-lg font-semibold text-gray-900 mt-8 mb-4">We may collect:</h2>
        <ul className="list-disc ml-6 space-y-2">
          <li>Name, phone number, email address, and delivery address</li>
          <li>Payment and order information</li>
          <li>Website usage data for improving customer experience</li>
        </ul>

        <h2 className="font-sans text-lg font-semibold text-gray-900 mt-8 mb-4">Your information is used to:</h2>
        <ul className="list-disc ml-6 space-y-2">
          <li>Process and deliver orders</li>
          <li>Communicate order updates and customer support</li>
          <li>Improve our services and website experience</li>
        </ul>

        <h2 className="font-sans text-lg font-semibold text-gray-900 mt-8 mb-4">
          We do not sell or share your personal data with third parties except when required for:
        </h2>
        <ul className="list-disc ml-6 space-y-2">
          <li>Payment processing</li>
          <li>Delivery services</li>
          <li>Legal obligations</li>
        </ul>
      </div>
    </div>
  );
}
