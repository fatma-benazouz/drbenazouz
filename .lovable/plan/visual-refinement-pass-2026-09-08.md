# Visual refinement pass

## Goal
Give the existing public site a quieter, editorial private-practice feel while preserving all content, routes, booking behavior, staff tools, and backend logic.

## Changes
- Replace the serif-led typography with Inter Tight headings and Inter body text, and update the global palette to ink navy, white, warm off-white, muted brass, and occasional teal-navy.
- Remove tracked all-caps eyebrow/rule treatments from public headings and use left-aligned hierarchy, natural-case labels, and more varied spacing instead.
- Refine the header and footer with simpler branding, sentence-case navigation, restrained brass usage, and an animated mobile menu that opens and closes smoothly.
- Rework the home hero so all headline lines share one color; distinguish the final line through size/placement rather than color. Replace bullet-separated pillars with a deliberate divider-based row.
- Break up the repeated service-card grid: feature Metabolic Medicine & Weight Management at larger scale, present remaining services as flatter editorial rows, and use unframed line icons for secondary items.
- Adjust About, service detail, contact, privacy, and shared call-to-action sections to use asymmetric, left-aligned layouts, flatter borders, restrained corners/shadows, and alternating white/warm section backgrounds.
- Keep booking and staff screens functionally untouched; global typography/color tokens may update their appearance without changing their structure or behavior.

## Validation
- Check the public pages at desktop and mobile sizes for hierarchy, menu animation, text fit, and visual consistency.
- Confirm navigation and booking links still work and that no public page has rendering or console errors.

## Technical details
- Changes are limited to shared public presentation components, public route markup/classes, and global design tokens/font links.
- No database, authentication, server-function, schema, route-path, or booking/admin logic changes.
