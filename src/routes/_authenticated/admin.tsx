import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { CalendarDays, FileText, Inbox, LogOut, Plus, Settings2, Trash2, Users } from "lucide-react";
import { useMemo, useState } from "react";
import { toast } from "sonner";

import { InvoicesTab } from "@/components/admin/InvoicesTab";
import { PatientsTab } from "@/components/admin/PatientsTab";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import {
  DAY_NAMES,
  addDays,
  formatLongDate,
  formatTimeLabel,
  slotsForDate,
  todaySast,
  type AvailabilityException,
  type AvailabilityRule,
} from "@/lib/schedule";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/admin")({
  head: () => ({
    meta: [
      { title: "Practice Dashboard | Corporate Metabolic Clinic" },
      { name: "description", content: "Manage bookings and availability." },
      { name: "robots", content: "noindex, nofollow" },
      { property: "og:title", content: "Practice Dashboard" },
      { property: "og:description", content: "Manage bookings and availability." },
    ],
  }),
  component: AdminPage,
});

type Booking = {
  id: string;
  patient_name: string;
  email: string;
  phone: string;
  service_type: string;
  requested_date: string;
  requested_time: string;
  status: BookingStatus;
  reason_for_visit: string | null;
  new_patient: boolean;
  preferred_language: string;
  admin_note: string | null;
  created_at: string;
};

type BookingStatus =
  | "pending"
  | "confirmed"
  | "declined"
  | "rescheduled"
  | "completed"
  | "cancelled";

const STATUSES = ["pending", "confirmed", "rescheduled", "declined", "completed", "cancelled"] as const;

const STATUS_STYLES: Record<string, string> = {
  pending: "bg-gold/20 text-navy-deep border-gold/40",
  confirmed: "bg-sage/25 text-navy-deep border-sage/50",
  rescheduled: "bg-navy/10 text-navy-deep border-navy/25",
  declined: "bg-destructive/10 text-destructive border-destructive/30",
  completed: "bg-navy text-cream border-navy",
  cancelled: "bg-muted text-muted-foreground border-border",
};

