import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { DashboardShell } from "@/components/dashboards/dashboard-shell";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { MapPin, Trash2, Loader2, Plus } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/saved-places")({
  head: () => ({ meta: [{ title: "Saved places — Hamduk Drive" }] }),
  component: SavedPlacesPage,
});

function SavedPlacesPage() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const [label, setLabel] = useState("");
  const [address, setAddress] = useState("");
  const [adding, setAdding] = useState(false);

  const { data: places = [], isLoading } = useQuery({
    queryKey: ["saved-places", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("saved_places")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const add = useMutation({
    mutationFn: async () => {
      if (!user || !label || !address) throw new Error("Fill all fields");
      const { error } = await supabase.from("saved_places").insert({
        user_id: user.id,
        label,
        address,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      setLabel("");
      setAddress("");
      setAdding(false);
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
    <DashboardShell title="Saved places" subtitle="Speed up booking with your favourites.">
      {!adding && (
        <Button onClick={() => setAdding(true)} className="mb-4 h-12 w-full rounded-full">
          <Plus className="mr-2 size-4" /> Add a place
        </Button>
      )}

      {adding && (
        <Card className="mb-4 space-y-3 rounded-2xl p-4">
          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">Label (e.g. Home, Work)</Label>
            <Input value={label} onChange={(e) => setLabel(e.target.value)} className="h-12 rounded-2xl bg-muted/50" />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">Address</Label>
            <Input value={address} onChange={(e) => setAddress(e.target.value)} className="h-12 rounded-2xl bg-muted/50" />
          </div>
          <div className="flex gap-2">
            <Button variant="outline" className="h-11 flex-1 rounded-full" onClick={() => setAdding(false)}>
              Cancel
            </Button>
            <Button className="h-11 flex-1 rounded-full" onClick={() => add.mutate()} disabled={add.isPending}>
              {add.isPending && <Loader2 className="mr-2 size-4 animate-spin" />} Save
            </Button>
          </div>
        </Card>
      )}

      {isLoading ? (
        <div className="grid place-items-center py-8">
          <Loader2 className="size-5 animate-spin text-primary" />
        </div>
      ) : places.length === 0 ? (
        <Card className="rounded-2xl p-6 text-center text-sm text-muted-foreground">
          No saved places yet.
        </Card>
      ) : (
        <div className="space-y-2">
          {places.map((p) => (
            <Card key={p.id} className="flex items-center gap-3 rounded-2xl p-4">
              <div className="grid size-10 place-items-center rounded-xl bg-primary/10 text-primary">
                <MapPin className="size-5" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="font-medium">{p.label}</p>
                <p className="truncate text-xs text-muted-foreground">{p.address}</p>
              </div>
              <button
                aria-label="Delete"
                className="grid size-9 place-items-center rounded-full text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                onClick={() => remove.mutate(p.id)}
              >
                <Trash2 className="size-4" />
              </button>
            </Card>
          ))}
        </div>
      )}
    </DashboardShell>
  );
}
