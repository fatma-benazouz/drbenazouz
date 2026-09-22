import { Link, createFileRoute } from "@tanstack/react-router";
import { ArrowRight } from "lucide-react";

import heroAsset from "@/assets/hichem-hero.jpg.asset.json";
import aboutImage from "@/assets/hichem-about.jpg.asset.json";
import heroImage from "@/assets/dr-azouz-hero.jpg";
import portrait from "@/assets/dr-azouz-portrait.jpg";
import { CtaBand } from "@/components/site/CtaBand";
import { Reveal } from "@/components/site/Reveal";
import { Button } from "@/components/ui/button";
import { JOURNEY, PRACTICE, SERVICES } from "@/lib/site";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Dr Ben Azouz | General Practitioner in Sandton" },
      {
        name: "description",
        content:
          "Personalised, preventative general practice for executives, professionals and families in Sandton Central.",
      },
      { property: "og:title", content: "Dr Ben Azouz | Corporate Metabolic Clinic" },
      { property: "og:description", content: "Modern general practice and metabolic care in Sandton Central." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Home,
});

const TRUST = [
  "Patient-centred, one doctor throughout",
  "Evidence-based, no shortcuts",
  "Sandton Central, easy access",
];

function Home() {
  return (
    <>
      <section className="bg-white">
        <div className="mx-auto grid max-w-6xl items-center gap-9 px-5 py-10 lg:grid-cols-[1.05fr_0.95fr] lg:gap-14 lg:px-7 lg:py-14">
          <div className="max-w-xl fade-up">
            <h1 className="text-[clamp(2.5rem,5vw+0.5rem,4.5rem)] leading-[0.95] text-ink">
              Modern medicine, built around how you actually live.
            </h1>
            <p className="mt-5 max-w-lg text-[0.9rem] leading-relaxed text-grey sm:text-base">
              Primary care, chronic condition management and metabolic health for professionals who need a doctor who
              sees the whole picture - not just the next appointment. Quality care for French-speakers in Johannesburg
              seeking an appointment with the doctor who serves as medical advisor to the French Consulate General.
            </p>
            <div className="mt-6 flex flex-col gap-2.5 sm:flex-row">
              <Button asChild size="lg" className="h-10 px-6 text-[0.8125rem]">
                <Link to="/book">Book a consultation</Link>
              </Button>
              <Button asChild variant="navyOutline" size="lg" className="h-10 px-6 text-[0.8125rem]">
                <Link to="/services">View services</Link>
              </Button>
            </div>
          </div>
          <div className="relative min-h-[24rem] overflow-hidden lg:min-h-[31rem]">
            <img
              src={aboutImage.url}
              alt="Dr Ben Azouz in his Sandton consulting rooms"
              width={1408}
              height={1600}
              className="absolute inset-0 h-full w-full object-cover object-[65%_center]"
            />
          </div>
        </div>
      </section>

      <section className="border-y border-hairline bg-white">
        <ul className="mx-auto grid max-w-6xl px-5 sm:grid-cols-3 lg:px-7">
          {TRUST.map((item, index) => (
            <li
              key={item}
              className={`py-4 text-[0.8125rem] font-medium text-ink ${index ? "border-t border-hairline sm:border-l sm:border-t-0 sm:pl-6" : ""} ${index < 2 ? "sm:pr-6" : ""}`}
            >
              {item}
            </li>
          ))}
        </ul>
      </section>

      <section className="bg-white py-14 lg:py-22">
        <div className="mx-auto max-w-6xl px-5 lg:px-7">
          <div className="max-w-xl">
            <h2 className="text-4xl leading-none text-ink sm:text-5xl">Care that goes beyond the check-up</h2>
            <p className="mt-4 text-[0.9rem] leading-relaxed text-grey">
              General practice with a genuine focus on metabolic health, built for people who want to stay ahead of
              their health, not just react to it.
            </p>
          </div>
          <div className="mt-10 border-b border-hairline">
            {SERVICES.map((service) => (
              <Link
                key={service.slug}
                to="/services/$slug"
                params={{ slug: service.slug }}
                className="group grid gap-3 border-t border-hairline py-5 transition-colors hover:text-blue md:grid-cols-[minmax(0,0.85fr)_minmax(0,1.8fr)_auto] md:items-start md:gap-8"
              >
                <h3 className="text-xl leading-tight text-ink group-hover:text-blue">{service.title}</h3>
                <p className="text-[0.8125rem] leading-relaxed text-grey">{service.short}</p>
                <span className="inline-flex items-center gap-2 text-[0.8125rem] font-semibold text-blue">
                  View service{" "}
                  <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" aria-hidden="true" />
                </span>
              </Link>
            ))}
          </div>
        </div>
      </section>

      <section className="border-y border-hairline bg-white py-14 lg:py-22">
        <div className="mx-auto grid max-w-6xl items-start gap-9 px-5 lg:grid-cols-[0.82fr_1.18fr] lg:gap-16 lg:px-7">
          <Reveal>
            <img
              src={heroAsset.url}
              alt="Dr Ben Azouz against the Sandton skyline"
              width={1200}
              height={1408}
              loading="lazy"
              className="aspect-[4/5] w-full object-cover"
            />
          </Reveal>
          <Reveal delay={100}>
            <h2 className="text-4xl leading-none text-ink sm:text-5xl">One doctor. The whole picture.</h2>
            <div className="mt-6 max-w-xl space-y-4 text-[0.9rem] leading-relaxed text-grey">
              <p>
                Dr Ben Azouz is a general practitioner who believes in continuity and whole-person care. He looks beyond
                the immediate symptom to the physical, emotional and social picture behind it.
              </p>
              <p>
                His practice combines classic family medicine with a special interest in metabolic medicine, executive
                health and lifestyle medicine.
              </p>
              <p className="font-medium text-ink">
                English and French spoken. Medical advisor to the French Consulate General in Johannesburg.
              </p>
            </div>
            <Button asChild variant="navyOutline" size="lg" className="mt-7 h-10 px-6 text-[0.8125rem]">
              <Link to="/about">Meet Dr Ben Azouz</Link>
            </Button>
          </Reveal>
        </div>
      </section>

      <section className="bg-ink py-14 text-white lg:py-20">
        <div className="mx-auto max-w-6xl px-5 lg:px-7">
          <blockquote className="max-w-3xl font-display text-3xl italic leading-[1.15] text-white sm:text-4xl lg:text-5xl">
            “The good physician treats the disease; the great physician treats the patient.”
          </blockquote>
          <p className="mt-6 text-[0.8125rem] text-white/65">William Osler</p>
        </div>
      </section>

      <section className="bg-white py-14 lg:py-20">
        <div className="mx-auto max-w-6xl px-5 lg:px-7">
          <h2 className="max-w-lg text-4xl leading-none text-ink sm:text-5xl">A clear path through your care</h2>
          <ol className="mt-10 grid border-t border-hairline sm:grid-cols-2 lg:grid-cols-3">
            {JOURNEY.map((step, index) => (
              <li
                key={step.title}
                className="border-b border-hairline py-6 sm:pr-6 lg:min-h-36 lg:border-r lg:px-6 lg:[&:nth-child(3n+1)]:pl-0 lg:[&:nth-child(3n)]:border-r-0"
              >
                <span className="text-sm font-medium text-blue">0{index + 1}</span>
                <h3 className="mt-4 text-2xl text-ink">{step.title}</h3>
                <p className="mt-2 text-[0.8125rem] leading-relaxed text-grey">{step.copy}</p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      <section className="border-t border-hairline bg-white py-14 lg:py-20">
        <div className="mx-auto grid max-w-6xl gap-8 px-5 lg:grid-cols-[0.8fr_1.2fr] lg:gap-16 lg:px-7">
          <h2 className="text-4xl leading-none text-ink sm:text-5xl">Care built for continuity</h2>
          <dl className="border-b border-hairline">
            {[
              [
                "Experienced general practice",
                "Senior clinical judgement behind every assessment and referral decision.",
              ],
              ["One doctor over time", "A clinician who knows your history, family and numbers across years."],
              ["English and French", "Care for Johannesburg's francophone community in their own language."],
              ["Sandton Central", `${PRACTICE.addressLine1}, with secure parking and easy access.`],
            ].map(([title, copy]) => (
              <div key={title} className="grid gap-2 border-t border-hairline py-4 sm:grid-cols-[0.8fr_1.2fr]">
                <dt className="font-medium text-ink">{title}</dt>
                <dd className="text-[0.8125rem] leading-relaxed text-grey">{copy}</dd>
              </div>
            ))}
          </dl>
        </div>
      </section>

      <CtaBand />
    </>
  );
}
