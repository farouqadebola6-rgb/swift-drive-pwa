import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { DashboardShell } from "@/components/dashboards/dashboard-shell";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useAuth } from "@/hooks/use-auth";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Loader2, Trash2 } from "lucide-react";
import { deleteMyAccount } from "@/lib/account.functions";

export const Route = createFileRoute("/_authenticated/profile")({
  head: () => ({ meta: [{ title: "Profile — Hamduk Drive" }] }),
  component: ProfilePage,
});

function ProfilePage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const deleteFn = useServerFn(deleteMyAccount);
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
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

  useEffect(() => {
    if (!user) return;
    void supabase
      .from("profiles")
      .select("full_name, phone")
      .eq("id", user.id)
      .maybeSingle()
      .then(({ data }) => {
        setFullName(data?.full_name ?? "");
        setPhone(data?.phone ?? "");
        setLoading(false);
      });
  }, [user]);

  const save = async () => {
    if (!user) return;
    setSaving(true);
    const { error } = await supabase
      .from("profiles")
      .update({ full_name: fullName, phone })
      .eq("id", user.id);
    setSaving(false);
    if (error) toast.error(error.message);
    else toast.success("Profile updated");
  };

  return (
    <DashboardShell title="Profile" subtitle="Manage your personal details.">
      <Card className="rounded-2xl p-5">
        {loading ? (
          <div className="grid place-items-center py-8">
            <Loader2 className="size-5 animate-spin text-primary" />
          </div>
        ) : (
          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">Email</Label>
              <Input value={user?.email ?? ""} readOnly className="h-12 rounded-2xl bg-muted/50" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">Full name</Label>
              <Input value={fullName} onChange={(e) => setFullName(e.target.value)} className="h-12 rounded-2xl bg-muted/50" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">Phone</Label>
              <Input value={phone} onChange={(e) => setPhone(e.target.value)} className="h-12 rounded-2xl bg-muted/50" />
            </div>
            <Button onClick={save} disabled={saving} className="h-12 w-full rounded-full">
              {saving && <Loader2 className="mr-2 size-4 animate-spin" />}
              Save changes
            </Button>
          </div>
        )}
      </Card>

      <Card className="mt-5 rounded-2xl border-destructive/30 p-5">
        <h3 className="text-sm font-semibold text-destructive">Delete account</h3>
        <p className="mt-1 text-xs text-muted-foreground">
          This cancels active rides and permanently removes your profile.
        </p>
        <Button
          variant="destructive"
          className="mt-3 h-11 w-full rounded-full"
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
