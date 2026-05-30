import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { z } from "zod";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/hooks/use-auth";
import { ArrowLeft, Loader2 } from "lucide-react";

const searchSchema = z.object({
  mode: z.enum(["signin", "signup"]).optional().default("signin"),
  role: z.enum(["rider", "driver"]).optional().default("rider"),
});

export const Route = createFileRoute("/auth")({
  validateSearch: searchSchema,
  head: () => ({
    meta: [
      { title: "Sign in to Hamduk Drive" },
      { name: "description", content: "Sign in or create your Hamduk Drive account." },
    ],
  }),
  component: AuthPage,
});

function AuthPage() {
  const search = Route.useSearch();
  const navigate = useNavigate();
  const { refreshRole } = useAuth();

  const [mode, setMode] = useState<"signin" | "signup">(search.mode);
  const [role, setRole] = useState<"rider" | "driver">(search.role);
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const handleEmailAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      if (mode === "signup") {
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            emailRedirectTo: `${window.location.origin}/app`,
            data: { full_name: fullName, phone, role },
          },
        });
        if (error) throw error;
        toast.success("Account created. Check your email to confirm.");
        navigate({ to: "/auth", search: { mode: "signin", role } });
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        await refreshRole();
        toast.success("Welcome back!");
        navigate({ to: "/app" });
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Something went wrong";
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  const handleGoogle = async () => {
    setLoading(true);
    try {
      const result = await lovable.auth.signInWithOAuth("google", {
        redirect_uri: `${window.location.origin}/app`,
      });
      if (result.error) {
        toast.error(result.error.message);
        return;
      }
      if (result.redirected) return;
      await refreshRole();
      navigate({ to: "/app" });
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Google sign-in failed";
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="grid min-h-screen md:grid-cols-2">
      {/* Brand panel */}
      <div
        className="relative hidden md:flex md:flex-col md:justify-between md:p-10"
        style={{ background: "var(--gradient-hero)" }}
      >
        <Link to="/" className="flex items-center gap-2 text-primary-foreground">
          <div
            className="size-8 rounded-lg"
            style={{ background: "var(--gradient-accent)" }}
          />
          <span className="font-semibold">Hamduk Drive</span>
        </Link>
        <div className="text-primary-foreground">
          <h2 className="text-3xl font-bold leading-tight">
            Lagos rides, <span className="text-accent">done right.</span>
          </h2>
          <p className="mt-3 max-w-md text-sm text-primary-foreground/80">
            Lower fees. Fixed fares. Instant payouts. Whether you're hopping across town or
            driving for a living — we built this for you.
          </p>
        </div>
        <p className="text-xs text-primary-foreground/60">
          © {new Date().getFullYear()} Hamduk Unique Concept
        </p>
      </div>

      {/* Form panel */}
      <div className="flex flex-col px-5 py-8 sm:px-10">
        <Link
          to="/"
          className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="size-4" /> Back
        </Link>

        <div className="mx-auto mt-10 w-full max-w-sm flex-1">
          <h1 className="text-2xl font-bold tracking-tight">
            {mode === "signup" ? "Create your account" : "Welcome back"}
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {mode === "signup"
              ? "Join Hamduk Drive in under a minute."
              : "Sign in to continue."}
          </p>

          {mode === "signup" && (
            <div className="mt-6 grid grid-cols-2 gap-2 rounded-lg bg-secondary p-1">
              <RoleTab active={role === "rider"} onClick={() => setRole("rider")}>
                Rider
              </RoleTab>
              <RoleTab active={role === "driver"} onClick={() => setRole("driver")}>
                Driver
              </RoleTab>
            </div>
          )}

          <form onSubmit={handleEmailAuth} className="mt-6 space-y-4">
            {mode === "signup" && (
              <>
                <Field
                  id="fullName"
                  label="Full name"
                  value={fullName}
                  onChange={setFullName}
                  required
                  placeholder="Amisu Abdul"
                />
                <Field
                  id="phone"
                  label="Phone number"
                  value={phone}
                  onChange={setPhone}
                  required
                  placeholder="+234…"
                  type="tel"
                />
              </>
            )}
            <Field
              id="email"
              label="Email"
              value={email}
              onChange={setEmail}
              required
              type="email"
              placeholder="you@example.com"
            />
            <Field
              id="password"
              label="Password"
              value={password}
              onChange={setPassword}
              required
              type="password"
              placeholder="At least 8 characters"
              minLength={8}
            />

            <Button type="submit" className="w-full" disabled={loading} size="lg">
              {loading && <Loader2 className="mr-2 size-4 animate-spin" />}
              {mode === "signup" ? "Create account" : "Sign in"}
            </Button>
          </form>

          <div className="my-5 flex items-center gap-3 text-xs text-muted-foreground">
            <div className="h-px flex-1 bg-border" /> or <div className="h-px flex-1 bg-border" />
          </div>

          <Button
            type="button"
            variant="outline"
            className="w-full"
            onClick={handleGoogle}
            disabled={loading}
          >
            Continue with Google
          </Button>

          <p className="mt-6 text-center text-sm text-muted-foreground">
            {mode === "signup" ? "Already have an account?" : "New to Hamduk Drive?"}{" "}
            <button
              type="button"
              className="font-medium text-primary hover:underline"
              onClick={() => setMode(mode === "signup" ? "signin" : "signup")}
            >
              {mode === "signup" ? "Sign in" : "Create one"}
            </button>
          </p>
        </div>
      </div>
    </div>
  );
}

function RoleTab({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-md px-3 py-2 text-sm font-medium transition-colors ${
        active
          ? "bg-background text-foreground shadow-[var(--shadow-soft)]"
          : "text-muted-foreground hover:text-foreground"
      }`}
    >
      {children}
    </button>
  );
}

function Field({
  id,
  label,
  value,
  onChange,
  ...rest
}: {
  id: string;
  label: string;
  value: string;
  onChange: (v: string) => void;
} & Omit<React.InputHTMLAttributes<HTMLInputElement>, "onChange" | "value" | "id">) {
  return (
    <div className="space-y-1.5">
      <Label htmlFor={id}>{label}</Label>
      <Input id={id} value={value} onChange={(e) => onChange(e.target.value)} {...rest} />
    </div>
  );
}
