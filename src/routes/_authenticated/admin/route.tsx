import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Outlet, createFileRoute, useNavigate } from "@tanstack/react-router";
import { Lock, Menu } from "lucide-react";
import { useState } from "react";

import { AdminBrand, AdminSidebar } from "@/components/admin/AdminSidebar";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetDescription, SheetTitle } from "@/components/ui/sheet";
import { supabase } from "@/integrations/supabase/client";

/*
 * Shared layout for every /admin page: checks the signed-in user has the admin
 * role, then renders the sidebar and the current page in <Outlet />.
 * Sign-in itself is enforced by the parent _authenticated route.
 */
export const Route = createFileRoute("/_authenticated/admin")({
  head: () => ({
    meta: [
      { title: "Practice Dashboard | Dr Ben Azouz MH" },
      { name: "description", content: "Manage patients and invoices." },
      { name: "robots", content: "noindex, nofollow" },
      { property: "og:title", content: "Practice Dashboard" },
      { property: "og:description", content: "Manage patients and invoices." },
    ],
  }),
  component: AdminLayout,
});

function AdminLayout() {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const { user } = Route.useRouteContext();
  const [menuOpen, setMenuOpen] = useState(false);

  const role = useQuery({
    queryKey: ["is-admin"],
    queryFn: async () => {
      const { data, error } = await supabase.from("user_roles").select("role").eq("role", "admin");
      if (error) throw error;
      return (data ?? []).length > 0;
    },
  });

  const signOut = async () => {
    await qc.cancelQueries();
    qc.clear();
    await supabase.auth.signOut();
    navigate({ to: "/auth", replace: true });
  };

  if (role.isLoading) {
    return (
      <div className="grid min-h-screen place-items-center bg-canvas text-sm text-grey">
        Loading…
      </div>
    );
  }

  if (!role.data) {
    return (
      <div className="grid min-h-screen place-items-center bg-canvas px-5">
        <div className="w-full max-w-md border border-hairline bg-white p-8 text-center">
          <span className="mx-auto grid h-11 w-11 place-items-center bg-canvas text-grey">
            <Lock className="h-5 w-5" aria-hidden="true" />
          </span>
          <h1 className="mt-5 font-display text-2xl text-ink">No practice access</h1>
          <p className="mt-2 text-sm text-grey">
            This account is signed in but has not been granted practice-admin access.
          </p>
          <Button className="mt-6" onClick={signOut}>
            Sign out
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-canvas md:flex">
      <aside className="sticky top-0 hidden h-screen w-60 shrink-0 border-r border-hairline md:block">
        <AdminSidebar email={user.email} onSignOut={signOut} />
      </aside>

      <div className="min-w-0 flex-1">
        <header className="sticky top-0 z-30 flex h-14 items-center gap-3 border-b border-hairline bg-white px-4 md:hidden">
          <button
            type="button"
            onClick={() => setMenuOpen(true)}
            className="-ml-1 grid h-9 w-9 place-items-center text-ink hover:bg-canvas"
            aria-label="Open menu"
          >
            <Menu className="h-5 w-5" />
          </button>
          <AdminBrand />
        </header>

        <Sheet open={menuOpen} onOpenChange={setMenuOpen}>
          <SheetContent
            side="left"
            className="w-72 max-w-[85vw] border-r border-hairline p-0 sm:max-w-72"
          >
            <SheetTitle className="sr-only">Admin menu</SheetTitle>
            <SheetDescription className="sr-only">
              Navigate between admin sections.
            </SheetDescription>
            <AdminSidebar
              email={user.email}
              onNavigate={() => setMenuOpen(false)}
              onSignOut={signOut}
            />
          </SheetContent>
        </Sheet>

        <main className="mx-auto w-full max-w-6xl px-4 py-6 sm:px-6 sm:py-8 lg:px-10 lg:py-10">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
