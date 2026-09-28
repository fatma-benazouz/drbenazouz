import { useMutation, useQuery } from "@tanstack/react-query";
import { Link, createFileRoute, useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { Loader2, Lock } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { adminExists, claimAdmin } from "@/lib/admin-bootstrap.functions";

export const Route = createFileRoute("/auth")({
  head: () => ({
    meta: [
      { title: "Practice Sign In | Dr Ben Azouz MH" },
      { name: "description", content: "Secure sign-in for practice staff." },
      { name: "robots", content: "noindex, nofollow" },
      { property: "og:title", content: "Practice Sign In" },
      { property: "og:description", content: "Secure sign-in for practice staff." },
    ],
  }),
  component: AuthPage,
});

function AuthPage() {
  const navigate = useNavigate();
  const checkAdmin = useServerFn(adminExists);
  const runClaim = useServerFn(claimAdmin);
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const status = useQuery({ queryKey: ["admin-exists"], queryFn: () => checkAdmin() });

  useEffect(() => {
    if (status.data && !status.data.hasAdmin) setMode("signup");
  }, [status.data]);

  const auth = useMutation({
    mutationFn: async () => {
      if (mode === "signup") {
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: { emailRedirectTo: `${window.location.origin}/admin` },
        });
        if (error) throw error;
        const signIn = await supabase.auth.signInWithPassword({ email, password });
        if (signIn.error) throw signIn.error;
        await runClaim();
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      toast.success("Signed in");
      navigate({ to: "/admin", replace: true });
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const setupMode = status.data && !status.data.hasAdmin;

  return (
    <div className="flex min-h-screen items-center justify-center bg-navy-deep px-5 py-16">
      <div className="w-full max-w-md">
        <Link to="/" className="eyebrow block text-center text-gold/70 hover:text-gold">
          ← Back to website
        </Link>

        <div className="mt-6 rounded-lg border border-gold/25 bg-card p-7 shadow-[var(--shadow-lift)] sm:p-9">
          <span className="grid h-12 w-12 place-items-center rounded-full bg-navy">
            <Lock className="h-5 w-5 text-gold" strokeWidth={1.5} aria-hidden="true" />
          </span>
          <h1 className="mt-5 text-2xl text-navy-deep">
            {setupMode ? "Create the practice admin" : "Practice sign in"}
          </h1>
          <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
            {setupMode
              ? "No admin account exists yet. The first account you create here becomes the practice administrator - after that this setup screen closes automatically."
              : "Staff access only. This area is not linked from the public website."}
          </p>

          <form
            className="mt-6 space-y-4"
            onSubmit={(e) => {
              e.preventDefault();
              auth.mutate();
            }}
          >
            <div>
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                autoComplete="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="mt-2 h-11"
              />
            </div>
            <div>
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                autoComplete={setupMode ? "new-password" : "current-password"}
                required
                minLength={8}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="mt-2 h-11"
              />
              {setupMode ? (
                <p className="mt-1 text-xs text-muted-foreground">
                  Use a fresh password of at least 8 characters that you have not used elsewhere.
                </p>
              ) : null}
            </div>

            <Button type="submit" variant="navy" size="lg" className="w-full" disabled={auth.isPending}>
              {auth.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
              {setupMode ? "Create admin account" : "Sign in"}
            </Button>
          </form>
        </div>
      </div>
    </div>
  );
}
