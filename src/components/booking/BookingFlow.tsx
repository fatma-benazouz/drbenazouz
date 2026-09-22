import { useMutation, useQuery } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { CalendarCheck, CheckCircle2, ChevronLeft, ChevronRight, Loader2 } from "lucide-react";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { z } from "zod";

import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import {
  addDays,
  formatLongDate,
  formatShortDate,
  formatTimeLabel,
  slotsForDate,
  todaySast,
  type AvailabilityException,
  type AvailabilityRule,
  type TakenSlot,
} from "@/lib/schedule";
import { bookableServices } from "@/lib/site";
import { cn } from "@/lib/utils";

const DAYS_AHEAD = 42;

const bookingSchema = z.object({
  patient_name: z.string().trim().min(2, "Please enter your full name").max(120),
  email: z.string().trim().email("Please enter a valid email address").max(255),
  phone: z.string().trim().min(7, "Please enter a contact number").max(30),
  reason_for_visit: z.string().trim().max(600).optional(),
  service_type: z.string().min(1),
  requested_date: z.string().min(1),
  requested_time: z.string().min(1),
  new_patient: z.boolean(),
  preferred_language: z.string(),
});

async function fetchSchedule(from: string, to: string) {
  const [rules, exceptions, taken] = await Promise.all([
    supabase.from("availability_rules").select("*").eq("active", true),
    supabase.from("availability_exceptions").select("*").gte("date", from).lte("date", to),
    supabase
      .from("bookings")
      .select("requested_date,requested_time,status")
      .gte("requested_date", from)
      .lte("requested_date", to),
  ]);
  if (rules.error) throw rules.error;
  if (exceptions.error) throw exceptions.error;
  if (taken.error) throw taken.error;
  return {
    rules: (rules.data ?? []) as AvailabilityRule[],
    exceptions: (exceptions.data ?? []) as AvailabilityException[],
    taken: (taken.data ?? []) as TakenSlot[],
  };
}

