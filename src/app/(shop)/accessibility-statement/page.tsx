import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Accessibility Statement | Miss Tokyo",
};

export default function AccessibilityStatement() {
  return (
    <div className="max-w-3xl mx-auto py-16 px-4 sm:px-6">
      <h1 className="font-serif text-3xl md:text-4xl uppercase text-center text-gray-900 mb-4 tracking-wide">
        Accessibility Statement
      </h1>
      <p className="text-center text-xs text-gray-400 uppercase tracking-widest mb-12">
        Last updated: March 2026
      </p>

      <div className="space-y-6 text-gray-700 leading-relaxed text-sm">
        <p>
          We at Miss Tokyo are working to make our site accessible to people with disabilities.
        </p>

        <h2 className="font-sans text-lg font-semibold text-gray-900 mt-8 mb-4">What web accessibility is</h2>
        <p>
          An accessible site allows visitors with disabilities to browse the site with the same or a similar level of ease and enjoyment as other visitors. This can be achieved with the capabilities of the system on which the site is operating, and through assistive technologies.
        </p>

        <h2 className="font-sans text-lg font-semibold text-gray-900 mt-8 mb-4">
          Accessibility adjustments on this site
        </h2>
        <p>
          We have adapted this site in accordance with WCAG guidelines. This site's contents have been adapted to work with assistive technologies, such as screen readers and keyboard use. As part of this effort, we have also:
        </p>
        <ul className="list-disc ml-6 space-y-2">
          <li>Defined clear heading structures on all of the site's pages</li>
          <li>Added alternative text to images</li>
          <li>Implemented color combinations that meet the required color contrast</li>
        </ul>

        <h2 className="font-sans text-lg font-semibold text-gray-900 mt-8 mb-4">
          Requests, issues and suggestions
        </h2>
        <p>
          If you find an accessibility issue on the site, or if you require further assistance, you are welcome to contact us:
        </p>
        <ul className="list-none ml-0 space-y-2 mt-3">
          <li>
            <span className="font-semibold text-gray-900">Telephone:</span>{" "}
            <a href="tel:0553898704" className="underline hover:text-black transition-colors">
              055 389 8704
            </a>
          </li>
          <li>
            <span className="font-semibold text-gray-900">Email:</span>{" "}
            <a href="mailto:orders@misstokyo.shop" className="underline hover:text-black transition-colors">
              orders@misstokyo.shop
            </a>
          </li>
        </ul>
      </div>
    </div>
  );
}
