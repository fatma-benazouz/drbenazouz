import { Link } from "@tanstack/react-router";
import { Menu, X } from "lucide-react";
import { useEffect, useState } from "react";

import { Button } from "@/components/ui/button";
import practiceLogo from "@/assets/practice-logo.png";
import { PRACTICE } from "@/lib/site";

import { cn } from "@/lib/utils";

const NAV = [
  { to: "/", label: "Home" },
  { to: "/about", label: "About" },
  { to: "/services", label: "Services" },
  { to: "/contact", label: "Contact" },
] as const;

export function Header() {
  const [open, setOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 12);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <header
      className={cn(
        "sticky top-0 z-50 w-full border-b bg-white transition-colors duration-300",
        scrolled ? "border-hairline" : "border-transparent",
      )}
    >
      <div className="mx-auto grid h-17 max-w-6xl grid-cols-[minmax(0,1fr)_auto] items-center gap-3 px-5 lg:px-7">
        <Link to="/" className="flex min-w-0 items-center gap-2.5" onClick={() => setOpen(false)}>
          <img
            src={practiceLogo}
            alt=""
            aria-hidden="true"
            className="h-6 w-6 shrink-0 object-contain sm:h-7 sm:w-7"
          />
          <span className="min-w-0">
            <span className="block truncate font-display text-lg font-medium leading-tight text-ink sm:text-xl">
              Dr Ben Azouz MH
            </span>
            <span className="block truncate text-[0.56rem] font-medium tracking-[0.12em] text-grey">
              General Practitioner
            </span>
          </span>
        </Link>

        <div className="flex items-center gap-1">
          <nav className="hidden items-center gap-1 lg:flex" aria-label="Main">
            {NAV.map((item) => (
              <Link
                key={item.to}
                to={item.to}
                activeOptions={{ exact: item.to === "/" }}
                className="px-2.5 py-1.5 text-[0.8125rem] font-medium text-ink transition-colors hover:text-blue focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue"
                activeProps={{ className: "text-blue" }}
              >
                {item.label}
              </Link>
            ))}
          </nav>

          <Button asChild size="sm" className="hidden h-8 px-3.5 text-[0.6875rem] sm:inline-flex">
            <Link to="/book">Book a consultation</Link>
          </Button>

          <Button
            variant="ghost"
            size="icon"
            type="button"
            onClick={() => setOpen((v) => !v)}
            aria-expanded={open}
            aria-label={open ? "Close menu" : "Open menu"}
            className="relative border-transparent text-ink hover:text-blue lg:hidden"
          >
            <Menu
              className={cn(
                "absolute h-5 w-5 transition-all duration-300",
                open ? "rotate-90 scale-75 opacity-0" : "rotate-0 scale-100 opacity-100",
              )}
            />
            <X
              className={cn(
                "absolute h-5 w-5 transition-all duration-300",
                open ? "rotate-0 scale-100 opacity-100" : "-rotate-90 scale-75 opacity-0",
              )}
            />
          </Button>
        </div>
      </div>

      <div
        className={cn(
          "grid transition-[grid-template-rows,opacity] duration-300 ease-out lg:hidden",
          open ? "grid-rows-[1fr] opacity-100" : "pointer-events-none grid-rows-[0fr] opacity-0",
        )}
      >
        <nav className="min-h-0 overflow-hidden border-t border-hairline bg-white px-5" aria-label="Mobile">
          <ul className="flex flex-col">
            {NAV.map((item) => (
              <li key={item.to}>
                <Link
                  to={item.to}
                  onClick={() => setOpen(false)}
                  className="block border-b border-hairline py-3 text-base text-ink"
                  activeProps={{ className: "text-blue" }}
                  activeOptions={{ exact: item.to === "/" }}
                >
                  {item.label}
                </Link>
              </li>
            ))}
          </ul>
          <Button asChild className="my-5 w-full">
            <Link to="/book" onClick={() => setOpen(false)}>
              Book an Appointment
            </Link>
          </Button>
        </nav>
      </div>
    </header>
  );
}
