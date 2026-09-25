import { Link, createFileRoute, notFound } from "@tanstack/react-router";
import { Check } from "lucide-react";
import { CtaBand } from "@/components/site/CtaBand";
import { Reveal } from "@/components/site/Reveal";
import { Button } from "@/components/ui/button";
import { SERVICES } from "@/lib/site";

export const Route = createFileRoute("/services/$slug")({
  loader: ({ params }) => { const service = SERVICES.find((s) => s.slug === params.slug); if (!service) throw notFound(); return { service }; },
  head: ({ loaderData }) => {
    if (!loaderData) return { meta: [{ title: "Service not found" }, { name: "robots", content: "noindex" }] };
    const { service } = loaderData; const title = `${service.title} | Dr Ben Azouz, Sandton`;
    return { meta: [{ title }, { name: "description", content: service.short }, { property: "og:title", content: title }, { property: "og:description", content: service.short }, { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary_large_image" }] };
  },
  notFoundComponent: () => <div className="mx-auto max-w-xl px-5 py-24"><h1 className="text-5xl text-ink">Service not found</h1><p className="mt-3 text-grey">That service page doesn't exist.</p><Button asChild className="mt-6"><Link to="/services">All services</Link></Button></div>,
  component: ServiceDetail,
});

function ServiceDetail() {
  const { service } = Route.useLoaderData();
  return <>
    <section className="border-b border-hairline bg-white">
      <div className="mx-auto max-w-6xl px-5 py-11 lg:px-7 lg:py-16">
        <Link to="/services" className="text-[0.8125rem] font-medium text-blue">← All services</Link>
        <div className="mt-7 grid gap-6 lg:grid-cols-[1fr_0.8fr] lg:items-end">
          <h1 className="max-w-3xl text-[clamp(2.5rem,4vw+0.5rem,3.75rem)] leading-[0.97] text-ink">{service.title}</h1>
          <div><p className="text-[0.9rem] leading-relaxed text-grey">{service.short}</p>{service.comingSoon ? <p className="mt-3 text-[0.8125rem] font-medium text-blue">Coming soon</p> : null}</div>
        </div>
      </div>
    </section>

    <section className="bg-white py-11 lg:py-16">
      <div className="mx-auto grid max-w-6xl gap-11 px-5 lg:grid-cols-[1.05fr_0.95fr] lg:gap-16 lg:px-7">
        <Reveal direction="left">
          <div className="space-y-4 text-[0.9rem] leading-relaxed text-grey">{service.intro.map((p) => <p key={p.slice(0,24)}>{p}</p>)}</div>
          <div className="mt-10"><h2 className="text-3xl text-ink sm:text-4xl">Included in this care</h2><ul className="mt-5 border-b border-hairline">{service.covers.map((item) => <li key={item} className="flex gap-3 border-t border-hairline py-3 text-[0.8125rem] leading-relaxed text-ink"><Check className="mt-0.5 h-4 w-4 shrink-0 text-blue" /><span>{item}</span></li>)}</ul></div>
        </Reveal>
        <Reveal direction="right" delay={100}>
          {service.seek.length ? <div><h2 className="text-3xl text-ink sm:text-4xl">Consider booking if…</h2><ul className="mt-5 border-b border-hairline">{service.seek.map((item) => <li key={item} className="border-t border-hairline py-3 text-[0.8125rem] leading-relaxed text-grey">{item}</li>)}</ul></div> : null}
          <div className="mt-9 bg-blue p-6 text-white"><h2 className="text-3xl text-white">{service.comingSoon ? "Join the waitlist" : "Book for this service"}</h2><p className="mt-3 text-[0.8125rem] leading-relaxed text-white/75">{service.comingSoon ? "Register your interest and we'll be in touch as soon as the IV & Recovery Lounge opens." : "Requests are reviewed by the practice and confirmed by email - usually within one working day."}</p><Button asChild variant="outline" size="lg" className="mt-5 h-10 w-full border-white bg-white px-6 text-[0.8125rem] text-blue transition-all hover:-translate-y-0.5"><Link to="/book" search={{ service: service.title }}>{service.comingSoon ? "Join the waitlist" : `Book ${service.title}`}</Link></Button></div>
        </Reveal>
      </div>
    </section>
    <CtaBand service={service.comingSoon ? undefined : service.title} />
  </>;
}