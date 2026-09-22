import { Link, createFileRoute } from "@tanstack/react-router";
import { Clock, Mail, MapPin, MessageCircle, Phone } from "lucide-react";

import { CtaBand } from "@/components/site/CtaBand";
import { PageHero } from "@/components/site/PageHero";
import { Reveal } from "@/components/site/Reveal";
import { Button } from "@/components/ui/button";
import { PRACTICE, whatsappLink } from "@/lib/site";

export const Route = createFileRoute("/contact")({
  head: () => ({
    meta: [
      { title: "Contact & Directions | Dr Ben Azouz, Sandton Central" },
      {
        name: "description",
        content:
          "Visit Dr Ben Azouz at 135 Daisy Street, Sandton Central, Johannesburg. Call, WhatsApp or email the practice, or book an appointment online.",
      },
      { property: "og:title", content: "Contact the practice | Dr Ben Azouz" },
      {
        property: "og:description",
        content: "135 Daisy Street, Sandton Central, Johannesburg. Call, WhatsApp or book online.",
      },
       { property: "og:type", content: "website" },
       { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Contact,
});

const HOURS = [
  { day: "Monday - Thursday", time: "08:00 - 13:00, 14:00 - 17:00" },
  { day: "Friday", time: "08:00 - 13:00, 14:00 - 16:00" },
  { day: "Saturday - Sunday", time: "Closed" },
];

function Contact() {
  return (
    <>
      <PageHero
        title="Sandton Central"
        lead="Easy access. Premium environment. World-class care - in the heart of the business district."
      />

      <section className="bg-background py-11 lg:py-16">
        <div className="mx-auto grid max-w-6xl gap-8 px-5 lg:grid-cols-2 lg:gap-12 lg:px-7">
          <Reveal>
            <ul className="border-b border-hairline">
              <li className="flex gap-3 border-t border-hairline py-4">
                <MapPin className="mt-1 h-5 w-5 shrink-0 text-blue" aria-hidden="true" />
                <div className="min-w-0">
                  <h2 className="text-sm font-semibold text-ink">Address</h2>
                  <p className="mt-1.5 text-[0.9rem] text-muted-foreground">
                    {PRACTICE.addressLine1}
                    <br />
                    {PRACTICE.addressLine2}
                  </p>
                </div>
              </li>
              <li className="flex gap-3 border-t border-hairline py-4">
                <Phone className="mt-1 h-5 w-5 shrink-0 text-blue" aria-hidden="true" />
                <div className="min-w-0">
                  <h2 className="text-sm font-semibold text-ink">Telephone</h2>
                  <a
                    href={PRACTICE.phoneHref}
                    className="mt-1.5 block text-[0.9rem] text-grey hover:text-blue"
                  >
                    {PRACTICE.phone}
                  </a>
                </div>
              </li>
              <li className="flex gap-3 border-t border-hairline py-4">
                <MessageCircle className="mt-1 h-5 w-5 shrink-0 text-blue" aria-hidden="true" />
                <div className="min-w-0">
                  <h2 className="text-sm font-semibold text-ink">WhatsApp</h2>
                  <a
                    href={whatsappLink()}
                    target="_blank"
                    rel="noreferrer"
                    className="mt-1.5 block text-[0.9rem] text-grey hover:text-blue"
                  >
                    Message the practice
                  </a>
                </div>
              </li>
              <li className="flex gap-3 border-t border-hairline py-4">
                <Mail className="mt-1 h-5 w-5 shrink-0 text-blue" aria-hidden="true" />
                <div className="min-w-0">
                  <h2 className="text-sm font-semibold text-ink">Email</h2>
                  <a
                    href={`mailto:${PRACTICE.email}`}
                    className="mt-1.5 block break-words text-[0.9rem] text-grey hover:text-blue"
                  >
                    {PRACTICE.email}
                  </a>
                </div>
              </li>
              <li className="flex gap-3 border-t border-hairline py-4">
                <Clock className="mt-1 h-5 w-5 shrink-0 text-blue" aria-hidden="true" />
                <div className="min-w-0">
                  <h2 className="text-sm font-semibold text-ink">Consulting hours (SAST)</h2>
                  <dl className="mt-1.5 space-y-1 text-[0.9rem] text-muted-foreground">
                    {HOURS.map((h) => (
                      <div key={h.day} className="flex flex-wrap gap-x-3">
                        <dt className="font-medium text-ink">{h.day}</dt>
                        <dd>{h.time}</dd>
                      </div>
                    ))}
                  </dl>
                </div>
              </li>
            </ul>

            <div className="mt-8 border-t border-ink pt-5">
              <h2 className="text-xl text-ink">In an emergency</h2>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                For chest pain, severe breathing difficulty, heavy bleeding, loss of consciousness
                or any life-threatening emergency, go directly to your nearest emergency department
                or call 10177 (ambulance) - do not wait for an appointment.
              </p>
            </div>
          </Reveal>

          <Reveal delay={100}>
            <div className="overflow-hidden border border-border">
              <iframe
                title="Map showing the practice at 135 Daisy Street, Sandton Central"
                src="https://www.google.com/maps?q=135%20Daisy%20Street%2C%20Sandton%2C%20Johannesburg&output=embed"
                className="h-72 w-full border-0 lg:h-[24rem]"
                loading="lazy"
                referrerPolicy="no-referrer-when-downgrade"
              />
            </div>

            <div className="mt-6 bg-blue p-6">
              <h2 className="text-2xl text-white">Book an appointment</h2>
              <p className="mt-3 text-sm leading-relaxed text-white/75">
                Choose a date and time that suits you. Requests are reviewed by the practice and
                confirmed by email.
              </p>
              <Button asChild variant="outline" size="lg" className="mt-5 h-10 w-full border-white bg-white px-6 text-[0.8125rem] text-blue">
                <Link to="/book">Book online</Link>
              </Button>
            </div>
          </Reveal>
        </div>
      </section>

      <CtaBand />
    </>
  );
}
