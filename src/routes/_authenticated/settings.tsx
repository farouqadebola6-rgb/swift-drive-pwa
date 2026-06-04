import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { DashboardShell } from "@/components/dashboards/dashboard-shell";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Loader2, Trash2, FileText, Shield, ChevronRight } from "lucide-react";
import { deleteMyAccount } from "@/lib/account.functions";

export const Route = createFileRoute("/_authenticated/settings")({
  head: () => ({ meta: [{ title: "Settings — Hamduk Drive" }] }),
  component: SettingsPage,
});

function SettingsPage() {
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
      toast.error(e instanceof Error ? e.message : "Could not delete account");
      setDeleting(false);
    }
  };

  return (
    <DashboardShell title="Settings">
      <Card className="overflow-hidden rounded-2xl p-0">
        <ul className="divide-y divide-border">
          <LinkRow to="/privacy" icon={<Shield className="size-5" />} label="Privacy policy" />
          <LinkRow to="/terms" icon={<FileText className="size-5" />} label="Terms of service" />
        </ul>
      </Card>

      <Card className="mt-5 rounded-2xl border-destructive/30 p-5">
        <h3 className="text-sm font-semibold text-destructive">Danger zone</h3>
        <p className="mt-1 text-xs text-muted-foreground">
          Deleting your account cancels active rides and removes your profile. This cannot be undone.
        </p>
        <Button
          variant="destructive"
          className="mt-3 h-11 rounded-full"
          onClick={() => setConfirmOpen(true)}
          disabled={deleting}
        >
          <Trash2 className="mr-2 size-4" /> Delete my account
        </Button>
      </Card>

      <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete your Hamduk Drive account?</AlertDialogTitle>
            <AlertDialogDescription>
              This will cancel active rides, remove your profile, and sign you out. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => { e.preventDefault(); void handleDelete(); }}
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
    <li>
      <Link to={to} className="flex items-center gap-3 px-4 py-3.5 hover:bg-muted/50">
        <div className="grid size-10 place-items-center rounded-xl bg-muted text-foreground">{icon}</div>
        <span className="flex-1 text-sm font-medium">{label}</span>
        <ChevronRight className="size-4 text-muted-foreground" />
      </Link>
    </li>
  );
}
