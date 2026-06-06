import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Mail, MessageCircle, Phone, Loader2, AlertTriangle } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { reportIncident } from "@/lib/safety.functions";
import { toast } from "sonner";

export const Route = createFileRoute("/support")({
  head: () => ({
    meta: [
      { title: "Support — Hamduk Drive" },
      { name: "description", content: "Get help with rides, payments, driver onboarding, and account questions." },
    ],
  }),
  component: SupportPage,
});

const CATEGORIES = [
  "Safety concern",
  "Driver behaviour",
  "Rider behaviour",
  "Payment issue",
  "Lost item",
  "Account problem",
  "Other",
];

function SupportPage() {
  const { user } = useAuth();
  const reportFn = useServerFn(reportIncident);
  const [category, setCategory] = useState("");
  const [description, setDescription] = useState("");
  const [rideIdStr, setRideIdStr] = useState("");
  const [contactPhone, setContactPhone] = useState("");

  const submit = useMutation({
    mutationFn: async () => {
      if (!category) throw new Error("Pick a category");
      if (description.trim().length < 10) throw new Error("Please describe the incident (10+ chars).");
      const rideId = rideIdStr ? Number(rideIdStr) : undefined;
      if (rideId !== undefined && !Number.isInteger(rideId)) throw new Error("Invalid ride ID");
      return reportFn({
        data: {
          category,
          description: description.trim(),
          rideId,
          contactPhone: contactPhone || undefined,
        },
      });
    },
    onSuccess: () => {
      toast.success("Report received. Our team will reach out within 24 hours.");
      setCategory(""); setDescription(""); setRideIdStr(""); setContactPhone("");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <div className="min-h-screen bg-muted/30 pb-24">
      <header className="sticky top-0 z-30 border-b border-border bg-background/95 backdrop-blur" style={{ paddingTop: "env(safe-area-inset-top)" }}>
        <div className="mx-auto flex h-14 max-w-3xl items-center px-4">
          <Link to={user ? "/account" : "/"} className="text-sm text-muted-foreground hover:text-foreground">← Back</Link>
          <h1 className="ml-3 text-base font-semibold">Support</h1>
        </div>
      </header>
      <main className="mx-auto max-w-3xl px-4 py-6">
        <p className="text-sm text-muted-foreground">We typically reply within 12 hours.</p>
        <div className="mt-5 grid gap-3">
          <ContactCard icon={<Mail className="size-5" />} title="Email" href="mailto:support@hamdukdrive.com" value="support@hamdukdrive.com" />
          <ContactCard icon={<MessageCircle className="size-5" />} title="WhatsApp" href="https://wa.me/2348000000000" value="+234 800 000 0000" />
          <ContactCard icon={<Phone className="size-5" />} title="Safety hotline (24/7)" href="tel:+2348000000001" value="+234 800 000 0001" />
        </div>

        <Card className="mt-6 rounded-2xl p-5">
          <div className="flex items-center gap-2">
            <AlertTriangle className="size-5 text-destructive" />
            <h2 className="font-semibold">Report an incident</h2>
          </div>
          <p className="mt-1 text-xs text-muted-foreground">
            For emergencies, dial 112 first. Use this form for follow-ups, complaints, and safety reports.
          </p>
          <div className="mt-4 space-y-3">
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">Category</Label>
              <Select value={category} onValueChange={setCategory}>
                <SelectTrigger className="h-12 rounded-2xl bg-muted/50"><SelectValue placeholder="Choose a category" /></SelectTrigger>
                <SelectContent>
                  {CATEGORIES.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">Ride ID (optional)</Label>
              <Input inputMode="numeric" value={rideIdStr} onChange={(e) => setRideIdStr(e.target.value.replace(/\D/g, ""))} className="h-12 rounded-2xl bg-muted/50" placeholder="e.g. 1234" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">Your phone (so we can call back)</Label>
              <Input value={contactPhone} onChange={(e) => setContactPhone(e.target.value)} className="h-12 rounded-2xl bg-muted/50" placeholder="+234..." />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">What happened?</Label>
              <Textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={5} maxLength={2000} className="rounded-2xl bg-muted/50" placeholder="Describe what happened, when, and who was involved." />
            </div>
            <Button onClick={() => submit.mutate()} disabled={submit.isPending} className="h-12 w-full rounded-full">
              {submit.isPending && <Loader2 className="mr-2 size-4 animate-spin" />}
              Submit report
            </Button>
          </div>
        </Card>
      </main>
    </div>
  );
}

function ContactCard({ icon, title, href, value }: { icon: React.ReactNode; title: string; href: string; value: string }) {
  return (
    <Card className="rounded-2xl p-4">
      <a href={href} className="flex items-center gap-3">
        <div className="grid size-10 place-items-center rounded-xl bg-primary/10 text-primary">{icon}</div>
        <div className="min-w-0">
          <p className="text-xs text-muted-foreground">{title}</p>
          <p className="truncate text-sm font-medium">{value}</p>
        </div>
      </a>
    </Card>
  );
}