export function BookingFlow({ initialService }: { initialService?: string | undefined }) {
  const today = useMemo(() => todaySast(), []);
  const to = useMemo(() => addDays(today, DAYS_AHEAD), [today]);

  const [service, setService] = useState(initialService ?? bookableServices[0]!.title);
  const [date, setDate] = useState<string | null>(null);
  const [time, setTime] = useState<string | null>(null);
  const [weekOffset, setWeekOffset] = useState(0);
  const [form, setForm] = useState({
    patient_name: "",
    email: "",
    phone: "",
    reason_for_visit: "",
    new_patient: true,
    preferred_language: "English",
    consent: false,
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [done, setDone] = useState<{ date: string; time: string } | null>(null);

  const schedule = useQuery({
    queryKey: ["schedule", today, to],
    queryFn: () => fetchSchedule(today, to),
    staleTime: 30_000,
  });

  const days = useMemo(() => {
    const list: { iso: string; open: boolean; freeCount: number }[] = [];
    if (!schedule.data) return list;
    for (let i = 0; i <= DAYS_AHEAD; i++) {
      const iso = addDays(today, i);
      const slots = slotsForDate(iso, schedule.data.rules, schedule.data.exceptions, schedule.data.taken);
      list.push({
        iso,
        open: slots.length > 0,
        freeCount: slots.filter((s) => s.available).length,
      });
    }
    return list;
  }, [schedule.data, today]);

  const PAGE = 14;
  const visibleDays = days.slice(weekOffset * PAGE, weekOffset * PAGE + PAGE);
  const maxOffset = Math.max(0, Math.ceil(days.length / PAGE) - 1);

  const slots = useMemo(() => {
    if (!date || !schedule.data) return [];
    return slotsForDate(date, schedule.data.rules, schedule.data.exceptions, schedule.data.taken);
  }, [date, schedule.data]);

  const submit = useMutation({
    mutationFn: async () => {
      const payload = {
        patient_name: form.patient_name,
        email: form.email,
        phone: form.phone,
        reason_for_visit: form.reason_for_visit,
        service_type: service,
        requested_date: date!,
        requested_time: time!,
        new_patient: form.new_patient,
        preferred_language: form.preferred_language,
      };
      const parsed = bookingSchema.safeParse(payload);
      if (!parsed.success) {
        const fieldErrors: Record<string, string> = {};
        for (const issue of parsed.error.issues) {
          const key = String(issue.path[0]);
          if (!fieldErrors[key]) fieldErrors[key] = issue.message;
        }
        setErrors(fieldErrors);
        throw new Error("Please check the highlighted fields.");
      }
      setErrors({});
      const { error } = await supabase.from("bookings").insert({
        ...parsed.data,
        reason_for_visit: parsed.data.reason_for_visit ?? null,
        consent_popia: true,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      setDone({ date: date!, time: time! });
      window.scrollTo({ top: 0, behavior: "smooth" });
    },
    onError: (err: Error) => toast.error(err.message || "Something went wrong. Please try again."),
  });

  if (done) {
    return (
      <div className="mx-auto max-w-2xl rounded-lg border border-gold/30 bg-card p-8 text-center shadow-[var(--shadow-soft)] sm:p-12">
        <CheckCircle2 className="mx-auto h-12 w-12 text-gold" strokeWidth={1.3} aria-hidden="true" />
        <h2 className="mt-6 text-3xl text-navy-deep">Request received</h2>
        <p className="mt-3 text-base leading-relaxed text-muted-foreground">
          Thank you, {form.patient_name.split(" ")[0]}. We have your request for{" "}
          <span className="font-semibold text-navy-deep">{service}</span> on{" "}
          <span className="font-semibold text-navy-deep">
            {formatLongDate(done.date)} at {formatTimeLabel(done.time)} (SAST)
          </span>
          .
        </p>
        <div className="mt-6 rounded-md border border-border bg-secondary/70 p-5 text-left text-sm leading-relaxed text-muted-foreground">
          <p className="font-semibold text-navy-deep">What happens next</p>
          <p className="mt-2">
            This is a <strong>request, not a confirmed appointment</strong>. The practice reviews
            every request personally - usually within one working day. We'll email {form.email} to
            confirm your time, or to offer an alternative if that slot is no longer suitable.
          </p>
        </div>
        <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
          <Button asChild variant="navy">
            <Link to="/">Back to home</Link>
          </Button>
          <Button asChild variant="navyOutline">
            <Link to="/services">Explore services</Link>
          </Button>
        </div>
      </div>
    );
  }

  const canSubmit = Boolean(date && time && form.consent) && !submit.isPending;

  return (
    <div className="grid gap-8 lg:grid-cols-[minmax(0,1.05fr)_minmax(0,0.95fr)]">
      {/* Step 1: slot picking */}
      <div className="rounded-lg border border-border bg-card p-5 shadow-[var(--shadow-soft)] sm:p-7">
        <p className="eyebrow text-gold">Step 1</p>
        <h2 className="mt-2 text-2xl text-navy-deep">Choose a time</h2>

        <div className="mt-6">
          <Label htmlFor="service">Service</Label>
          <select
            id="service"
            value={service}
            onChange={(e) => setService(e.target.value)}
            className="mt-2 h-11 w-full rounded-md border border-input bg-background px-3 text-sm text-navy-deep focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gold"
          >
            {bookableServices.map((s) => (
              <option key={s.slug} value={s.title}>
                {s.title}
              </option>
            ))}
            <option value="General consultation">General consultation</option>
          </select>
        </div>

        <div className="mt-7">
          <div className="flex items-center justify-between gap-3">
            <Label>Date (SAST)</Label>
            <div className="flex gap-1">
              <button
                type="button"
                onClick={() => setWeekOffset((v) => Math.max(0, v - 1))}
                disabled={weekOffset === 0}
                aria-label="Earlier dates"
                className="grid h-8 w-8 place-items-center rounded border border-input text-navy disabled:opacity-30"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
              <button
                type="button"
                onClick={() => setWeekOffset((v) => Math.min(maxOffset, v + 1))}
                disabled={weekOffset >= maxOffset}
                aria-label="Later dates"
                className="grid h-8 w-8 place-items-center rounded border border-input text-navy disabled:opacity-30"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          </div>

          {schedule.isLoading ? (
            <div className="mt-3 grid grid-cols-3 gap-2 sm:grid-cols-4">
              {Array.from({ length: 8 }).map((_, i) => (
                <div key={i} className="h-16 animate-pulse rounded-md bg-muted" />
              ))}
            </div>
          ) : (
            <div className="mt-3 grid grid-cols-3 gap-2 sm:grid-cols-4 lg:grid-cols-5">
              {visibleDays.map((d) => {
                const label = formatShortDate(d.iso);
                const disabled = !d.open || d.freeCount === 0;
                const selected = date === d.iso;
                return (
                  <button
                    key={d.iso}
                    type="button"
                    disabled={disabled}
                    onClick={() => {
                      setDate(d.iso);
                      setTime(null);
                    }}
                    aria-pressed={selected}
                    className={cn(
                      "flex flex-col items-center rounded-md border px-1 py-2.5 text-center transition-colors",
                      selected
                        ? "border-navy bg-navy text-cream"
                        : disabled
                          ? "cursor-not-allowed border-border bg-muted text-muted-foreground/50 line-through"
                          : "border-input bg-background text-navy-deep hover:border-gold hover:bg-gold/10",
                    )}
                  >
                    <span className="text-[0.65rem] uppercase tracking-wider opacity-80">
                      {label.weekday}
                    </span>
                    <span className="text-lg leading-tight font-semibold">{label.day}</span>
                    <span className="text-[0.65rem] uppercase tracking-wider opacity-80">
                      {label.month}
                    </span>
                  </button>
                );
              })}
            </div>
          )}
          <p className="mt-3 text-xs text-muted-foreground">
            Greyed-out dates are closed or fully booked. All times are South African Standard Time.
          </p>
        </div>

        <div className="mt-7">
          <Label>Time</Label>
          {!date ? (
            <p className="mt-3 rounded-md border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
              Select a date to see available times.
            </p>
          ) : slots.length === 0 ? (
            <p className="mt-3 rounded-md border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
              The practice is closed on this date.
            </p>
          ) : (
            <div className="mt-3 grid grid-cols-3 gap-2 sm:grid-cols-4">
              {slots.map((slot) => {
                const selected = time === slot.time;
                return (
                  <button
                    key={slot.time}
                    type="button"
                    disabled={!slot.available}
                    onClick={() => setTime(slot.time)}
                    aria-pressed={selected}
                    aria-label={`${formatTimeLabel(slot.time)}${slot.available ? "" : " - unavailable"}`}
                    className={cn(
                      "rounded-md border px-2 py-2.5 text-sm font-medium transition-colors",
                      selected
                        ? "border-navy bg-navy text-cream"
                        : slot.available
                          ? "border-input bg-background text-navy-deep hover:border-gold hover:bg-gold/10"
                          : "cursor-not-allowed border-border bg-muted text-muted-foreground/45 line-through",
                    )}
                  >
                    {formatTimeLabel(slot.time)}
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Step 2: details */}
      <form
        className="rounded-lg border border-border bg-card p-5 shadow-[var(--shadow-soft)] sm:p-7"
        onSubmit={(e) => {
          e.preventDefault();
          if (!date || !time) {
            toast.error("Please choose a date and time first.");
            return;
          }
          submit.mutate();
        }}
      >
        <p className="eyebrow text-gold">Step 2</p>
        <h2 className="mt-2 text-2xl text-navy-deep">Your details</h2>

        {date && time ? (
          <p className="mt-4 flex items-center gap-2 rounded-md border border-gold/40 bg-gold/10 px-4 py-3 text-sm text-navy-deep">
            <CalendarCheck className="h-4 w-4 shrink-0 text-gold" aria-hidden="true" />
            <span>
              {formatLongDate(date)} at {formatTimeLabel(time)}
            </span>
          </p>
        ) : null}

        <div className="mt-5 space-y-4">
          <div>
            <Label htmlFor="patient_name">Full name</Label>
            <Input
              id="patient_name"
              value={form.patient_name}
              autoComplete="name"
              onChange={(e) => setForm({ ...form, patient_name: e.target.value })}
              className="mt-2 h-11"
              required
            />
            {errors["patient_name"] ? (
              <p className="mt-1 text-xs text-destructive">{errors["patient_name"]}</p>
            ) : null}
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                autoComplete="email"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                className="mt-2 h-11"
                required
              />
              {errors["email"] ? (
                <p className="mt-1 text-xs text-destructive">{errors["email"]}</p>
              ) : null}
            </div>
            <div>
              <Label htmlFor="phone">Phone / WhatsApp</Label>
              <Input
                id="phone"
                type="tel"
                autoComplete="tel"
                value={form.phone}
                onChange={(e) => setForm({ ...form, phone: e.target.value })}
                className="mt-2 h-11"
                required
              />
              {errors["phone"] ? (
                <p className="mt-1 text-xs text-destructive">{errors["phone"]}</p>
              ) : null}
            </div>
          </div>

          <div>
            <Label htmlFor="reason">Reason for visit (optional)</Label>
            <Textarea
              id="reason"
              rows={3}
              maxLength={600}
              value={form.reason_for_visit}
              onChange={(e) => setForm({ ...form, reason_for_visit: e.target.value })}
              className="mt-2"
              placeholder="A short note helps us allocate enough consultation time."
            />
          </div>

          <fieldset>
            <legend className="text-sm font-medium text-navy-deep">Are you a new patient?</legend>
            <div className="mt-2 grid grid-cols-2 gap-2">
              {[
                { label: "New patient", value: true },
                { label: "Existing patient", value: false },
              ].map((opt) => (
                <button
                  key={opt.label}
                  type="button"
                  onClick={() => setForm({ ...form, new_patient: opt.value })}
                  aria-pressed={form.new_patient === opt.value}
                  className={cn(
                    "rounded-md border px-3 py-2.5 text-sm font-medium transition-colors",
                    form.new_patient === opt.value
                      ? "border-navy bg-navy text-cream"
                      : "border-input bg-background text-navy-deep hover:border-gold",
                  )}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </fieldset>

          <fieldset>
            <legend className="text-sm font-medium text-navy-deep">Preferred language</legend>
            <div className="mt-2 grid grid-cols-2 gap-2">
              {["English", "French"].map((lang) => (
                <button
                  key={lang}
                  type="button"
                  onClick={() => setForm({ ...form, preferred_language: lang })}
                  aria-pressed={form.preferred_language === lang}
                  className={cn(
                    "rounded-md border px-3 py-2.5 text-sm font-medium transition-colors",
                    form.preferred_language === lang
                      ? "border-navy bg-navy text-cream"
                      : "border-input bg-background text-navy-deep hover:border-gold",
                  )}
                >
                  {lang}
                </button>
              ))}
            </div>
          </fieldset>

          <div className="flex items-start gap-3 rounded-md border border-border bg-secondary/60 p-4">
            <Checkbox
              id="consent"
              checked={form.consent}
              onCheckedChange={(v) => setForm({ ...form, consent: v === true })}
              className="mt-0.5"
            />
            <Label htmlFor="consent" className="text-xs leading-relaxed font-normal text-muted-foreground">
              I consent to the practice processing my personal information to manage this
              appointment request, in line with POPIA. See the{" "}
              <Link to="/privacy" className="font-semibold text-navy underline underline-offset-2">
                privacy policy
              </Link>
              .
            </Label>
          </div>
        </div>

        <Button type="submit" variant="gold" size="lg" className="mt-6 w-full" disabled={!canSubmit}>
          {submit.isPending ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" /> Sending request…
            </>
          ) : (
            "Request this appointment"
          )}
        </Button>
        <p className="mt-3 text-center text-xs text-muted-foreground">
          Requests are confirmed manually by the practice - you'll receive an email once reviewed.
        </p>
      </form>
    </div>
  );
}
