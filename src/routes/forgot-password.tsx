import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ArrowLeft, Loader2 } from "lucide-react";

export const Route = createFileRoute("/forgot-password")({
  head: () => ({ meta: [{ title: "Forgot password — Hamduk Drive" }] }),
  component: ForgotPassword,
});

function ForgotPassword() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/reset-password`,
      });
      if (error) throw error;
      setSent(true);
      toast.success("Reset link sent. Check your email.");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not send reset email");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className="flex min-h-screen flex-col px-6 py-8"
      style={{ paddingTop: "calc(env(safe-area-inset-top) + 1.5rem)" }}
    >
      <button
        onClick={() => navigate({ to: "/auth", search: { mode: "signin", role: "rider" } })}
        className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="size-4" /> Back to sign in
      </button>

      <div className="mx-auto mt-10 w-full max-w-sm flex-1">
        <h1 className="text-2xl font-bold tracking-tight">Forgot password</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Enter your email and we'll send you a link to reset it.
        </p>

        {sent ? (
          <div className="mt-8 rounded-2xl border border-border bg-card p-5 text-sm">
            We've emailed a reset link to <b>{email}</b>. Open it on this device to finish
            resetting your password.
          </div>
        ) : (
          <form onSubmit={submit} className="mt-6 space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="email" className="text-xs font-medium text-muted-foreground">
                Email
              </Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                placeholder="you@example.com"
                className="h-12 rounded-2xl bg-muted/50 px-4 text-base"
              />
            </div>
            <Button type="submit" className="h-12 w-full rounded-full text-base" disabled={loading}>
              {loading && <Loader2 className="mr-2 size-4 animate-spin" />}
              Send reset link
            </Button>
          </form>
        )}

        <p className="mt-6 text-center text-sm text-muted-foreground">
          Remembered it?{" "}
          <Link to="/auth" search={{ mode: "signin", role: "rider" }} className="font-semibold text-primary hover:underline">
            Sign in
          </Link>
        </p>
      </div>
    </div>
  );
}
