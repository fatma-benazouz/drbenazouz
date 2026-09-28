import { Link } from "@tanstack/react-router";

import { Reveal } from "@/components/site/Reveal";
import { Button } from "@/components/ui/button";
import { PRACTICE } from "@/lib/site";

export function CtaBand({
  quote = "Ready to put your health first?",
  service,
}: {
  quote?: string;
  service?: string | undefined;
}) {
  return (
    <section className="bg-blue text-white">
      <Reveal className="mx-auto grid max-w-6xl gap-7 px-5 py-10 lg:grid-cols-[1fr_auto] lg:items-center lg:px-7 lg:py-14">
        <div>
          <p className="max-w-2xl font-display text-3xl leading-tight text-white sm:text-4xl">{quote}</p>
          <p className="mt-3 text-[0.8125rem] text-white/75">Evidence-based care in {PRACTICE.area}, Johannesburg</p>
        </div>
        <div className="flex flex-col items-start gap-3 sm:flex-row lg:justify-end">
          <Button
            asChild
            variant="outline"
            size="lg"
            className="h-10 border-white bg-white px-6 text-[0.8125rem] text-blue transition-all hover:-translate-y-0.5 hover:border-ink"
          >
            <Link to="/book" search={service ? { service } : {}}>
              Book Your Consultation
            </Link>
          </Button>
          <Button
            asChild
            variant="outline"
            size="lg"
            className="h-10 border-white bg-transparent px-6 text-[0.8125rem] text-white transition-all hover:-translate-y-0.5 hover:bg-white hover:text-blue"
          >
            <a href={PRACTICE.phoneHref}>Call {PRACTICE.phone}</a>
          </Button>
        </div>
      </Reveal>
    </section>
  );
}