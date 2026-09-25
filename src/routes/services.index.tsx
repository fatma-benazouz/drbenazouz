import { Link, createFileRoute } from "@tanstack/react-router";
import { ArrowRight } from "lucide-react";
import { CtaBand } from "@/components/site/CtaBand";
import { PageHero } from "@/components/site/PageHero";
import { Reveal } from "@/components/site/Reveal";
import { SERVICES } from "@/lib/site";

export const Route = createFileRoute("/services/")({
  head: () => ({
    meta: [
      { title: "Medical Services | Dr Ben Azouz, Sandton" },
      {
        name: "description",
        content:
          "Executive health, metabolic medicine, chronic disease management, preventative care and general practice in Sandton.",
      },
      { property: "og:title", content: "Medical Services | Dr Ben Azouz" },
      {
        property: "og:description",
        content: "Full-spectrum general practice with executive and metabolic health expertise.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: ServicesHub,
});

function ServicesHub() {
  return (
    <>
      <PageHero
        title="Care that covers today and protects tomorrow"
        lead="Everyday primary care, long-term condition management and proactive health optimisation - all under one roof in Sandton Central."
      />
      <section className="bg-white py-11 lg:py-16">
        <div className="mx-auto max-w-6xl px-5 lg:px-7">
          <div className="border-b border-hairline">
            {SERVICES.map((service, index) => (
              <Reveal key={service.slug} delay={Math.min(index * 60, 360)}>
                <Link
                  to="/services/$slug"
                  params={{ slug: service.slug }}
                  className="group grid gap-3 border-t border-hairline py-6 md:grid-cols-[minmax(0,0.8fr)_minmax(0,1.6fr)_auto] md:gap-8"
                >
                  <div>
                    <h2 className="text-xl leading-tight text-ink group-hover:text-blue">{service.title}</h2>
                    {service.comingSoon ? <p className="mt-2 text-xs font-medium text-blue">Coming soon</p> : null}
                  </div>
                  <p className="text-[0.8125rem] leading-relaxed text-grey">{service.short}</p>
                  <span className="inline-flex items-center gap-2 text-[0.8125rem] font-semibold text-blue">
                    View service <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
                  </span>
                </Link>
              </Reveal>
            ))}
          </div>
        </div>
      </section>
      <CtaBand />
    </>
  );
}