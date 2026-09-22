import { Link } from "@tanstack/react-router";
import { CalendarCheck, MessageCircle } from "lucide-react";

import { whatsappLink } from "@/lib/site";

export function FloatingActions() {
  return (
    <>
      <a
        href={whatsappLink()}
        target="_blank"
        rel="noreferrer"
        aria-label="Chat with the practice on WhatsApp"
        className="fixed bottom-24 right-4 z-40 grid h-13 w-13 place-items-center border border-white bg-blue p-3.5 text-white transition-transform hover:-translate-y-0.5 md:bottom-6"
      >
        <MessageCircle className="h-6 w-6" aria-hidden="true" />
      </a>

      <div className="fixed inset-x-0 bottom-0 z-40 border-t border-hairline bg-white p-3 md:hidden">
        <Link
          to="/book"
          className="flex w-full items-center justify-center gap-2 bg-blue px-4 py-3 text-sm font-semibold text-white"
        >
          <CalendarCheck className="h-4 w-4" aria-hidden="true" />
          Book an appointment
        </Link>
      </div>
      <div className="h-16 md:hidden" aria-hidden="true" />
    </>
  );
}
