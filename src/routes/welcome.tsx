import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { MapPin, MessageCircle, Wallet } from "lucide-react";

export const Route = createFileRoute("/welcome")({
  head: () => ({
    meta: [
      { title: "Welcome to Hamduk Drive" },
      { name: "description", content: "Cheaper, faster, fairer rides for Lagos." },
    ],
  }),
  component: Welcome,
});

const slides = [
  {
    icon: MapPin,
    title: "Lagos rides, done right",
    body: "Fixed upfront fares. No surprise surge. Hop in and ride.",
    accent: "var(--gradient-hero)",
  },
  {
    icon: MessageCircle,
    title: "WhatsApp-fast dispatch",
    body: "Your ride is pushed to nearby drivers in seconds. First to accept wins.",
    accent: "var(--gradient-primary)",
  },
  {
    icon: Wallet,
    title: "Pay your way",
    body: "Pay online with Paystack or cash on arrival — your call.",
    accent: "var(--gradient-accent)",
  },
];

function Welcome() {
  const navigate = useNavigate();
  const [i, setI] = useState(0);

  // If the user has already seen the slides, send them straight to auth.
  useEffect(() => {
    if (typeof window === "undefined") return;
    if (localStorage.getItem("hamduk_welcomed") === "1") {
      navigate({ to: "/auth", search: { mode: "signin", role: "rider" } });
    }
  }, [navigate]);

  const isLast = i === slides.length - 1;
  const next = () => {
    if (!isLast) return setI(i + 1);
    localStorage.setItem("hamduk_welcomed", "1");
    navigate({ to: "/auth", search: { mode: "signup", role: "rider" } });
  };
  const skip = () => {
    localStorage.setItem("hamduk_welcomed", "1");
    navigate({ to: "/auth", search: { mode: "signin", role: "rider" } });
  };

  const S = slides[i];
  const Icon = S.icon;

  return (
    <div
      className="flex min-h-screen flex-col px-6"
      style={{
        paddingTop: "calc(env(safe-area-inset-top) + 1rem)",
        paddingBottom: "calc(env(safe-area-inset-bottom) + 1.5rem)",
      }}
    >
      <div className="flex justify-end pt-2">
        <button onClick={skip} className="text-sm font-medium text-muted-foreground">
          Skip
        </button>
      </div>

      <div className="flex flex-1 flex-col items-center justify-center text-center" key={i}>
        <div
          className="grid size-32 animate-scale-in place-items-center rounded-[2rem] text-primary-foreground shadow-2xl"
          style={{ background: S.accent }}
        >
          <Icon className="size-14" />
        </div>
        <h1 className="mt-10 animate-fade-in text-3xl font-bold tracking-tight">{S.title}</h1>
        <p className="mt-3 max-w-xs animate-fade-in text-sm text-muted-foreground">{S.body}</p>
      </div>

      <div className="mt-6 flex items-center justify-center gap-2">
        {slides.map((_, idx) => (
          <span
            key={idx}
            className={`h-1.5 rounded-full transition-all ${
              idx === i ? "w-8 bg-primary" : "w-1.5 bg-border"
            }`}
          />
        ))}
      </div>

      <Button onClick={next} className="mt-8 h-14 w-full rounded-full text-base" size="lg">
        {isLast ? "Get started" : "Next"}
      </Button>
    </div>
  );
}
