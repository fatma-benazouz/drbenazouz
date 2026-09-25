import { createFileRoute } from "@tanstack/react-router";

import aboutImage from "@/assets/hichem-about.jpg";
import portrait from "@/assets/dr-azouz-portrait.jpg";
import clinic from "@/assets/clinic-interior.jpg";
import { CtaBand } from "@/components/site/CtaBand";
import { PageHero } from "@/components/site/PageHero";
import { Reveal } from "@/components/site/Reveal";

export const Route = createFileRoute("/about")({
  head: () => ({
    meta: [
      { title: "About Dr Ben Azouz | French-Speaking GP in Sandton" },
      {
        name: "description",
        content:
          "Dr Ben Azouz, MBChB, is a Sandton general practitioner offering holistic, patient-centred primary care. English- and French-speaking, medical advisor to the French Consulate General in Johannesburg.",
      },
      { property: "og:title", content: "About Dr Ben Azouz, MBChB" },
      {
        property: "og:description",
        content: "Holistic, continuity-focused general practice in Sandton Central. English and French spoken.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: About,
});

function About() {
  return (
    <>
      <PageHero
        title="Dr Ben Azouz, MBChB"
        lead="A general practitioner who treats the whole person - and stays with you over time."
      />

      <section className="bg-background py-11 lg:py-16">
        <div className="mx-auto grid max-w-6xl gap-9 px-5 lg:grid-cols-[minmax(0,0.85fr)_minmax(0,1.15fr)] lg:gap-12 lg:px-7">
          <Reveal direction="left">
            <img
              src={aboutImage}
              alt="Portrait of Dr Ben Azouz in his consulting rooms"
              width={1200}
              height={1408}
              loading="lazy"
              className="w-full object-cover"
            />
            <dl className="mt-6 border-b border-hairline text-[0.8125rem]">
              <div>
                <dt className="border-t border-hairline pt-4 text-[0.8125rem] font-semibold text-grey">
                  Qualification
                </dt>
                <dd className="pb-4 pt-1 text-ink">MBChB - General Practitioner</dd>
              </div>
              <div>
                <dt className="border-t border-hairline pt-4 text-[0.8125rem] font-semibold text-grey">
                  Special interests
                </dt>
                <dd className="pb-4 pt-1 text-ink">Metabolic Medicine, Executive Health, Lifestyle Medicine</dd>
              </div>
              <div>
                <dt className="border-t border-hairline pt-4 text-[0.8125rem] font-semibold text-grey">Languages</dt>
                <dd className="pb-4 pt-1 text-ink">
                  English &amp; French - Medical advisor to the French Consulate General
                </dd>
              </div>
            </dl>
          </Reveal>

          <Reveal direction="right" delay={100}>
            <div className="space-y-4 text-[0.9rem] leading-relaxed text-grey">
              <p className="text-base text-ink">
                Dr Ben Azouz is a general practitioner dedicated to comprehensive, compassionate primary health care. He
                takes a holistic approach - addressing not only symptoms, but the full picture of a patient's
                well-being: physical, emotional and social.
              </p>
              <p>
                He became a GP because he believes in the power of continuity. Unlike specialists who focus on a single
                system, a family doctor has the privilege of seeing the whole person, year after year. That long view is
                what makes it possible to catch change early, interpret a result in context, and give advice that
                actually fits someone's life.
              </p>
              <p>
                Alongside classic general practice, Dr Ben Azouz has developed a focused interest in metabolic medicine
                and executive health - recognising that the conditions most likely to shorten his patients' healthy
                years are largely preventable, and that weight, insulin resistance and cardiovascular risk deserve the
                same clinical rigour as any other chronic disease.
              </p>
              <p>
                As a French-speaking doctor and medical advisor to the French Consulate General, he serves
                Johannesburg's French-speaking population - because being able to describe how you feel in your own
                language changes the quality of care.
              </p>
              <p>
                Outside of medicine, Dr Ben Azouz has a long-standing passion for storytelling. He writes, works on
                scripts and makes films, capturing human experience through creative expression. It is the same instinct
                that makes him listen carefully in the consulting room.
              </p>
            </div>

            <div className="mt-9 border-t border-hairline pt-7">
              <h2 className="text-3xl leading-none text-ink">Bio-psycho-social care</h2>
              <p className="mt-4 max-w-xl text-[0.8125rem] leading-relaxed text-grey">
                Health is never purely biological. Sleep, work pressure, relationships, finances and environment all
                shape outcomes - so they belong in the consultation. Every plan made here starts from that whole-person
                view, is written down in plain language, and is reviewed on a schedule rather than left to chance.
              </p>
            </div>
          </Reveal>
        </div>
      </section>

      <section className="border-y border-border">
        <img
          src={clinic}
          alt="The waiting area at the Sandton Central rooms, with navy panelling and natural light"
          width={1600}
          height={1008}
          loading="lazy"
          className="h-56 w-full object-cover sm:h-72 lg:h-[22rem]"
        />
      </section>

      <CtaBand quote="Understanding people, their stories, and how their health fits into their lives." />
    </>
  );
}