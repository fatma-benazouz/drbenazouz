import { createFileRoute } from "@tanstack/react-router";
import { ArrowRight, Maximize2, X } from "lucide-react";
import { useEffect, useState } from "react";

import step1 from "@/assets/tutorial-step1.webp";
import step2 from "@/assets/tutorial-step2.webp";
import step3 from "@/assets/tutorial-step3.webp";
import step4 from "@/assets/tutorial-step4.webp";
import { Reveal } from "@/components/site/Reveal";
import { PRACTICE, pageSeo } from "@/lib/site";
import { cn } from "@/lib/utils";

const TRUST = [
  "Evidence-based, patient-centred care",
  "Booked straight into the practice diary",
  "Sandown, Sandton, Johannesburg",
];

const STEPS = [
  {
    image: step1,
    alt: "The myGC login screen with the Book without an account button highlighted",
    title: "Skip the login",
    copy: "You'll land on the myGC login screen. Tap \"Book without an account\" at the bottom - no registration needed.",
  },
  {
    image: step2,
    alt: "The booking screen with visit type, calendar and open time slots",
    title: "Choose your visit type and time",
    copy: "Select \"New Patient Booking\" if this is your first visit, pick a date, then choose any open time slot.",
  },
  {
    image: step3,
    alt: "The new patient details form with contact fields and booking reason",
    title: "Add your details",
    copy: "Fill in your name, contact details and the reason for your visit, then confirm the booking.",
  },
  {
    image: step4,
    alt: "The booking confirmation screen with an add to calendar button",
    title: "You're booked",
    copy: "Your appointment goes straight into the practice diary. You'll see a confirmation on screen, can add it to your calendar, and a confirmation email follows shortly after.",
  },
];

type BookSearch = { service?: string };

export const Route = createFileRoute("/book")({
  validateSearch: (search: Record<string, unknown>): BookSearch =>
    typeof search["service"] === "string" && search["service"].length < 120
      ? { service: search["service"] }
      : {},
  head: () => ({
    meta: [
      { title: "Book an Appointment | Dr Ben Azouz, Sandton" },
      {
        name: "description",
        content:
          "Book your appointment with Dr Ben Azouz in Sandton through our secure external booking portal. Live availability, booked straight into the practice diary, no account needed.",
      },
      { property: "og:title", content: "Book an Appointment | Dr Ben Azouz" },
      {
        property: "og:description",
        content:
          "Booking happens on our secure external portal. Choose your visit type and time - no account needed.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
      ...pageSeo("/book").meta,
    ],
    links: pageSeo("/book").links,
  }),
  component: BookPage,
});

function BookNowButton({ className }: { className?: string }) {
  return (
    <a
      href={PRACTICE.bookingUrl}
      target="_blank"
      rel="noopener noreferrer"
      className={cn(
        "inline-flex items-center justify-center gap-2 bg-blue px-6 py-3 text-[0.8125rem] font-medium text-white transition-all hover:-translate-y-0.5 hover:bg-ink",
        className,
      )}
    >
      Book Now
      <ArrowRight className="h-4 w-4" aria-hidden="true" />
    </a>
  );
}

function Lightbox({ image, alt, onClose }: { image: string; alt: string; onClose: () => void }) {
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [onClose]);

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={alt}
      onClick={onClose}
      className="fade-up fixed inset-0 z-50 flex cursor-zoom-out items-center justify-center bg-ink/90 p-5 sm:p-8"
    >
      <button
        type="button"
        onClick={onClose}
        aria-label="Close enlarged screenshot"
        className="absolute right-5 top-5 flex h-10 w-10 items-center justify-center border border-white/30 text-white transition-colors duration-300 hover:border-white hover:bg-white/10 motion-reduce:transition-none"
      >
        <X className="h-4 w-4" aria-hidden="true" />
      </button>
      <img
        src={image}
        alt={alt}
        onClick={(event) => event.stopPropagation()}
        className="max-h-[88vh] w-auto max-w-full border border-hairline bg-white shadow-2xl"
      />
    </div>
  );
}