function AdminPage() {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [tab, setTab] = useState<
    "inbox" | "calendar" | "availability" | "patients" | "contacts" | "invoices"
  >(
    "inbox",
  );

  const role = useQuery({
    queryKey: ["is-admin"],
    queryFn: async () => {
      const { data, error } = await supabase.from("user_roles").select("role").eq("role", "admin");
      if (error) throw error;
      return (data ?? []).length > 0;
    },
  });

  const bookings = useQuery({
    queryKey: ["admin-bookings"],
    enabled: role.data === true,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("bookings")
        .select("*")
        .order("requested_date", { ascending: true })
        .order("requested_time", { ascending: true });
      if (error) throw error;
      return (data ?? []) as Booking[];
    },
  });

  const rules = useQuery({
    queryKey: ["admin-rules"],
    enabled: role.data === true,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("availability_rules")
        .select("*")
        .order("day_of_week")
        .order("start_time");
      if (error) throw error;
      return (data ?? []) as AvailabilityRule[];
    },
  });

  const exceptions = useQuery({
    queryKey: ["admin-exceptions"],
    enabled: role.data === true,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("availability_exceptions")
        .select("*")
        .order("date");
      if (error) throw error;
      return (data ?? []) as AvailabilityException[];
    },
  });

  const signOut = async () => {
    await qc.cancelQueries();
    qc.clear();
    await supabase.auth.signOut();
    navigate({ to: "/auth", replace: true });
  };

  if (role.isLoading) {
    return <div className="grid min-h-screen place-items-center bg-secondary/50 text-sm">Loading…</div>;
  }

  if (!role.data) {
    return (
      <div className="grid min-h-screen place-items-center bg-secondary/50 px-5">
        <div className="max-w-md rounded-lg border border-border bg-card p-8 text-center">
          <h1 className="text-2xl text-navy-deep">No practice access</h1>
          <p className="mt-3 text-sm text-muted-foreground">
            This account is signed in but has not been granted practice-admin access.
          </p>
          <Button variant="navy" className="mt-6" onClick={signOut}>
            Sign out
          </Button>
        </div>
      </div>
    );
  }

  const TABS = [
    { id: "inbox", label: "Bookings", icon: Inbox },
    { id: "calendar", label: "Calendar", icon: CalendarDays },
    { id: "availability", label: "Availability", icon: Settings2 },
    { id: "patients", label: "Patients", icon: Users },
    { id: "contacts", label: "Booking contacts", icon: Users },
    { id: "invoices", label: "Invoices", icon: FileText },
  ] as const;

  return (
    <div className="min-h-screen bg-secondary/40">
      <header className="border-b border-gold/25 bg-navy-deep">
        <div className="mx-auto grid max-w-7xl grid-cols-[minmax(0,1fr)_auto] items-center gap-4 px-5 py-4 lg:px-8">
          <div className="min-w-0">
            <p className="eyebrow text-gold">Practice dashboard</p>
            <h1 className="truncate font-display text-xl text-cream">Corporate Metabolic Clinic</h1>
          </div>
          <Button variant="goldOutline" size="sm" onClick={signOut}>
            <LogOut className="h-4 w-4" /> Sign out
          </Button>
        </div>
        <nav className="mx-auto flex max-w-7xl gap-1 overflow-x-auto px-3 lg:px-6" aria-label="Sections">
          {TABS.map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              type="button"
              onClick={() => setTab(id)}
              className={cn(
                "flex shrink-0 items-center gap-2 border-b-2 px-4 py-3 text-sm font-medium transition-colors",
                tab === id
                  ? "border-gold text-gold"
                  : "border-transparent text-cream/60 hover:text-cream",
              )}
            >
              <Icon className="h-4 w-4" /> {label}
            </button>
          ))}
        </nav>
      </header>

      <main className="mx-auto max-w-7xl px-5 py-8 lg:px-8">
        {tab === "inbox" ? (
          <Inbox_ bookings={bookings.data ?? []} loading={bookings.isLoading} />
        ) : null}
        {tab === "calendar" ? (
          <CalendarView
            bookings={bookings.data ?? []}
            rules={rules.data ?? []}
            exceptions={exceptions.data ?? []}
          />
        ) : null}
        {tab === "availability" ? (
          <Availability rules={rules.data ?? []} exceptions={exceptions.data ?? []} />
        ) : null}
        {tab === "patients" ? <PatientsTab /> : null}
        {tab === "contacts" ? <Patients bookings={bookings.data ?? []} /> : null}
        {tab === "invoices" ? <InvoicesTab /> : null}
      </main>
    </div>
  );
}

function StatusPill({ status }: { status: string }) {
  return (
    <span
      className={cn(
        "inline-block rounded-full border px-2.5 py-0.5 text-[0.65rem] font-semibold uppercase tracking-wider",
        STATUS_STYLES[status] ?? "border-border bg-muted",
      )}
    >
      {status}
    </span>
  );
}

