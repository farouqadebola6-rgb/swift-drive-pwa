import { useEffect, useRef, useState } from "react";
import { MapPin, Loader2, LocateFixed, Home, Briefcase, Star } from "lucide-react";
import { searchPlaces, reverseGeocode, type GeoPlace } from "@/lib/geo";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

export interface SavedPlaceLite {
  slot: "home" | "work" | "favorite";
  label: string;
  address: string;
  lat: number | null;
  lng: number | null;
}

interface Props {
  label: string;
  placeholder: string;
  value: GeoPlace | null;
  onChange: (place: GeoPlace | null) => void;
  iconClassName?: string;
  showLocateButton?: boolean;
  savedPlaces?: SavedPlaceLite[];
}

const SLOT_ICON = {
  home: Home,
  work: Briefcase,
  favorite: Star,
};

export function LocationAutocomplete({
  label,
  placeholder,
  value,
  onChange,
  iconClassName,
  showLocateButton,
  savedPlaces,
}: Props) {
  const [query, setQuery] = useState(value?.display_name ?? "");
  const [results, setResults] = useState<GeoPlace[]>([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [locating, setLocating] = useState(false);
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    setQuery(value?.display_name ?? "");
  }, [value]);

  useEffect(() => {
    if (!open) return;
    if (value && query === value.display_name) return;
    abortRef.current?.abort();
    const ctrl = new AbortController();
    abortRef.current = ctrl;
    const t = setTimeout(async () => {
      setLoading(true);
      try {
        const r = await searchPlaces(query, ctrl.signal);
        setResults(r);
      } catch {
        /* noop */
      } finally {
        setLoading(false);
      }
    }, 350);
    return () => {
      clearTimeout(t);
      ctrl.abort();
    };
  }, [query, open, value]);

  const useMyLocation = () => {
    if (!navigator.geolocation) {
      toast.error("Geolocation not supported on this device");
      return;
    }
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        try {
          const place = await reverseGeocode(pos.coords.latitude, pos.coords.longitude);
          if (place) {
            onChange(place);
            setQuery(place.display_name);
            setOpen(false);
          } else {
            toast.error("Couldn't read address from your location");
          }
        } finally {
          setLocating(false);
        }
      },
      (err) => {
        setLocating(false);
        toast.error(err.message || "Couldn't get your location");
      },
      { enableHighAccuracy: true, timeout: 10_000, maximumAge: 60_000 },
    );
  };

  const savedToShow = (savedPlaces ?? []).filter((s) => s.lat != null && s.lng != null);
  const showSaved = open && savedToShow.length > 0 && query.length < 3;

  return (
    <div className="relative">
      <label className="mb-1.5 block text-xs font-medium text-muted-foreground">
        {label}
      </label>
      <div className="flex items-center gap-2">
        <div className="flex flex-1 items-center gap-3 rounded-lg border border-border bg-background p-3 focus-within:border-primary">
          <MapPin className={cn("size-5 shrink-0", iconClassName ?? "text-primary")} />
          <input
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              if (value) onChange(null);
            }}
            onFocus={() => setOpen(true)}
            onBlur={() => setTimeout(() => setOpen(false), 180)}
            placeholder={placeholder}
            className="flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground"
          />
          {loading && <Loader2 className="size-4 animate-spin text-muted-foreground" />}
        </div>
        {showLocateButton && (
          <button
            type="button"
            onClick={useMyLocation}
            disabled={locating}
            aria-label="Use my location"
            className="grid size-12 shrink-0 place-items-center rounded-lg border border-border bg-background hover:bg-accent disabled:opacity-50"
          >
            {locating ? (
              <Loader2 className="size-4 animate-spin text-primary" />
            ) : (
              <LocateFixed className="size-5 text-primary" />
            )}
          </button>
        )}
      </div>

      {(showSaved || (open && results.length > 0)) && (
        <div className="absolute z-30 mt-1 w-full overflow-hidden rounded-lg border border-border bg-popover shadow-lg">
          {showSaved &&
            savedToShow.map((s) => {
              const Icon = SLOT_ICON[s.slot];
              return (
                <button
                  key={s.slot}
                  type="button"
                  onMouseDown={(e) => {
                    e.preventDefault();
                    onChange({
                      display_name: s.address,
                      lat: s.lat!,
                      lng: s.lng!,
                      area: s.label,
                    });
                    setQuery(s.address);
                    setOpen(false);
                  }}
                  className="flex w-full items-start gap-2 border-b border-border bg-muted/30 px-3 py-2 text-left text-sm last:border-0 hover:bg-accent hover:text-accent-foreground"
                >
                  <Icon className="mt-0.5 size-4 shrink-0 text-primary" />
                  <span className="flex-1">
                    <span className="block font-medium capitalize">{s.label || s.slot}</span>
                    <span className="line-clamp-1 text-xs text-muted-foreground">{s.address}</span>
                  </span>
                </button>
              );
            })}
          {open &&
            !showSaved &&
            results.map((r, i) => (
              <button
                key={`${r.lat}-${r.lng}-${i}`}
                type="button"
                onMouseDown={(e) => {
                  e.preventDefault();
                  onChange(r);
                  setQuery(r.display_name);
                  setOpen(false);
                }}
                className="flex w-full items-start gap-2 border-b border-border px-3 py-2 text-left text-sm last:border-0 hover:bg-accent hover:text-accent-foreground"
              >
                <MapPin className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
                <span className="line-clamp-2">{r.display_name}</span>
              </button>
            ))}
        </div>
      )}
    </div>
  );
}
