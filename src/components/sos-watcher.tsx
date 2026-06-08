import { Link } from "@tanstack/react-router";
import { Siren, X, Loader2 } from "lucide-react";
import { useMutation } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { useSosPinger } from "@/hooks/use-sos-pinger";
import { stopSosSession } from "@/lib/safety.functions";

/**
 * Persistent SOS banner + ping loop. Mounted once at the root so the location
 * keeps streaming every 10 min across navigation, until the user or an admin
 * stops the session.
 */
export function SosWatcher() {
  const { active, clear } = useSosPinger();
  const stopFn = useServerFn(stopSosSession);
  const stop = useMutation({
    mutationFn: () => stopFn({ data: { sessionId: active!.sessionId } }),
    onSuccess: () => {
      clear();
      toast.success("SOS stopped. Stay safe.");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  if (!active) return null;

  return (
    <div
      className="fixed inset-x-0 top-0 z-50 bg-destructive text-destructive-foreground shadow-lg"
      style={{ paddingTop: "env(safe-area-inset-top)" }}
    >
      <div className="mx-auto flex max-w-5xl items-center justify-between gap-3 px-4 py-2 text-sm">
        <div className="flex min-w-0 items-center gap-2">
          <Siren className="size-4 shrink-0 animate-pulse" />
          <span className="truncate font-semibold">
            SOS active — sharing location every 10 min
          </span>
        </div>
        <div className="flex items-center gap-2">
          <Link
            to="/sos/$token"
            params={{ token: active.shareToken }}
            className="rounded-full bg-black/20 px-3 py-1 text-xs font-medium"
          >
            View
          </Link>
          <button
            onClick={() => {
              if (confirm("Stop the SOS live tracking?")) stop.mutate();
            }}
            disabled={stop.isPending}
            className="grid size-7 place-items-center rounded-full bg-black/20"
            aria-label="Stop SOS"
          >
            {stop.isPending ? <Loader2 className="size-3.5 animate-spin" /> : <X className="size-3.5" />}
          </button>
        </div>
      </div>
    </div>
  );
}
