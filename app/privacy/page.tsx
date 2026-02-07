
export default function PrivacyPage() {
    return (
        <main className="container mx-auto px-4 py-12 max-w-4xl">
            <h1 className="text-3xl font-bold mb-2">PRIVACY POLICY</h1>
            <p className="text-sm text-muted-foreground mb-8">Effective Date: 2026-02-07</p>

            <div className="space-y-8 text-foreground">
                <section>
                    <h2 className="text-xl font-semibold mb-3">1. Introduction</h2>
                    <p className="leading-relaxed">
                        We respect your privacy. This policy outlines how Silip/Tanod (&quot;we&quot;) collects and handles data in compliance with <strong>Republic Act No. 10173 (Data Privacy Act of 2012)</strong>.
                    </p>
                </section>

                <section>
                    <h2 className="text-xl font-semibold mb-3">2. Information We Collect</h2>
                    <ul className="list-disc pl-6 space-y-2">
                        <li>
                            <strong>System Logs:</strong> IP addresses, browser type, and timestamps to monitor API health and security.
                        </li>
                        <li>
                            <strong>Account Data:</strong> If you register, we collect your name and email address.
                        </li>
                        <li>
                            <strong>Usage Data:</strong> Search queries sent to the Silip API (used to improve search relevance).
                        </li>
                    </ul>
                </section>

                <section>
                    <h2 className="text-xl font-semibold mb-3">3. Purpose of Processing</h2>
                    <p className="mb-2">We process this data for:</p>
                    <ul className="list-disc pl-6 space-y-1">
                        <li>Security (preventing DDoS attacks and abuse).</li>
                        <li>Service improvement (optimizing the API).</li>
                        <li>User account management.</li>
                    </ul>
                </section>

                <section>
                    <h2 className="text-xl font-semibold mb-3">4. Data Protection</h2>
                    <p className="leading-relaxed">
                        We implement organizational, physical, and technical security measures to protect your data. We do not sell your personal information to third parties.
                    </p>
                </section>

                <section>
                    <h2 className="text-xl font-semibold mb-3">5. Rights of the Data Subject</h2>
                    <p className="leading-relaxed">
                        Under the DPA, you have the right to access, correct, and object to the processing of your personal data. To exercise these rights, contact us at <strong>derf@sanchez.ph</strong>.
                    </p>
                </section>
            </div>
        </main>
    )
}
