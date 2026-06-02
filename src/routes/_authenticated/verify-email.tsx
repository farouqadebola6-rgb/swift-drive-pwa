import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/use-auth";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Loader2, MailCheck } from "lucide-react";

export const Route = createFileRoute("/_authenticated/verify-email")({
  head: () => ({ meta: [{ title: "Verify your email — Hamduk Drive" }] }),
  component: VerifyEmail,
});

function VerifyEmail() {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const [resending, setResending] = useState(false);

  // If user becomes confirmed (e.g. they clicked the link in another tab), bounce to /app
  useEffect(() => {
    if (user?.email_confirmed_at) navigate({ to: "/app" });
  }, [user, navigate]);

  const resend = async () => {
    if (!user?.email) return;
    setResending(true);
    const { error } = await supabase.auth.resend({
      type: "signup",
      email: user.email,
      options: { emailRedirectTo: `${window.location.origin}/app` },
    });
    setResending(false);
    if (error) toast.error(error.message);
    else toast.success("Verification email sent. Check your inbox.");
  };

  return (
    <div className="grid min-h-screen place-items-center bg-muted/40 px-4">
      <Card className="w-full max-w-md p-8 text-center">
        <div className="mx-auto grid size-14 place-items-center rounded-full bg-primary/10 text-primary">
          <MailCheck className="size-7" />
        </div>
        <h1 className="mt-5 text-xl font-bold">Verify your email</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          We sent a confirmation link to <strong>{user?.email}</strong>. Click the link in the email to activate your account.
        </p>
        <div className="mt-6 flex flex-col gap-2">
          <Button onClick={() => void resend()} disabled={resending}>
            {resending && <Loader2 className="mr-2 size-4 animate-spin" />}
            Resend email
          </Button>
          <Button
            variant="ghost"
            onClick={() => void signOut().then(() => navigate({ to: "/" }))}
          >
            Sign out
          </Button>
        </div>
        <p className="mt-6 text-xs text-muted-foreground">
          Wrong address? Sign out and create your account with the correct email.
        </p>
      </Card>
    </div>
  );
}
