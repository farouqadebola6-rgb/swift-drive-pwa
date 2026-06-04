import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2 } from "lucide-react";

export const Route = createFileRoute("/reset-password")({
  head: () => ({ meta: [{ title: "Reset password — Hamduk Drive" }] }),
  component: ResetPassword,
});

function ResetPassword() {
  const navigate = useNavigate();
  const [ready, setReady] = useState(false);
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    // Supabase places the recovery tokens in the URL hash. The auth client
    // picks them up automatically and emits a PASSWORD_RECOVERY event.
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === "PASSWORD_RECOVERY" || event === "SIGNED_IN") setReady(true);
    });
    // If user lands here already signed in via the recovery link
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) setReady(true);
    });
    return () => subscription.unsubscribe();
  }, []);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password.length < 8) return toast.error("Password must be at least 8 characters");
    if (password !== confirm) return toast.error("Passwords do not match");
    setLoading(true);
    try {
      const { error } = await supabase.auth.updateUser({ password });
      if (error) throw error;
      toast.success("Password updated. Please sign in.");
      await supabase.auth.signOut();
      navigate({ to: "/auth", search: { mode: "signin", role: "rider" } });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not update password");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className="flex min-h-screen flex-col px-6 py-8"
      style={{ paddingTop: "calc(env(safe-area-inset-top) + 2rem)" }}
    >
      <div className="mx-auto w-full max-w-sm flex-1">
        <h1 className="text-2xl font-bold tracking-tight">Set a new password</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Choose a strong password you haven't used before.
        </p>

        {!ready ? (
          <div className="mt-8 rounded-2xl border border-border bg-card p-5 text-sm text-muted-foreground">
            Waiting for your recovery link to be verified…
          </div>
        ) : (
          <form onSubmit={submit} className="mt-6 space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="pw" className="text-xs font-medium text-muted-foreground">New password</Label>
              <Input id="pw" type="password" required minLength={8} value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="h-12 rounded-2xl bg-muted/50 px-4 text-base" />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="pw2" className="text-xs font-medium text-muted-foreground">Confirm password</Label>
              <Input id="pw2" type="password" required minLength={8} value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                className="h-12 rounded-2xl bg-muted/50 px-4 text-base" />
            </div>
            <Button type="submit" className="h-12 w-full rounded-full text-base" disabled={loading}>
              {loading && <Loader2 className="mr-2 size-4 animate-spin" />}
              Update password
            </Button>
          </form>
        )}
      </div>
    </div>
  );
}