function Inbox_({ bookings, loading }: { bookings: Booking[]; loading: boolean }) {
  const qc = useQueryClient();
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [from, setFrom] = useState("");
  const [reschedule, setReschedule] = useState<Record<string, { date: string; time: string }>>({});

  const update = useMutation({
    mutationFn: async ({
      id,
      patch,
    }: {
      id: string;
      patch: {
        status?: BookingStatus;
        requested_date?: string;
        requested_time?: string;
        admin_note?: string;
      };
    }) => {
      const { error } = await supabase.from("bookings").update(patch).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Booking updated. The patient can be notified by email.");
      qc.invalidateQueries({ queryKey: ["admin-bookings"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const filtered = bookings.filter(
    (b) => (statusFilter === "all" || b.status === statusFilter) && (!from || b.requested_date >= from),
  );

  return (
    <section>
      <div className="flex flex-wrap items-end gap-4">
        <div>
          <Label htmlFor="statusFilter">Status</Label>
          <select
            id="statusFilter"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="mt-2 h-10 rounded-md border border-input bg-background px-3 text-sm"
          >
            <option value="all">All</option>
            {STATUSES.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
        </div>
        <div>
          <Label htmlFor="fromDate">From date</Label>
          <Input
            id="fromDate"
            type="date"
            value={from}
            onChange={(e) => setFrom(e.target.value)}
            className="mt-2 h-10 w-44"
          />
        </div>
        <p className="ml-auto text-sm text-muted-foreground">{filtered.length} request(s)</p>
      </div>

      <div className="mt-6 space-y-4">
        {loading ? <p className="text-sm text-muted-foreground">Loading bookings…</p> : null}
        {!loading && filtered.length === 0 ? (
          <p className="rounded-lg border border-dashed border-border p-10 text-center text-sm text-muted-foreground">
            No booking requests match these filters.
          </p>
        ) : null}

        {filtered.map((b) => {
          const r = reschedule[b.id] ?? { date: b.requested_date, time: b.requested_time.slice(0, 5) };
          return (
            <article key={b.id} className="rounded-lg border border-border bg-card p-5 shadow-sm">
              <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_auto]">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-3">
                    <h2 className="text-lg text-navy-deep">{b.patient_name}</h2>
                    <StatusPill status={b.status} />
                    {b.new_patient ? (
                      <span className="rounded-full bg-secondary px-2.5 py-0.5 text-[0.65rem] font-semibold uppercase tracking-wider text-muted-foreground">
                        New patient
                      </span>
                    ) : null}
                  </div>
                  <p className="mt-1 text-sm font-medium text-navy">
                    {formatLongDate(b.requested_date)} · {formatTimeLabel(b.requested_time)} SAST
                  </p>
                  <dl className="mt-3 grid gap-x-6 gap-y-1 text-sm text-muted-foreground sm:grid-cols-2">
                    <div className="flex gap-2">
                      <dt className="font-medium text-navy-deep">Service:</dt>
                      <dd>{b.service_type}</dd>
                    </div>
                    <div className="flex gap-2">
                      <dt className="font-medium text-navy-deep">Language:</dt>
                      <dd>{b.preferred_language}</dd>
                    </div>
                    <div className="flex min-w-0 gap-2">
                      <dt className="font-medium text-navy-deep">Email:</dt>
                      <dd className="truncate">
                        <a href={`mailto:${b.email}`} className="hover:text-navy">
                          {b.email}
                        </a>
                      </dd>
                    </div>
                    <div className="flex gap-2">
                      <dt className="font-medium text-navy-deep">Phone:</dt>
                      <dd>
                        <a href={`tel:${b.phone}`} className="hover:text-navy">
                          {b.phone}
                        </a>
                      </dd>
                    </div>
                  </dl>
                  {b.reason_for_visit ? (
                    <p className="mt-3 rounded-md bg-secondary/70 p-3 text-sm text-muted-foreground">
                      {b.reason_for_visit}
                    </p>
                  ) : null}
                </div>

                <div className="flex w-full flex-col gap-2 lg:w-56">
                  <Button
                    size="sm"
                    variant="navy"
                    disabled={update.isPending}
                    onClick={() => update.mutate({ id: b.id, patch: { status: "confirmed" } })}
                  >
                    Confirm
                  </Button>
                  <Button
                    size="sm"
                    variant="navyOutline"
                    disabled={update.isPending}
                    onClick={() => update.mutate({ id: b.id, patch: { status: "completed" } })}
                  >
                    Mark completed
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={update.isPending}
                    onClick={() => update.mutate({ id: b.id, patch: { status: "declined" } })}
                  >
                    Decline
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    disabled={update.isPending}
                    onClick={() => update.mutate({ id: b.id, patch: { status: "cancelled" } })}
                  >
                    Cancel
                  </Button>
                </div>
              </div>

              <div className="mt-4 grid gap-2 border-t border-border pt-4 sm:grid-cols-[auto_auto_auto] sm:items-end">
                <div>
                  <Label htmlFor={`d-${b.id}`} className="text-xs">
                    Propose new date
                  </Label>
                  <Input
                    id={`d-${b.id}`}
                    type="date"
                    value={r.date}
                    onChange={(e) =>
                      setReschedule({ ...reschedule, [b.id]: { ...r, date: e.target.value } })
                    }
                    className="mt-1 h-9 w-44"
                  />
                </div>
                <div>
                  <Label htmlFor={`t-${b.id}`} className="text-xs">
                    New time
                  </Label>
                  <Input
                    id={`t-${b.id}`}
                    type="time"
                    value={r.time}
                    onChange={(e) =>
                      setReschedule({ ...reschedule, [b.id]: { ...r, time: e.target.value } })
                    }
                    className="mt-1 h-9 w-32"
                  />
                </div>
                <Button
                  size="sm"
                  variant="secondary"
                  disabled={update.isPending}
                  onClick={() =>
                    update.mutate({
                      id: b.id,
                      patch: {
                        status: "rescheduled",
                        requested_date: r.date,
                        requested_time: r.time,
                        admin_note: "Time proposed by the practice",
                      },
                    })
                  }
                >
                  Propose new time
                </Button>
              </div>
            </article>
          );
        })}
      </div>
    </section>
  );
}

function CalendarView({
  bookings,
  rules,
  exceptions,
}: {
  bookings: Booking[];
  rules: AvailabilityRule[];
  exceptions: AvailabilityException[];
}) {
  const today = todaySast();
  const taken = bookings.map((b) => ({
    requested_date: b.requested_date,
    requested_time: b.requested_time,
    status: b.status,
  }));

  const days = useMemo(
    () => Array.from({ length: 14 }, (_, i) => addDays(today, i)),
    [today],
  );

  return (
    <section>
      <h2 className="text-2xl text-navy-deep">Next two weeks</h2>
      <p className="mt-1 text-sm text-muted-foreground">
        Confirmed and pending bookings against the doctor's availability. Booked slots are the ones
        patients can no longer select.
      </p>
      <div className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {days.map((iso) => {
          const slots = slotsForDate(iso, rules, exceptions, taken);
          const dayBookings = bookings.filter(
            (b) => b.requested_date === iso && !["declined", "cancelled"].includes(b.status),
          );
          return (
            <div key={iso} className="rounded-lg border border-border bg-card p-4">
              <h3 className="text-base text-navy-deep">{formatLongDate(iso)}</h3>
              {slots.length === 0 ? (
                <p className="mt-2 text-xs text-muted-foreground">Closed</p>
              ) : (
                <>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {slots.filter((s) => s.available).length} of {slots.length} slots open
                  </p>
                  <ul className="mt-3 space-y-1.5">
                    {dayBookings.length === 0 ? (
                      <li className="text-xs text-muted-foreground">No bookings</li>
                    ) : (
                      dayBookings.map((b) => (
                        <li
                          key={b.id}
                          className="flex items-center justify-between gap-2 rounded border border-border bg-secondary/60 px-2.5 py-1.5 text-xs"
                        >
                          <span className="min-w-0 truncate">
                            <span className="font-semibold text-navy-deep">
                              {formatTimeLabel(b.requested_time)}
                            </span>{" "}
                            {b.patient_name}
                          </span>
                          <StatusPill status={b.status} />
                        </li>
                      ))
                    )}
                  </ul>
                </>
              )}
            </div>
          );
        })}
      </div>
    </section>
  );
}

function Availability({
  rules,
  exceptions,
}: {
  rules: AvailabilityRule[];
  exceptions: AvailabilityException[];
}) {
  const qc = useQueryClient();
  const [newRule, setNewRule] = useState({ day: 1, start: "08:00", end: "13:00", slot: 30 });
  const [newBlock, setNewBlock] = useState({ date: "", start: "", end: "", reason: "" });

  const invalidate = () => {
    qc.invalidateQueries({ queryKey: ["admin-rules"] });
    qc.invalidateQueries({ queryKey: ["admin-exceptions"] });
  };

  const addRule = useMutation({
    mutationFn: async () => {
      if (newRule.end <= newRule.start) throw new Error("End time must be after start time.");
      const { error } = await supabase.from("availability_rules").insert({
        day_of_week: newRule.day,
        start_time: newRule.start,
        end_time: newRule.end,
        slot_duration_minutes: newRule.slot,
        active: true,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Availability added");
      invalidate();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const removeRule = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("availability_rules").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: invalidate,
    onError: (e: Error) => toast.error(e.message),
  });

  const toggleRule = useMutation({
    mutationFn: async ({ id, active }: { id: string; active: boolean }) => {
      const { error } = await supabase.from("availability_rules").update({ active }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: invalidate,
    onError: (e: Error) => toast.error(e.message),
  });

  const addBlock = useMutation({
    mutationFn: async () => {
      if (!newBlock.date) throw new Error("Choose a date to block.");
      const { error } = await supabase.from("availability_exceptions").insert({
        date: newBlock.date,
        start_time: newBlock.start || null,
        end_time: newBlock.end || null,
        reason: newBlock.reason || null,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Date blocked");
      setNewBlock({ date: "", start: "", end: "", reason: "" });
      invalidate();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const removeBlock = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("availability_exceptions").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: invalidate,
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <section className="grid gap-8 lg:grid-cols-2">
      <div>
        <h2 className="text-2xl text-navy-deep">Weekly availability</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Recurring consulting hours. Add two blocks per day to leave a lunch break.
        </p>

        <div className="mt-5 space-y-4">
          {DAY_NAMES.map((name, dow) => {
            const dayRules = rules.filter((r) => r.day_of_week === dow);
            return (
              <div key={name} className="rounded-lg border border-border bg-card p-4">
                <h3 className="text-sm font-semibold text-navy-deep">{name}</h3>
                {dayRules.length === 0 ? (
                  <p className="mt-2 text-xs text-muted-foreground">Closed</p>
                ) : (
                  <ul className="mt-2 space-y-2">
                    {dayRules.map((r) => (
                      <li key={r.id} className="flex flex-wrap items-center gap-3 text-sm">
                        <span className="font-medium text-navy-deep">
                          {formatTimeLabel(r.start_time)} - {formatTimeLabel(r.end_time)}
                        </span>
                        <span className="text-xs text-muted-foreground">
                          {r.slot_duration_minutes} min slots
                        </span>
                        <label className="ml-auto flex items-center gap-2 text-xs text-muted-foreground">
                          <input
                            type="checkbox"
                            checked={r.active}
                            onChange={(e) =>
                              toggleRule.mutate({ id: r.id, active: e.target.checked })
                            }
                          />
                          Active
                        </label>
                        <button
                          type="button"
                          aria-label="Remove this block"
                          onClick={() => removeRule.mutate(r.id)}
                          className="text-destructive"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            );
          })}
        </div>

        <div className="mt-6 rounded-lg border border-gold/30 bg-card p-5">
          <h3 className="text-base text-navy-deep">Add a recurring block</h3>
          <div className="mt-3 grid gap-3 sm:grid-cols-2">
            <div>
              <Label htmlFor="rday">Day</Label>
              <select
                id="rday"
                value={newRule.day}
                onChange={(e) => setNewRule({ ...newRule, day: Number(e.target.value) })}
                className="mt-1 h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
              >
                {DAY_NAMES.map((n, i) => (
                  <option key={n} value={i}>
                    {n}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <Label htmlFor="rslot">Slot length (min)</Label>
              <Input
                id="rslot"
                type="number"
                min={10}
                max={120}
                step={5}
                value={newRule.slot}
                onChange={(e) => setNewRule({ ...newRule, slot: Number(e.target.value) })}
                className="mt-1 h-10"
              />
            </div>
            <div>
              <Label htmlFor="rstart">Start</Label>
              <Input
                id="rstart"
                type="time"
                value={newRule.start}
                onChange={(e) => setNewRule({ ...newRule, start: e.target.value })}
                className="mt-1 h-10"
              />
            </div>
            <div>
              <Label htmlFor="rend">End</Label>
              <Input
                id="rend"
                type="time"
                value={newRule.end}
                onChange={(e) => setNewRule({ ...newRule, end: e.target.value })}
                className="mt-1 h-10"
              />
            </div>
          </div>
          <Button
            variant="navy"
            className="mt-4 w-full"
            disabled={addRule.isPending}
            onClick={() => addRule.mutate()}
          >
            <Plus className="h-4 w-4" /> Add availability
          </Button>
        </div>
      </div>

      <div>
        <h2 className="text-2xl text-navy-deep">Blocked dates</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Leave, public holidays or personal appointments. Leave the times empty to block the whole
          day.
        </p>

        <div className="mt-5 rounded-lg border border-gold/30 bg-card p-5">
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <Label htmlFor="bdate">Date</Label>
              <Input
                id="bdate"
                type="date"
                value={newBlock.date}
                onChange={(e) => setNewBlock({ ...newBlock, date: e.target.value })}
                className="mt-1 h-10"
              />
            </div>
            <div>
              <Label htmlFor="breason">Reason</Label>
              <Input
                id="breason"
                value={newBlock.reason}
                onChange={(e) => setNewBlock({ ...newBlock, reason: e.target.value })}
                placeholder="Leave, conference…"
                className="mt-1 h-10"
              />
            </div>
            <div>
              <Label htmlFor="bstart">From (optional)</Label>
              <Input
                id="bstart"
                type="time"
                value={newBlock.start}
                onChange={(e) => setNewBlock({ ...newBlock, start: e.target.value })}
                className="mt-1 h-10"
              />
            </div>
            <div>
              <Label htmlFor="bend">To (optional)</Label>
              <Input
                id="bend"
                type="time"
                value={newBlock.end}
                onChange={(e) => setNewBlock({ ...newBlock, end: e.target.value })}
                className="mt-1 h-10"
              />
            </div>
          </div>
          <Button
            variant="navy"
            className="mt-4 w-full"
            disabled={addBlock.isPending}
            onClick={() => addBlock.mutate()}
          >
            <Plus className="h-4 w-4" /> Block this time
          </Button>
        </div>

        <ul className="mt-5 space-y-2">
          {exceptions.length === 0 ? (
            <li className="rounded-lg border border-dashed border-border p-8 text-center text-sm text-muted-foreground">
              No blocked dates.
            </li>
          ) : (
            exceptions.map((e) => (
              <li
                key={e.id}
                className="flex items-center justify-between gap-3 rounded-lg border border-border bg-card px-4 py-3 text-sm"
              >
                <div className="min-w-0">
                  <p className="font-medium text-navy-deep">{formatLongDate(e.date)}</p>
                  <p className="text-xs text-muted-foreground">
                    {e.start_time && e.end_time
                      ? `${formatTimeLabel(e.start_time)} - ${formatTimeLabel(e.end_time)}`
                      : "Full day"}
                    {e.reason ? ` · ${e.reason}` : ""}
                  </p>
                </div>
                <button
                  type="button"
                  aria-label="Remove block"
                  onClick={() => removeBlock.mutate(e.id)}
                  className="text-destructive"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </li>
            ))
          )}
        </ul>
      </div>
    </section>
  );
}

function Patients({ bookings }: { bookings: Booking[] }) {
  const patients = useMemo(() => {
    const map = new Map<
      string,
      { name: string; email: string; phone: string; language: string; visits: number; last: string }
    >();
    for (const b of bookings) {
      const key = b.email.toLowerCase();
      const existing = map.get(key);
      if (existing) {
        existing.visits += 1;
        if (b.requested_date > existing.last) existing.last = b.requested_date;
      } else {
        map.set(key, {
          name: b.patient_name,
          email: b.email,
          phone: b.phone,
          language: b.preferred_language,
          visits: 1,
          last: b.requested_date,
        });
      }
    }
    return [...map.values()].sort((a, b) => b.last.localeCompare(a.last));
  }, [bookings]);

  return (
    <section>
      <h2 className="text-2xl text-navy-deep">Patient list</h2>
      <p className="mt-1 text-sm text-muted-foreground">
        Derived from booking requests, for the practice's own reference.
      </p>
      <div className="mt-5 overflow-x-auto rounded-lg border border-border bg-card">
        <table className="w-full min-w-[40rem] text-left text-sm">
          <thead className="border-b border-border bg-secondary/60">
            <tr>
              {["Name", "Email", "Phone", "Language", "Requests", "Latest"].map((h) => (
                <th key={h} className="px-4 py-3 text-xs font-semibold uppercase tracking-wider">
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {patients.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-4 py-10 text-center text-muted-foreground">
                  No patients yet.
                </td>
              </tr>
            ) : (
              patients.map((p) => (
                <tr key={p.email} className="border-b border-border last:border-0">
                  <td className="px-4 py-3 font-medium text-navy-deep">{p.name}</td>
                  <td className="px-4 py-3">{p.email}</td>
                  <td className="px-4 py-3">{p.phone}</td>
                  <td className="px-4 py-3">{p.language}</td>
                  <td className="px-4 py-3">{p.visits}</td>
                  <td className="px-4 py-3">{p.last}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
}