function BookPage() {
  const [lightbox, setLightbox] = useState<{ image: string; alt: string } | null>(null);

  return (
    <>
      {/* Hero + primary CTA panel */}
      <section className="bg-white">
        <div className="mx-auto max-w-6xl px-5 pb-10 pt-10 lg:px-7 lg:pb-14 lg:pt-16">
          <div className="max-w-2xl fade-up">
            <p className="text-[0.8125rem] font-semibold text-blue">Book a Consultation</p>
            <h1 className="mt-3 text-[clamp(2.25rem,4vw+0.5rem,3.75rem)] leading-[1.02] text-ink">
              Booking takes two minutes, on a secure external system.
            </h1>
            <p className="mt-5 max-w-xl text-[0.9rem] leading-relaxed text-grey">
              We use GoodX, a dedicated medical booking platform, to manage all appointments. Click through below to see
              live availability and book directly into the practice diary - no calling, no waiting for a callback.
            </p>
          </div>

          <div className="mt-9 bg-ink text-white fade-up" style={{ animationDelay: "100ms" }}>
            <div className="grid gap-6 p-7 sm:p-9 lg:grid-cols-[1fr_auto] lg:items-center lg:gap-10">
              <div>
                <h2 className="font-display text-2xl leading-tight text-white sm:text-3xl">Ready to book?</h2>
                <p className="mt-3 max-w-xl text-[0.8125rem] leading-relaxed text-white/70">
                  You'll be taken to our secure booking portal in a new tab. Choose a time that suits you and you're
                  done.
                </p>
              </div>
              <div className="lg:justify-self-end">
                <BookNowButton className="w-full sm:w-auto" />
              </div>
            </div>
          </div>

          <p className="mt-5 max-w-2xl text-[0.8125rem] leading-relaxed text-grey fade-up" style={{ animationDelay: "160ms" }}>
            <span className="font-semibold text-ink">First time booking with us?</span> On the next screen, choose
            "Book without an account" - you don't need to register or remember a password. See the{" "}
            <a href="#how-it-works" className="font-semibold text-blue underline underline-offset-2">
              step-by-step guide below
            </a>
            .
          </p>
        </div>
      </section>

      {/* Trust strip */}
      <section className="border-y border-hairline bg-white">
        <ul className="mx-auto grid max-w-6xl px-5 sm:grid-cols-3 lg:px-7">
          {TRUST.map((item, index) => (
            <li
              key={item}
              className={`py-4 text-[0.8125rem] font-medium text-ink ${index ? "border-t border-hairline sm:border-l sm:border-t-0 sm:pl-6" : ""} ${index < 2 ? "sm:pr-6" : ""}`}
            >
              <Reveal delay={index * 90}>{item}</Reveal>
            </li>
          ))}
        </ul>
      </section>

      {/* How it works */}
      <section id="how-it-works" className="bg-white py-12 lg:py-16">
        <div className="mx-auto max-w-6xl px-5 lg:px-7">
          <div className="max-w-xl">
            <p className="text-[0.8125rem] font-semibold text-blue">How It Works</p>
            <h2 className="mt-3 text-4xl leading-none text-ink sm:text-5xl">
              A quick walkthrough of the booking portal
            </h2>
            <p className="mt-4 text-[0.9rem] leading-relaxed text-grey">
              Most patients don't have a myGC account yet - that's completely fine. Here's exactly what to expect after
              you click "Book Now" above.
            </p>
          </div>

          <div className="mt-10 grid gap-x-10 gap-y-12 sm:grid-cols-2">
            {STEPS.map((step, index) => (
              <figure key={step.title} className="fade-up" style={{ animationDelay: `${index * 90}ms` }}>
                <button
                  type="button"
                  onClick={() => setLightbox({ image: step.image, alt: step.alt })}
                  aria-label={`Enlarge screenshot: ${step.alt}`}
                  className="group relative block w-full cursor-zoom-in border border-hairline bg-white transition-colors duration-300 hover:border-blue motion-reduce:transition-none"
                >
                  <span className="block overflow-hidden">
                    <img
                      src={step.image}
                      alt={step.alt}
                      loading="lazy"
                      className="w-full transition-transform duration-500 ease-out group-hover:scale-[1.03] motion-reduce:transition-none motion-reduce:group-hover:scale-100"
                    />
                  </span>
                  <span className="pointer-events-none absolute bottom-3 right-3 flex items-center gap-1.5 bg-ink/85 px-2.5 py-1.5 text-[0.6875rem] font-medium text-white opacity-0 transition-opacity duration-300 group-hover:opacity-100 motion-reduce:transition-none">
                    <Maximize2 className="h-3 w-3" aria-hidden="true" />
                    Enlarge
                  </span>
                </button>
                <figcaption className="mt-5">
                  <p className="text-[0.75rem] font-semibold uppercase tracking-wider text-blue">
                    Step {index + 1}
                  </p>
                  <h3 className="mt-2 text-2xl text-ink">{step.title}</h3>
                  <p className="mt-2 max-w-md text-[0.8125rem] leading-relaxed text-grey">{step.copy}</p>
                </figcaption>
              </figure>
            ))}
          </div>

          <div className="mt-12 border border-hairline bg-white p-6 sm:p-8">
            <p className="text-[0.875rem] leading-relaxed text-grey">
              <span className="font-semibold text-blue">Note:</span> Your appointment is booked as soon as you confirm it. In the
              rare case of a clash in the diary, the practice will contact you to arrange a suitable alternative time.
            </p>
          </div>
        </div>
      </section>

      {/* Closing CTA band */}
      <section className="bg-blue text-white">
        <div className="mx-auto flex max-w-6xl flex-col items-center gap-6 px-5 py-12 text-center lg:px-7 lg:py-16">
          <p className="font-display text-3xl leading-tight text-white sm:text-4xl">
            Ready to put your health first?
          </p>
          <BookNowButton className="border border-white bg-white text-blue hover:bg-transparent hover:text-white" />
        </div>
      </section>

      {lightbox && <Lightbox image={lightbox.image} alt={lightbox.alt} onClose={() => setLightbox(null)} />}
    </>
  );
}