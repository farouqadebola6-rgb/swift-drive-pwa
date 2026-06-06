import { createFileRoute } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { DashboardShell } from "@/components/dashboards/dashboard-shell";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { Home, Briefcase, Star, Loader2, Pencil, Trash2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { toast } from "sonner";
import { LocationAutocomplete } from "@/components/booking/location-autocomplete";
import type { GeoPlace } from "@/lib/geo";

export const Route = createFileRoute("/_authenticated/saved-places")({
  head: () => ({ meta: [{ title: "Saved places — Hamduk Drive" }] }),
  component: SavedPlacesPage,
});

const SLOTS: Array<{ slot: "home" | "work" | "favorite"; label: string; icon: typeof Home }> = [
  { slot: "home", label: "Home", icon: Home },
  { slot: "work", label: "Work", icon: Briefcase },
  { slot: "favorite", label: "Favorite", icon: Star },
];

function SavedPlacesPage() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const [editing, setEditing] = useState<null | "home" | "work" | "favorite">(null);

  const { data: places = [], isLoading } = useQuery({
    queryKey: ["saved-places", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("saved_places")
        .select("id, slot, label, address, lat, lng")
        .not("slot", "is", null);
      if (error) throw error;
      return data ?? [];
    },
  });

  const upsert = useMutation({
    mutationFn: async (payload: {
      slot: "home" | "work" | "favorite";
      label: string;
      place: GeoPlace;
    }) => {
      if (!user) throw new Error("Not signed in");
      const existing = places.find((p) => p.slot === payload.slot);
      if (existing) {
        const { error } = await supabase
          .from("saved_places")
          .update({
            label: payload.label,
            address: payload.place.display_name,
            lat: payload.place.lat,
            lng: payload.place.lng,
          })
          .eq("id", existing.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("saved_places").insert({
          user_id: user.id,
          slot: payload.slot,
          label: payload.label,
          address: payload.place.display_name,
          lat: payload.place.lat,
          lng: payload.place.lng,
        });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      toast.success("Saved");
      setEditing(null);
      void qc.invalidateQueries({ queryKey: ["saved-places", user?.id] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const remove = useMutation({
    mutationFn: async (id: number) => {
      const { error } = await supabase.from("saved_places").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => void qc.invalidateQueries({ queryKey: ["saved-places", user?.id] }),
  });

  return (
    <DashboardShell title="Saved places" subtitle="Quickly fill pickup or drop-off when booking.">
      {isLoading ? (
        <div className="grid place-items-center py-8"><Loader2 className="size-5 animate-spin text-primary" /></div>
      ) : (
        <div className="space-y-3">
          {SLOTS.map(({ slot, label, icon: Icon }) => {
            const row = places.find((p) => p.slot === slot);
            return (
              <Card key={slot} className="flex items-center gap-3 rounded-2xl p-4">
                <div className="grid size-10 place-items-center rounded-xl bg-primary/10 text-primary">
                  <Icon className="size-5" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="font-medium">{label}</p>
                  <p className="truncate text-xs text-muted-foreground">
                    {row?.address ?? "Not set"}
                  </p>
                </div>
                <button
                  className="grid size-9 place-items-center rounded-full text-muted-foreground hover:bg-muted"
                  aria-label="Edit"
                  onClick={() => setEditing(slot)}
                >
                  <Pencil className="size-4" />
                </button>
                {row && (
                  <button
                    className="grid size-9 place-items-center rounded-full text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                    aria-label="Clear"
                    onClick={() => remove.mutate(row.id)}
                  >
                    <Trash2 className="size-4" />
                  </button>
                )}
              </Card>
            );
          })}
        </div>
      )}

      <Dialog open={!!editing} onOpenChange={(o) => !o && setEditing(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="capitalize">Set your {editing} address</DialogTitle>
          </DialogHeader>
          {editing && (
            <SlotEditor
              slot={editing}
              defaultLabel={SLOTS.find((s) => s.slot === editing)!.label}
              onSave={(payload) => upsert.mutate(payload)}
              saving={upsert.isPending}
            />
          )}
        </DialogContent>
      </Dialog>
    </DashboardShell>
  );
}

function SlotEditor({
  slot,
  defaultLabel,
  onSave,
  saving,
}: {
  slot: "home" | "work" | "favorite";
  defaultLabel: string;
  onSave: (p: { slot: typeof slot; label: string; place: GeoPlace }) => void;
  saving: boolean;
}) {
  const [place, setPlace] = useState<GeoPlace | null>(null);
  useEffect(() => setPlace(null), [slot]);
  return (
    <div className="space-y-4">
      <LocationAutocomplete
        label="Search address"
        placeholder="Type a street, landmark or area"
        value={place}
        onChange={setPlace}
        showLocateButton
      />
      <Button
        className="h-11 w-full rounded-full"
        disabled={!place || saving}
        onClick={() => place && onSave({ slot, label: defaultLabel, place })}
      >
        {saving && <Loader2 className="mr-2 size-4 animate-spin" />}
        Save {defaultLabel.toLowerCase()}
      </Button>
    </div>
  );
}
