import { createFileRoute, Link } from "@tanstack/react-router";

export const Route = createFileRoute("/terms")({
  head: () => ({
    meta: [
      { title: "Terms of Service — Hamduk Drive" },
      { name: "description", content: "The terms that govern your use of Hamduk Drive." },
      { property: "og:title", content: "Terms of Service — Hamduk Drive" },
      { property: "og:description", content: "The terms that govern your use of Hamduk Drive." },
    ],
  }),
  component: TermsPage,
});

function TermsPage() {
  return (
    <div className="min-h-screen bg-background">
      <main className="mx-auto max-w-3xl px-4 py-12">
        <Link to="/" className="text-sm text-muted-foreground hover:text-foreground">← Back home</Link>
        <h1 className="mt-4 text-3xl font-bold tracking-tight">Terms of Service</h1>
        <p className="mt-2 text-sm text-muted-foreground">Last updated: June 2026</p>

        <div className="prose prose-sm mt-8 max-w-none space-y-6 text-sm leading-relaxed">
          <section>
            <h2 className="text-lg font-semibold">1. Who provides the service</h2>
            <p>Hamduk Drive ("we", "us") is a technology platform that connects independent drivers with riders in Lagos. We are <em>not</em> a transport carrier — drivers are independent contractors responsible for their own vehicles, insurance, and conduct.</p>
          </section>

          <section>
            <h2 className="text-lg font-semibold">2. Eligibility</h2>
            <ul className="list-disc pl-5">
              <li>You must be 18 or older.</li>
              <li>Drivers must hold a valid Nigerian driver's licence, NIN, roadworthy vehicle, and pass our verification.</li>
              <li>One account per person. No sharing or transferring accounts.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-lg font-semibold">3. Fares & payment</h2>
            <ul className="list-disc pl-5">
              <li>Fare estimates are shown before booking. Final fare may vary slightly based on actual route, distance, and time.</li>
              <li>Online payment is processed by Paystack. Cash payments are made directly to the driver.</li>
              <li>Drivers owe a platform commission on every completed ride (currently 5–8%). Cash drivers settle commission via the in-app debt balance.</li>
              <li>Refunds for cancelled or disputed rides are at our discretion; contact support within 7 days.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-lg font-semibold">4. User conduct</h2>
            <p>You agree not to:</p>
            <ul className="list-disc pl-5">
              <li>Harass, threaten, discriminate, or harm any rider, driver, or staff member.</li>
              <li>Use the service for illegal activity, smuggling, or transporting hazardous goods.</li>
              <li>Damage a driver's vehicle (riders) or refuse legitimate trips on discriminatory grounds (drivers).</li>
              <li>Tamper with the app, scrape data, or circumvent driver verification.</li>
            </ul>
            <p>We may suspend or terminate accounts that violate these rules. Drivers must also follow the Driver Code of Conduct provided at onboarding.</p>
          </section>

          <section>
            <h2 className="text-lg font-semibold">5. Safety</h2>
            <p>If you feel unsafe, contact Nigerian emergency services (112). In-app SOS will be added in a future release. Report any safety incident to <a className="text-primary underline" href="mailto:safety@hamdukdrive.com">safety@hamdukdrive.com</a> within 24 hours.</p>
          </section>

          <section>
            <h2 className="text-lg font-semibold">6. Liability</h2>
            <p>To the maximum extent allowed by Nigerian law: we are not liable for indirect, incidental, or consequential damages arising from your use of the platform, including driver/rider conduct, traffic incidents, or third-party services (Paystack, WhatsApp, maps). Total liability is capped at the amount you paid in the previous 30 days.</p>
          </section>

          <section>
            <h2 className="text-lg font-semibold">7. Account termination & deletion</h2>
            <p>You may delete your account at any time from <em>Account → Delete account</em>. We may suspend accounts for fraud, safety, or repeated policy violations. See our <Link to="/privacy" className="text-primary underline">Privacy Policy</Link> for data retention.</p>
          </section>

          <section>
            <h2 className="text-lg font-semibold">8. Governing law</h2>
            <p>These terms are governed by the laws of the Federal Republic of Nigeria. Disputes are resolved in Lagos State courts.</p>
          </section>

          <section>
            <h2 className="text-lg font-semibold">9. Contact</h2>
            <p><a className="text-primary underline" href="mailto:support@hamdukdrive.com">support@hamdukdrive.com</a></p>
          </section>
        </div>
      </main>
    </div>
  );
}
