import { Link } from "react-router-dom";

export default function PrivacyPolicy() {
  return (
    <main className="min-h-screen bg-background text-foreground">
      <header className="border-b border-border bg-card">
        <div className="mx-auto flex max-w-4xl items-center justify-between px-6 py-5">
          <Link to="/" className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary font-bold text-primary-foreground">
              TS
            </div>
            <div>
              <div className="text-lg font-semibold leading-tight">TS-Flow</div>
              <div className="text-xs text-muted-foreground">by TeamSource</div>
            </div>
          </Link>
          <Link to="/" className="text-sm text-muted-foreground hover:text-foreground">
            &larr; Back to home
          </Link>
        </div>
      </header>

      <article className="mx-auto max-w-4xl px-6 py-12">
        <header className="mb-10 border-b border-border pb-8">
          <p className="text-sm font-medium uppercase tracking-wider text-primary">
            TeamSource Technologies Limited
          </p>
          <h1 className="mt-2 text-4xl font-bold tracking-tight text-balance md:text-5xl">
            Privacy Policy
          </h1>
          <dl className="mt-6 grid gap-2 text-sm text-muted-foreground sm:grid-cols-2">
            <div>
              <dt className="inline font-semibold text-foreground">Effective Date: </dt>
              <dd className="inline">9th July, 2026</dd>
            </div>
            <div>
              <dt className="inline font-semibold text-foreground">Last Updated: </dt>
              <dd className="inline">9th July, 2026</dd>
            </div>
          </dl>
        </header>

        <div className="space-y-10 text-[15px] leading-7 text-foreground/90">
          <section>
            <h2 className="mb-3 text-2xl font-semibold tracking-tight">1. Introduction</h2>
            <p>
              TeamSource Technologies Limited (<strong>"TeamSource"</strong>, <strong>"we"</strong>,{" "}
              <strong>"our"</strong>, or <strong>"us"</strong>) is committed to protecting the privacy and
              personal data of our clients, employees, business partners, website visitors, vendors, and
              all individuals whose personal data we process.
            </p>
            <p className="mt-3">
              As a technology integration and digital solutions company, TeamSource provides services
              including web development, e-commerce solutions and platforms, digital marketing, Enterprise
              Resource Planning (ERP) implementation, software development, cybersecurity services, API
              integrations, financial systems integration, cloud services, managed IT support, and other
              related technology solutions.
            </p>
            <p className="mt-3">
              This Privacy Policy explains how we collect, use, disclose, store, protect, and otherwise
              process personal data in accordance with the Nigeria Data Protection Act, 2023 ("NDPA"),
              applicable regulations issued by the Nigeria Data Protection Commission (NDPC), and other
              applicable laws.
            </p>
            <p className="mt-3">
              By accessing our website, using our services, or interacting with us, you acknowledge that
              you have read and understood this Privacy Policy.
            </p>
          </section>

          <section>
            <h2 className="mb-3 text-2xl font-semibold tracking-tight">2. Scope</h2>
            <p>
              This Privacy Policy applies to all personal data processed by TeamSource in the course of
              its business operations and the provision of its products and services. It governs the
              processing of personal data relating to our clients and prospective clients, website
              visitors, employees, job applicants, contractors, consultants, vendors, service providers,
              business partners, and users of applications, websites, software, and digital platforms
              developed, deployed, or managed by TeamSource. The Policy also applies to the personal
              data of individuals whose information we process on behalf of our clients in the course of
              providing our technology, cloud, cybersecurity, software development, systems integration,
              managed IT, digital marketing, ERP implementation, and other related services.
            </p>
            <p className="mt-3">
              This Privacy Policy applies irrespective of the medium through which the personal data is
              collected, whether electronically, physically, verbally, or through automated technologies,
              and covers all processing activities undertaken by TeamSource in accordance with applicable
              data protection laws.
            </p>
          </section>

          <section>
            <h2 className="mb-3 text-2xl font-semibold tracking-tight">3. Definitions</h2>
            <p>For the purpose of this Policy:</p>
            <dl className="mt-3 space-y-3">
              <div>
                <dt className="inline font-semibold">"Personal Data"</dt>
                <dd className="inline"> means any information relating to an identified or identifiable natural person.</dd>
              </div>
              <div>
                <dt className="inline font-semibold">"Processing"</dt>
                <dd className="inline"> means any operation performed on personal data including collection, recording, storage, use, disclosure, transmission, alteration, retrieval, restriction, deletion, or destruction.</dd>
              </div>
              <div>
                <dt className="inline font-semibold">"Data Subject"</dt>
                <dd className="inline"> means the individual to whom personal data relates.</dd>
              </div>
              <div>
                <dt className="inline font-semibold">"Controller"</dt>
                <dd className="inline"> means a person or organisation that determines the purposes and means of processing personal data.</dd>
              </div>
              <div>
                <dt className="inline font-semibold">"Processor"</dt>
                <dd className="inline"> means a person or organisation that processes personal data on behalf of a controller.</dd>
              </div>
            </dl>
          </section>

          <section>
            <h2 className="mb-3 text-2xl font-semibold tracking-tight">4. Personal Data We Collect</h2>
            <p>
              Depending on the nature of our relationship with you, we may collect the following
              categories of personal data: identity information, contact information, employment
              information, financial information, technical information, digital service information,
              marketing information, and recruitment information.
            </p>
          </section>

          <section>
            <h2 className="mb-3 text-2xl font-semibold tracking-tight">5. How We Collect Personal Data</h2>
            <p>
              We collect personal data directly from you when you interact with us, use our website,
              applications or services, complete forms, subscribe to our services, communicate with us,
              participate in our client onboarding or recruitment processes, or execute contracts with
              us. We may also collect personal data through cookies and similar technologies, customer
              support interactions, third-party service providers, business partners, publicly available
              sources where permitted by law, and regulatory authorities where required or authorised by
              applicable law.
            </p>
          </section>

          <section>
            <h2 className="mb-3 text-2xl font-semibold tracking-tight">6. Purposes for Processing Personal Data</h2>
            <p>We process personal data for one or more of the following purposes:</p>
            <p className="mt-3">
              service delivery, client relationship management, business operations, recruitment and
              human resources, marketing, security, and legal and regulatory compliance.
            </p>
          </section>

          <section>
            <h2 className="mb-3 text-2xl font-semibold tracking-tight">7. Lawful Basis for Processing</h2>
            <p>
              In accordance with the Nigeria Data Protection Act, TeamSource processes personal data on
              one or more of the following lawful bases:
            </p>
            <ul className="mt-3 list-disc space-y-2 pl-6">
              <li>Consent of the data subject;</li>
              <li>Performance of a contract;</li>
              <li>Compliance with legal obligations;</li>
              <li>Protection of vital interests;</li>
              <li>Performance of a task carried out in the public interest where applicable;</li>
              <li>
                Legitimate interests pursued by TeamSource or a third party, provided such interests do
                not override the rights and freedoms of the data subject.
              </li>
            </ul>
          </section>

          <section>
            <h2 className="mb-3 text-2xl font-semibold tracking-tight">8. Cookies and Similar Technologies</h2>
            <p>Our website may use cookies and similar technologies to:</p>
            <ul className="mt-3 list-disc space-y-2 pl-6">
              <li>Improve website functionality;</li>
              <li>Remember user preferences;</li>
              <li>Analyze website traffic;</li>
              <li>Enhance user experience;</li>
              <li>Improve website security;</li>
              <li>Monitor website performance.</li>
            </ul>
            <p className="mt-3">
              Users may disable cookies through their browser settings. However, certain website
              features may not function properly if cookies are disabled.
            </p>
          </section>

          <section>
            <h2 className="mb-3 text-2xl font-semibold tracking-tight">9. Disclosure of Personal Data</h2>
            <p>
              We may disclose personal data to our authorised employees, affiliates, business partners,
              service providers (including cloud, payment, IT infrastructure, and cybersecurity
              providers), professional advisers, auditors, and third-party vendors that support our
              operations. We may also disclose personal data to regulatory authorities, law enforcement
              agencies, courts, or tribunals where required or permitted by law.
            </p>
            <p className="mt-3">
              Where personal data is shared with third parties, we ensure that appropriate contractual,
              technical, and organizational safeguards are in place to protect such data and ensure
              compliance with applicable data protection laws.
            </p>
          </section>

          <section>
            <h2 className="mb-3 text-2xl font-semibold tracking-tight">10. International Transfers of Personal Data</h2>
            <p>Some of our technology infrastructure or service providers may be located outside Nigeria.</p>
            <p className="mt-3">Where personal data is transferred outside Nigeria, TeamSource shall ensure that:</p>
            <ul className="mt-3 list-disc space-y-2 pl-6">
              <li>the receiving country provides an adequate level of protection; or</li>
              <li>appropriate contractual, organisational, and technical safeguards are implemented; or</li>
              <li>another lawful transfer mechanism recognised under the NDPA applies.</li>
            </ul>
          </section>

          <section>
            <h2 className="mb-3 text-2xl font-semibold tracking-tight">11. Data Security</h2>
            <p>
              TeamSource implements appropriate technical and organizational measures to protect
              personal data against unauthorised access, loss, misuse, alteration, or disclosure.
            </p>
            <p className="mt-3">
              These measures include, where appropriate, encryption, multi-factor authentication,
              role-based access controls, firewalls, endpoint protection, security monitoring,
              vulnerability assessments, secure software development practices, backup and disaster
              recovery mechanisms, incident response procedures, employee confidentiality obligations,
              and regular cybersecurity awareness training. While we apply industry-standard security
              measures, no method of electronic transmission or storage can be guaranteed to be
              completely secure.
            </p>
          </section>

          <section>
            <h2 className="mb-3 text-2xl font-semibold tracking-tight">12. Data Retention</h2>
            <p>
              TeamSource retains personal data in accordance with its Data Retention Policy, which sets
              out the applicable retention periods and disposal procedures based on legal, regulatory,
              contractual, and business requirements. A copy of the Data Retention Policy may be made
              available upon request. Upon the expiry of the applicable retention period, personal data
              is securely deleted, anonymized, or destroyed in accordance with our approved data
              disposal procedures.
            </p>
          </section>

          <section>
            <h2 className="mb-3 text-2xl font-semibold tracking-tight">13. Rights of Data Subjects</h2>
            <p>
              Subject to the provisions of the Nigeria Data Protection Act, data subjects have the right
              to:
            </p>
            <ul className="mt-3 list-disc space-y-2 pl-6">
              <li>be informed about the processing of their personal data;</li>
              <li>request access to their personal data;</li>
              <li>request correction of inaccurate or incomplete personal data;</li>
              <li>request deletion of personal data where legally applicable;</li>
              <li>request restriction of processing;</li>
              <li>object to processing in appropriate circumstances;</li>
              <li>withdraw consent where processing is based on consent;</li>
              <li>request data portability where applicable;</li>
              <li>lodge a complaint with the Nigeria Data Protection Commission (NDPC);</li>
              <li>seek judicial remedies where their rights have been violated.</li>
            </ul>
            <p className="mt-3">Requests may be submitted using the contact details provided below.</p>
          </section>

          <section>
            <h2 className="mb-3 text-2xl font-semibold tracking-tight">14. Children's Personal Data</h2>
            <p>
              TeamSource does not knowingly collect personal data relating to children except where
              permitted by applicable law or where appropriate consent has been obtained from a parent
              or legal guardian.
            </p>
            <p className="mt-3">
              Where we become aware that personal data has been collected from a child without lawful
              authority, appropriate steps shall be taken to delete such data.
            </p>
          </section>

          <section>
            <h2 className="mb-3 text-2xl font-semibold tracking-tight">15. Automated Decision-Making</h2>
            <p>
              TeamSource does not make decisions that produce legal or similarly significant effects
              solely through automated processing without appropriate human involvement, except where
              permitted under applicable law.
            </p>
          </section>

          <section>
            <h2 className="mb-3 text-2xl font-semibold tracking-tight">16. Third-Party Websites</h2>
            <p>Our website or applications may contain links to third-party websites.</p>
            <p className="mt-3">
              We are not responsible for the privacy practices or content of external websites. Users
              are encouraged to review the privacy policies of such websites before providing personal
              data.
            </p>
          </section>

          <section>
            <h2 className="mb-3 text-2xl font-semibold tracking-tight">17. Data Breach Management</h2>
            <p>
              Where a personal data breach occurs that is likely to result in a risk to the rights and
              freedoms of individuals, TeamSource shall:
            </p>
            <ul className="mt-3 list-disc space-y-2 pl-6">
              <li>promptly assess the breach;</li>
              <li>take appropriate remedial measures;</li>
              <li>notify the Nigeria Data Protection Commission where required;</li>
              <li>
                notify affected data subjects where the breach is likely to result in a high risk to
                their rights and freedoms; and
              </li>
              <li>maintain records of all reportable personal data breaches.</li>
            </ul>
          </section>

          <section>
            <h2 className="mb-3 text-2xl font-semibold tracking-tight">18. Responsibilities of Users</h2>
            <p>Users are expected to:</p>
            <ul className="mt-3 list-disc space-y-2 pl-6">
              <li>provide accurate personal information;</li>
              <li>maintain the confidentiality of login credentials;</li>
              <li>promptly notify TeamSource of unauthorised access to their accounts;</li>
              <li>ensure that personal data provided to TeamSource is lawful and accurate.</li>
            </ul>
          </section>

          <section>
            <h2 className="mb-3 text-2xl font-semibold tracking-tight">19. Changes to This Privacy Policy</h2>
            <p>
              We may update this Privacy Policy from time to time to reflect changes in applicable law,
              technology, business operations, or regulatory requirements.
            </p>
            <p className="mt-3">
              The updated version will be published on our website with the revised effective date.
            </p>
          </section>

          <section>
            <h2 className="mb-3 text-2xl font-semibold tracking-tight">20. Contact Us</h2>
            <p>
              Questions, requests, complaints, or enquiries regarding this Privacy Policy or our
              processing of personal data may be directed to:
            </p>
            <div className="mt-4 rounded-lg border border-border bg-muted/40 p-5 text-sm">
              <p className="font-semibold text-foreground">Data Protection Officer: Victor Ofurum</p>
              <p className="font-semibold text-foreground">TeamSource Technologies Limited</p>
              <p className="mt-2">
                Email:{" "}
                <a href="mailto:victor@teamsource.net" className="text-primary hover:underline">
                  victor@teamsource.net
                </a>
              </p>
              <p>
                Telephone: <span className="font-semibold">+234 816 807 0935</span>
              </p>
              <p>Address: 10 Gbolahan Lawal Close, off Ashabi Cole CBD Alausa Ikeja, Lagos Nigeria</p>
            </div>
            <p className="mt-4 italic text-muted-foreground">
              Where you are dissatisfied with our response, you have the right to lodge a complaint with
              the <strong>Nigeria Data Protection Commission (NDPC)</strong>.
            </p>
          </section>

          <section>
            <h2 className="mb-3 text-2xl font-semibold tracking-tight">21. Consent</h2>
            <p>
              Where processing is based on consent, such consent shall be freely given, specific,
              informed, and unambiguous. Data subjects may withdraw their consent at any time without
              affecting the lawfulness of processing carried out before such withdrawal.
            </p>
          </section>

          <section>
            <h2 className="mb-3 text-2xl font-semibold tracking-tight">22. Governing Law</h2>
            <p>
              This Privacy Policy shall be governed by and construed in accordance with the laws of the
              Federal Republic of Nigeria, including the Nigeria Data Protection Act, 2023, and any
              regulations or directives issued by the Nigeria Data Protection Commission.
            </p>
          </section>
        </div>

        <footer className="mt-16 border-t border-border pt-6 text-sm text-muted-foreground">
          <p>&copy; {new Date().getFullYear()} TeamSource Technologies Limited. All rights reserved.</p>
        </footer>
      </article>
    </main>
  );
}