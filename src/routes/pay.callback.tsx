import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { Loader2, CheckCircle2, XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { verifyRidePayment } from "@/lib/paystack.functions";

const search = z.object({
  reference: z.string().optional(),
  trxref: z.string().optional(),
});

export const Route = createFileRoute("/pay/callback")({
  validateSearch: search,
  head: () => ({ meta: [{ title: "Verifying payment — Hamduk Drive" }] }),
  component: PayCallback,
});

function PayCallback() {
  const { reference, trxref } = Route.useSearch();
  const navigate = useNavigate();
  const verifyFn = useServerFn(verifyRidePayment);
  const [state, setState] = useState<"loading" | "success" | "failed">("loading");

  useEffect(() => {
    const ref = reference ?? trxref;
    if (!ref) {
      setState("failed");
      return;
    }
    void verifyFn({ data: { reference: ref } })
      .then((r) => {
        setState(r.status === "captured" ? "success" : "failed");
        if (r.status === "captured") {
          setTimeout(() => navigate({ to: "/app" }), 1500);
        }
      })
      .catch(() => setState("failed"));
  }, [reference, trxref, verifyFn, navigate]);

  return (
    <div className="grid min-h-screen place-items-center bg-background px-6">
      <div className="w-full max-w-sm rounded-3xl border border-border bg-card p-8 text-center shadow-lg">
        {state === "loading" && (
          <>
            <Loader2 className="mx-auto size-10 animate-spin text-primary" />
            <h1 className="mt-4 text-lg font-semibold">Verifying your payment…</h1>
            <p className="mt-1 text-sm text-muted-foreground">Hold on a moment.</p>
          </>
        )}
        {state === "success" && (
          <>
            <CheckCircle2 className="mx-auto size-12 text-success" />
            <h1 className="mt-4 text-lg font-semibold">Payment confirmed</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Redirecting you back to your ride…
            </p>
          </>
        )}
        {state === "failed" && (
          <>
            <XCircle className="mx-auto size-12 text-destructive" />
            <h1 className="mt-4 text-lg font-semibold">We couldn't confirm that payment</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              If money was debited, it will reflect shortly via webhook.
            </p>
            <Button className="mt-5 w-full rounded-full" onClick={() => navigate({ to: "/app" })}>
              Back to app
            </Button>
          </>
        )}
      </div>
    </div>
  );
}
