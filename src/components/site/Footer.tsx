import { Link } from "@tanstack/react-router";
import practiceLogo from "@/assets/practice-logo.png";
import { PRACTICE } from "@/lib/site";

export function Footer() {
  return (
    <footer className="border-t border-hairline bg-white text-grey">
      <div className="mx-auto max-w-6xl px-5 py-9 lg:px-7">
        <div className="grid gap-8 md:grid-cols-[1fr_auto_auto] md:gap-12">
          <div>
            <div className="flex items-center gap-2.5">
              <img src={practiceLogo} alt="" aria-hidden="true" className="h-10 w-10 shrink-0 object-contain" />
              <div>
                <p className="font-display text-xl text-ink">Dr Ben Azouz MH</p>
                <p className="mt-0.5 text-[0.8125rem]">General Practitioner</p>
              </div>
            </div>
            <p className="mt-3 max-w-sm text-[0.8125rem] leading-relaxed">
              Personalised and preventative general practice for executives, professionals and families in Sandton.
            </p>
          </div>

          <nav aria-label="Footer">
            <p className="text-sm font-semibold text-ink">Practice</p>
            <ul className="mt-3 space-y-1.5 text-[0.8125rem]">
              <li>
                <Link to="/about" className="hover:text-blue">
                  About
                </Link>
              </li>
              <li>
                <Link to="/services" className="hover:text-blue">
                  Services
                </Link>
              </li>
              <li>
                <Link to="/book" className="hover:text-blue">
                  Book an appointment
                </Link>
              </li>
              <li>
                <Link to="/privacy" className="hover:text-blue">
                  Privacy
                </Link>
              </li>
            </ul>
          </nav>
          <div>
            <p className="text-sm font-semibold text-ink">Contact</p>
            <address className="mt-3 space-y-1.5 text-[0.8125rem] not-italic">
              <p>
                {PRACTICE.addressLine1}
                <br />
                {PRACTICE.addressLine2}
              </p>
              <p>
                <a href={PRACTICE.phoneHref} className="hover:text-blue">
                  {PRACTICE.phone}
                </a>
              </p>
              <p>
                <a href={`mailto:${PRACTICE.email}`} className="hover:text-blue">
                  {PRACTICE.email}
                </a>
              </p>
            </address>
          </div>
        </div>
        <div className="mt-9 flex justify-center border-t border-hairline pt-5 text-xs">
          <p>Dr Ben Azouz © {new Date().getFullYear()}</p>
        </div>
      </div>
    </footer>
  );
}
