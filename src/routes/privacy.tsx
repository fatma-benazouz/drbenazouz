import { createFileRoute, Link } from "@tanstack/react-router";
import { PageHero } from "@/components/site/PageHero";
import { FULL_ADDRESS, PRACTICE } from "@/lib/site";

export const Route = createFileRoute("/privacy")({
  head: () => ({
    meta: [
      { title: "Privacy Policy (POPIA) | Dr Ben Azouz MH" },
      {
        name: "description",
        content:
          "How Dr Ben Azouz's practice collects, uses, stores and protects your personal and health information under South Africa's POPIA.",
      },
      { property: "og:title", content: "Privacy Policy (POPIA)" },
      {
        property: "og:description",
        content: "How the practice handles your personal and health information under POPIA.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: Privacy,
});

const LAST_UPDATED = "28 September 2026";

const SECTIONS = [
  {
    h: "Who we are",
    p: [
      `${PRACTICE.name}, ${FULL_ADDRESS}, is the responsible party for the personal information described in this policy. You can reach us at ${PRACTICE.email} or ${PRACTICE.phone}.`,
    ],
  },
  {
    h: "What we collect",
    p: [
      "Appointment details: when you book online, you do so on the GoodX myGC booking portal. The details you enter there - such as your name, contact details, whether you are a new or existing patient, your chosen date and time and the reason for your visit - are passed to the practice diary so we can see you.",
      "Contact details and messages: if you phone, email or WhatsApp the practice, we receive your name, number or email address and whatever you choose to tell us.",
      "Patient and billing records: if you become a patient, we keep the clinical records required of a medical practice (including your history, examination findings, results, diagnoses, prescriptions and correspondence), together with the details needed for invoicing, such as your address, date of birth and medical aid information.",
      "This website itself has no sign-up or contact forms and does not collect personal information from visitors.",
    ],
  },
  {
    h: "Why we collect it",
    p: [
      "To schedule, confirm, reschedule or cancel your appointment; to contact you about your care; to provide medical treatment and keep accurate clinical records; to invoice you or your medical aid; and to comply with legal, professional and medical-scheme obligations.",
      "Health information is special personal information under POPIA. We process it as a healthcare provider for the purposes of your care, under the duty of medical confidentiality.",
      "We do not sell your information and we do not use it for third-party marketing.",
    ],
  },
  {
    h: "Consent",
    p: [
      "By booking an appointment or contacting the practice, you consent to us processing the personal information you provide for the purposes above. You may withdraw consent at any time by contacting us, though this may prevent us from providing care. Where the law requires us to keep records, we will continue to do so.",
      "If you book for a child or someone in your care, you confirm that you are their parent, guardian or are otherwise authorised to act for them.",
    ],
  },
  {
    h: "How we store and protect it",
    p: [
      "Patient records are visible only to authorised practice staff - they are never exposed publicly.",
      "Clinical records are retained for the periods required by South African law and Health Professions Council of South Africa guidance, and are then securely destroyed.",
    ],
  },
  {
    h: "Who we share it with",
    p: [
      "Only where necessary for your care or where the law requires it: referral specialists, pathology and radiology providers, your medical scheme, and regulators. Each is bound by their own confidentiality obligations.",
    ],
  },
  {
    h: "Your rights",
    p: [
      "You may request access to the personal information we hold about you, ask us to correct or delete information that is inaccurate or no longer needed, and object to processing. Write to us at the email address above and we will respond within a reasonable period.",
    ],
  },
  {
    h: "Changes to this policy",
    p: [
      "We may update this policy when our services or the way we handle information change. The date at the top of this page shows when it was last revised.",
    ],
  },
];

function Privacy() {
  return (
    <>
      <PageHero
        title="Privacy Policy"
        lead="How we collect, use and protect your personal and health information under POPIA."
      />
      <section className="bg-background py-11 lg:py-16">
        <div className="mx-auto max-w-3xl px-5 lg:px-8">
          <p className="mb-8 text-[0.8125rem] text-grey">Last updated: {LAST_UPDATED}</p>
          {SECTIONS.map((s) => (
            <div key={s.h} className="mb-8">
              <h2 className="text-2xl text-ink">{s.h}</h2>
              <div className="mt-3 space-y-3 text-[0.9rem] leading-relaxed text-grey">
                {s.p.map((para) => (
                  <p key={para.slice(0, 20)}>{para}</p>
                ))}
              </div>
            </div>
          ))}
          <Link
            to="/book"
            className="block border-t border-border pt-6 text-sm font-semibold text-navy underline underline-offset-2"
          >
            Book an appointment
          </Link>
        </div>
      </section>
    </>
  );
}
