import { createFileRoute, Link } from "@tanstack/react-router";

export const Route = createFileRoute("/privacy")({
  head: () => ({
    meta: [
      { title: "Privacy Policy — Hamduk Drive" },
      { name: "description", content: "How Hamduk Drive collects, uses, and protects your personal data." },
      { property: "og:title", content: "Privacy Policy — Hamduk Drive" },
      { property: "og:description", content: "How Hamduk Drive collects, uses, and protects your personal data." },
    ],
  }),
  component: PrivacyPage,
});

function PrivacyPage() {
  return (
    <div className="min-h-screen bg-background">
      <main className="mx-auto max-w-3xl px-4 py-12">
        <Link to="/" className="text-sm text-muted-foreground hover:text-foreground">← Back home</Link>
        <h1 className="mt-4 text-3xl font-bold tracking-tight">Privacy Policy</h1>
        <p className="mt-2 text-sm text-muted-foreground">Last updated: June 2026</p>

        <div className="prose prose-sm mt-8 max-w-none space-y-6 text-sm leading-relaxed">
          <section>
            <h2 className="text-lg font-semibold">Who we are</h2>
            <p>Hamduk Drive is operated by Hamduk Unique Concept, a ride-hailing platform launched in the LASU axis of Lagos, Nigeria. Contact: <a className="text-primary underline" href="mailto:support@hamdukdrive.com">support@hamdukdrive.com</a>.</p>
          </section>

          <section>
            <h2 className="text-lg font-semibold">What data we collect</h2>
            <ul className="list-disc pl-5">
              <li><strong>Account:</strong> full name, phone, email, role (rider or driver).</li>
              <li><strong>Driver onboarding:</strong> date of birth, home address, NIN, driver's licence, vehicle details, bank account, government IDs, and photos. Required to verify driver identity and process payouts.</li>
              <li><strong>Trip data:</strong> pickup/destination addresses and coordinates, distance, duration, fare, payment method.</li>
              <li><strong>Payments:</strong> we use Paystack to process online payments; we do not store full card numbers.</li>
              <li><strong>Device & usage:</strong> approximate location during active trips, IP address, browser/device type.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-lg font-semibold">How we use it</h2>
            <ul className="list-disc pl-5">
              <li>Match riders to verified drivers, calculate fares, and complete trips.</li>
              <li>Verify driver identity and eligibility (KYC).</li>
              <li>Dispatch ride requests to drivers via WhatsApp groups.</li>
              <li>Process payments and pay drivers via Paystack subaccount splits.</li>
              <li>Detect fraud, abuse, and policy violations.</li>
              <li>Communicate operational notices (trip status, receipts, account changes).</li>
            </ul>
          </section>

          <section>
            <h2 className="text-lg font-semibold">Who we share with</h2>
            <ul className="list-disc pl-5">
              <li><strong>The other party on a trip</strong> (rider sees driver name + vehicle; driver sees pickup details).</li>
              <li><strong>Paystack</strong> for payment processing and bank account verification.</li>
              <li><strong>WhatsApp/Meta</strong> when dispatch messages are sent to the driver group.</li>
              <li><strong>Government & law enforcement</strong> where legally required.</li>
            </ul>
            <p>We never sell personal data.</p>
          </section>

          <section>
            <h2 className="text-lg font-semibold">Permissions we request</h2>
            <ul className="list-disc pl-5">
              <li><strong>Location:</strong> to set your pickup, route the trip, and let your driver find you. You can deny and enter addresses manually.</li>
              <li><strong>Notifications:</strong> for trip status updates and driver arrival.</li>
              <li><strong>Camera & files:</strong> drivers only, to upload verification documents.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-lg font-semibold">Data retention</h2>
            <p>Trip and payment records are kept for 7 years to meet Nigerian tax and audit obligations. Driver verification documents are kept while the account is active and for 90 days after deletion. Profile data is deleted within 30 days of account deletion (see below).</p>
          </section>

          <section>
            <h2 className="text-lg font-semibold">Your rights</h2>
            <ul className="list-disc pl-5">
              <li><strong>Access & correction:</strong> view and edit your profile from inside the app.</li>
              <li><strong>Deletion:</strong> request account deletion at any time from <em>Account → Delete account</em> in the app, or by emailing <a className="text-primary underline" href="mailto:support@hamdukdrive.com">support@hamdukdrive.com</a>. Active rides are cancelled and personal data is purged.</li>
              <li><strong>Complaints:</strong> contact NDPC (Nigeria Data Protection Commission) if you believe we mishandle your data.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-lg font-semibold">Children</h2>
            <p>Hamduk Drive is not for users under 18. We do not knowingly collect data from minors.</p>
          </section>

          <section>
            <h2 className="text-lg font-semibold">Changes</h2>
            <p>We'll post material changes to this page and notify active users by email.</p>
          </section>
        </div>
      </main>
    </div>
  );
}
