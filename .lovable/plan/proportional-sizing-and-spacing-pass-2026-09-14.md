# Proportional sizing and spacing pass

## Scope
Reduce the visual scale without changing structure, order, copy, colors, imagery, behavior, or typography families.

## Stage 1: desktop approval preview
- Reduce the shared content width from the current extra-wide container to approximately 72rem.
- Shorten the header, reduce logo/brand sizing, tighten navigation spacing, and proportionally reduce the header appointment button.
- Scale the homepage hero headline with a responsive `clamp()` at roughly 15-20% below its current desktop size and a compact line-height.
- Reduce the hero paragraph by about 10%, tighten its width and spacing, and reduce both hero buttons proportionally.
- Reduce hero outer spacing by roughly 25-30% and scale the portrait height with the smaller text block.
- Verify the desktop result at 1280px and show the updated hero for approval.

## Stage 2: site-wide continuation after approval
- Apply the same proportional reduction to the trust strip, remaining homepage sections, shared page headings, CTA areas, and equivalent spacing across public marketing pages.
- Preserve booking, authentication, admin, data, routing, and all functionality.
- Verify desktop, tablet, and mobile for clipping, overlap, and readable wrapping.

## Technical details
- Changes remain limited to presentation classes and shared button sizing.
- Responsive behavior will continue to use existing breakpoints, with stable image proportions and no structural markup changes.
