import type { ReactNode } from "react";

export function PageHero({
  title,
  lead,
  children,
}: {
  title: string;
  lead?: string;
  children?: ReactNode;
}) {
  return (
    <section className="border-b border-hairline bg-white">
      <div className="mx-auto max-w-6xl px-5 py-11 lg:px-7 lg:py-16">
        <h1 className="max-w-3xl text-[clamp(2.5rem,4vw+0.5rem,3.75rem)] leading-[0.97] text-ink">{title}</h1>
        {lead ? (
          <p className="mt-5 max-w-xl text-[0.9rem] leading-relaxed text-grey lg:text-base">{lead}</p>
        ) : null}
        {children ? <div className="mt-6">{children}</div> : null}
      </div>
    </section>
  );
}

