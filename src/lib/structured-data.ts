import { HOURS, PRACTICE, SERVICES, absoluteUrl } from "@/lib/site";

/*
 * schema.org JSON-LD describing the practice (MedicalClinic) and the doctor
 * (Physician) for search engines. Built from src/lib/site.ts so it stays in
 * step with what the pages show.
 */

const clinicId = `${PRACTICE.siteUrl}/#clinic`;
const physicianId = `${PRACTICE.siteUrl}/#physician`;

const address = {
  "@type": "PostalAddress",
  streetAddress: `${PRACTICE.address.street}, ${PRACTICE.address.suburb}`,
  addressLocality: PRACTICE.address.locality,
  addressRegion: PRACTICE.address.region,
  postalCode: PRACTICE.address.postalCode,
  addressCountry: PRACTICE.address.country,
};

const geo = { "@type": "GeoCoordinates", ...PRACTICE.geo };

const openingHoursSpecification = HOURS.filter((h) => h.opens).map((h) => ({
  "@type": "OpeningHoursSpecification",
  dayOfWeek: h.days,
  opens: h.opens,
  closes: h.closes,
}));

const languages = [
  { "@type": "Language", name: "English", alternateName: "en" },
  { "@type": "Language", name: "French", alternateName: "fr" },
];

const bookAction = {
  "@type": "ReserveAction",
  target: { "@type": "EntryPoint", urlTemplate: PRACTICE.bookingUrl },
  name: "Book an appointment",
};

const services = SERVICES.filter((s) => !s.comingSoon);

const location = {
  address,
  geo,
  hasMap: PRACTICE.mapsUrl,
  telephone: PRACTICE.phone,
  email: PRACTICE.email,
  openingHoursSpecification,
  availableLanguage: languages,
  medicalSpecialty: "PrimaryCare",
  isAcceptingNewPatients: true,
  potentialAction: bookAction,
  areaServed: ["Sandton", "Johannesburg"],
};

export const structuredData = {
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "MedicalClinic",
      "@id": clinicId,
      name: PRACTICE.name,
      url: absoluteUrl("/"),
      image: absoluteUrl("/favicon.png"),
      ...location,
      employee: { "@id": physicianId },
      hasOfferCatalog: {
        "@type": "OfferCatalog",
        name: "Medical services",
        itemListElement: services.map((s) => ({
          "@type": "Offer",
          itemOffered: {
            "@type": "MedicalProcedure",
            name: s.title,
            description: s.short,
            url: absoluteUrl(`/services/${s.slug}`),
          },
        })),
      },
    },
    {
      "@type": "Physician",
      "@id": physicianId,
      name: PRACTICE.doctor,
      url: absoluteUrl("/about"),
      ...location,
      knowsLanguage: languages,
      knowsAbout: services.map((s) => s.title),
      parentOrganization: { "@id": clinicId },
    },
  ],
};
