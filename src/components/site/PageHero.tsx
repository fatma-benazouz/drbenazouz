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
        <h1 className="fade-up max-w-3xl text-[clamp(2.5rem,4vw+0.5rem,3.75rem)] leading-[0.97] text-ink">
          {title}
        </h1>
        {lead ? (
          <p
            className="fade-up mt-5 max-w-xl text-[0.9rem] leading-relaxed text-grey lg:text-base"
            style={{ animationDelay: "80ms" }}
          >
            {lead}
          </p>
        ) : null}
        {children ? (
          <div className="fade-up mt-6" style={{ animationDelay: "140ms" }}>
            {children}
          </div>
        ) : null}
      </div>
    </section>
  );
}