import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { DashboardShell } from "@/components/dashboards/dashboard-shell";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useAuth } from "@/hooks/use-auth";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Loader2, Trash2, FileText, HelpCircle, LogOut, Shield } from "lucide-react";
import { deleteMyAccount } from "@/lib/account.functions";

export const Route = createFileRoute("/_authenticated/account")({
  head: () => ({ meta: [{ title: "Account — Hamduk Drive" }] }),
  component: AccountPage,
});

function AccountPage() {
  const { user, role, signOut } = useAuth();
  const navigate = useNavigate();
  const deleteFn = useServerFn(deleteMyAccount);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const handleDelete = async () => {
    setDeleting(true);
    try {
      await deleteFn({ data: undefined });
      await supabase.auth.signOut();
      toast.success("Your account has been deleted.");
      navigate({ to: "/" });
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Could not delete account";
      toast.error(msg);
      setDeleting(false);
    }
  };

  return (
    <DashboardShell title="Account" subtitle="Manage your profile, get help, or close your account.">
      <div className="space-y-4">
        <Card className="p-5">
          <p className="text-xs uppercase tracking-wide text-muted-foreground">Signed in as</p>
          <p className="mt-1 text-sm font-medium">{user?.email}</p>
          <p className="text-xs text-muted-foreground">Role: {role ?? "—"}</p>
        </Card>

        <Card className="p-2">
          <LinkRow to="/support" icon={<HelpCircle className="size-4" />} label="Support & FAQs" />
          <LinkRow to="/privacy" icon={<Shield className="size-4" />} label="Privacy policy" />
          <LinkRow to="/terms" icon={<FileText className="size-4" />} label="Terms of service" />
        </Card>

        <Card className="p-5">
          <Button variant="outline" className="w-full" onClick={() => void signOut().then(() => navigate({ to: "/" }))}>
            <LogOut className="mr-2 size-4" /> Sign out
          </Button>
        </Card>

        <Card className="border-destructive/30 p-5">
          <h3 className="text-sm font-semibold text-destructive">Danger zone</h3>
          <p className="mt-1 text-xs text-muted-foreground">
            Deleting your account cancels active rides, removes your profile and driver documents, and cannot be undone.
            Completed ride and payment records may be retained for tax/audit purposes (see Privacy Policy).
          </p>
          <Button
            variant="destructive"
            className="mt-3"
            onClick={() => setConfirmOpen(true)}
            disabled={deleting}
          >
            <Trash2 className="mr-2 size-4" /> Delete my account
          </Button>
        </Card>
      </div>

      <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete your Hamduk Drive account?</AlertDialogTitle>
            <AlertDialogDescription>
              This will cancel active rides, remove your profile and any driver documents, and sign you out. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => {
                e.preventDefault();
                void handleDelete();
              }}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              disabled={deleting}
            >
              {deleting && <Loader2 className="mr-2 size-4 animate-spin" />}
              Yes, delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </DashboardShell>
  );
}

function LinkRow({ to, icon, label }: { to: string; icon: React.ReactNode; label: string }) {
  return (
    <Link
      to={to}
      className="flex items-center gap-3 rounded-md px-3 py-2.5 text-sm hover:bg-muted"
    >
      <span className="text-muted-foreground">{icon}</span>
      <span className="flex-1">{label}</span>
      <span className="text-muted-foreground">›</span>
    </Link>
  );
}
