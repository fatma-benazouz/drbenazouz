import { createFileRoute, Link } from "@tanstack/react-router";
import { PageHero } from "@/components/site/PageHero";
import { PRACTICE } from "@/lib/site";

export const Route = createFileRoute("/privacy")({
  head: () => ({
    meta: [
      { title: "Privacy Policy (POPIA) | Corporate Metabolic Clinic" },
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

const SECTIONS = [
  {
    h: "Who we are",
    p: [
      `${PRACTICE.name} (Dr Ben Azouz), ${PRACTICE.addressLine1}, ${PRACTICE.addressLine2}, is the responsible party for the personal information described in this policy. You can reach us at ${PRACTICE.email} or ${PRACTICE.phone}.`,
    ],
  },
  {
    h: "What we collect",
    p: [
      "When you request an appointment online we collect your full name, email address, contact or WhatsApp number, the service you are enquiring about, your preferred date and time, your preferred language, whether you are a new or existing patient, and the short reason for your visit that you choose to give us.",
      "If you become a patient, we also keep the clinical records required of a medical practice, including your history, examination findings, results, diagnoses, prescriptions and correspondence.",
    ],
  },
  {
    h: "Why we collect it",
    p: [
      "To schedule, confirm, reschedule or cancel your appointment; to contact you about your care; to provide medical treatment and keep accurate clinical records; and to comply with legal, professional and medical-scheme obligations.",
      "We do not sell your information and we do not use it for third-party marketing.",
    ],
  },
  {
    h: "Consent",
    p: [
      "By submitting a booking request you consent to the practice processing the personal information you provide for the purposes above, in line with the Protection of Personal Information Act 4 of 2013 (POPIA). You may withdraw consent at any time by contacting us, though this may prevent us from providing care.",
    ],
  },
  {
    h: "How we store and protect it",
    p: [
      "Booking information is stored on secure, access-controlled infrastructure. Patient contact details and the reason for your visit are visible only to authorised practice staff after signing in - they are never exposed publicly on this website. Our online calendar shows only which time slots are taken, never who booked them.",
      "Clinical records are retained for the periods required by South African law and Health Professions Council of South Africa guidance.",
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
      "You may request access to the personal information we hold about you, ask us to correct or delete information that is inaccurate or no longer needed, object to processing, and lodge a complaint with the Information Regulator of South Africa. Write to us at the email address above and we will respond within a reasonable period.",
    ],
  },
  {
    h: "Cookies and analytics",
    p: [
      "This website uses only the cookies and local storage needed to make the site and booking form work. We do not use advertising trackers.",
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
            Back to booking page
          </Link>
        </div>
      </section>
    </>
  );
}
