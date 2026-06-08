import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
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
import { Loader2, Trash2, Star, CheckCircle2 } from "lucide-react";
import { deleteMyAccount } from "@/lib/account.functions";
import { getMyRatingSummary } from "@/lib/ratings.functions";
import { requestPhoneOtp, verifyPhoneOtp } from "@/lib/phone-verify.functions";

export const Route = createFileRoute("/_authenticated/profile")({
  head: () => ({ meta: [{ title: "Profile — Hamduk Drive" }] }),
  component: ProfilePage,
});

function ProfilePage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const deleteFn = useServerFn(deleteMyAccount);
  const ratingFn = useServerFn(getMyRatingSummary);
  const sendOtp = useServerFn(requestPhoneOtp);
  const verifyOtp = useServerFn(verifyPhoneOtp);

  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [savedPhone, setSavedPhone] = useState("");
  const [phoneVerifiedAt, setPhoneVerifiedAt] = useState<string | null>(null);
  const [otp, setOtp] = useState("");
  const [otpSent, setOtpSent] = useState(false);
  const [sending, setSending] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const { data: rating } = useQuery({
    queryKey: ["myRating", user?.id],
    enabled: !!user,
    queryFn: () => ratingFn({ data: undefined }),
  });

  useEffect(() => {
    if (!user) return;
    void supabase
      .from("profiles")
      .select("full_name, phone, phone_verified_at")
      .eq("id", user.id)
      .maybeSingle()
      .then(({ data }) => {
        setFullName(data?.full_name ?? "");
        const p = data?.phone ?? "";
        setPhone(p);
        setSavedPhone(p);
        setPhoneVerifiedAt((data as { phone_verified_at?: string | null } | null)?.phone_verified_at ?? null);
        setLoading(false);
      });
  }, [user]);

  const phoneChanged = phone.trim() !== savedPhone.trim();
  const phoneNeedsVerify = phone.trim().length >= 7 && (phoneChanged || !phoneVerifiedAt);

  const handleSendOtp = async () => {
    setSending(true);
    try {
      const r = await sendOtp({ data: { phone } });
      if (r.ok) {
        toast.success("Code sent via WhatsApp.");
        setOtpSent(true);
      } else {
        toast.error("Could not send code. Try again later.");
      }
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to send code");
    } finally {
      setSending(false);
    }
  };

  const handleVerifyOtp = async () => {
    setVerifying(true);
    try {
      const r = await verifyOtp({ data: { phone, code: otp } });
      setPhone(r.phone);
      setSavedPhone(r.phone);
      setPhoneVerifiedAt(new Date().toISOString());
      setOtpSent(false);
      setOtp("");
      toast.success("Phone verified.");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Verification failed");
    } finally {
      setVerifying(false);
    }
  };

  const saveName = async () => {
    if (!user) return;
    setSaving(true);
    const { error } = await supabase.from("profiles").update({ full_name: fullName }).eq("id", user.id);
    setSaving(false);
    if (error) toast.error(error.message);
    else toast.success("Profile updated");
  };

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
    <DashboardShell title="Profile" subtitle="Manage your personal details.">
      <Card className="mb-4 flex items-center gap-3 rounded-2xl p-5">
        <div className="grid size-14 place-items-center rounded-full bg-amber-100 text-amber-700">
          <Star className="size-6 fill-amber-400 text-amber-500" />
        </div>
        <div>
          <p className="text-2xl font-bold">
            {rating && rating.count > 0 ? rating.avg.toFixed(2) : "New"}
          </p>
          <p className="text-xs text-muted-foreground">
            {rating && rating.count > 0
              ? `Based on ${rating.count} rating${rating.count === 1 ? "" : "s"}`
              : "No ratings yet"}
          </p>
        </div>
      </Card>

      <Card className="rounded-2xl p-5">
        {loading ? (
          <div className="grid place-items-center py-8"><Loader2 className="size-5 animate-spin text-primary" /></div>
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
            <Button onClick={saveName} disabled={saving} className="h-12 w-full rounded-full">
              {saving && <Loader2 className="mr-2 size-4 animate-spin" />}
              Save name
            </Button>

            <div className="border-t border-border pt-4">
              <Label className="text-xs text-muted-foreground">Phone (WhatsApp)</Label>
              <div className="mt-1.5 flex gap-2">
                <Input
                  value={phone}
                  onChange={(e) => { setPhone(e.target.value); setOtpSent(false); }}
                  placeholder="+234..."
                  className="h-12 rounded-2xl bg-muted/50"
                />
                {phoneVerifiedAt && !phoneChanged && (
                  <span className="inline-flex items-center gap-1 rounded-full bg-success/10 px-3 text-xs font-medium text-success">
                    <CheckCircle2 className="size-3.5" /> Verified
                  </span>
                )}
              </div>
              <p className="mt-1.5 text-[11px] text-muted-foreground">
                We normalize to start with 234 so WhatsApp can reach you. No two accounts may share the same number.
              </p>
              {phoneNeedsVerify && !otpSent && (
                <Button onClick={handleSendOtp} disabled={sending} variant="outline" className="mt-3 h-11 w-full rounded-full">
                  {sending && <Loader2 className="mr-2 size-4 animate-spin" />}
                  Send WhatsApp code
                </Button>
              )}
              {otpSent && (
                <div className="mt-3 space-y-2">
                  <Input
                    inputMode="numeric"
                    maxLength={6}
                    value={otp}
                    onChange={(e) => setOtp(e.target.value.replace(/\D/g, ""))}
                    placeholder="6-digit code"
                    className="h-12 rounded-2xl bg-muted/50 text-center text-lg tracking-[0.5em]"
                  />
                  <Button onClick={handleVerifyOtp} disabled={verifying || otp.length !== 6} className="h-11 w-full rounded-full">
                    {verifying && <Loader2 className="mr-2 size-4 animate-spin" />}
                    Verify
                  </Button>
                </div>
              )}
              {savedPhone && !phoneChanged && (
                <Button
                  variant="ghost"
                  className="mt-2 h-10 w-full rounded-full text-xs text-destructive hover:bg-destructive/10"
                  disabled={saving}
                  onClick={async () => {
                    if (!user) return;
                    if (!confirm("Remove your phone number? You won't get WhatsApp ride updates until you add one again.")) return;
                    setSaving(true);
                    const { error } = await supabase.from("profiles").update({ phone: null, phone_verified_at: null }).eq("id", user.id);
                    setSaving(false);
                    if (error) toast.error(error.message);
                    else {
                      setPhone(""); setSavedPhone(""); setPhoneVerifiedAt(null);
                      toast.success("Phone number removed.");
                    }
                  }}
                >
                  Remove phone number
                </Button>
              )}
            </div>
          </div>
        )}
      </Card>

      <Card className="mt-5 rounded-2xl border-destructive/30 p-5">
        <h3 className="text-sm font-semibold text-destructive">Delete account</h3>
        <p className="mt-1 text-xs text-muted-foreground">This cancels active rides and permanently removes your profile.</p>
        <Button variant="destructive" className="mt-3 h-11 w-full rounded-full" onClick={() => setConfirmOpen(true)} disabled={deleting}>
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
