import { useEffect, useRef, useState } from "react";
import { MapPin, Loader2 } from "lucide-react";
import { searchPlaces, type GeoPlace } from "@/lib/geo";
import { cn } from "@/lib/utils";

interface Props {
  label: string;
  placeholder: string;
  value: GeoPlace | null;
  onChange: (place: GeoPlace | null) => void;
  iconClassName?: string;
}

export function LocationAutocomplete({
  label,
  placeholder,
  value,
  onChange,
  iconClassName,
}: Props) {
  const [query, setQuery] = useState(value?.display_name ?? "");
  const [results, setResults] = useState<GeoPlace[]>([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
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
        // aborted or network
      } finally {
        setLoading(false);
      }
    }, 350);
    return () => {
      clearTimeout(t);
      ctrl.abort();
    };
  }, [query, open, value]);

  return (
    <div className="relative">
      <label className="mb-1.5 block text-xs font-medium text-muted-foreground">
        {label}
      </label>
      <div className="flex items-center gap-3 rounded-lg border border-border bg-background p-3 focus-within:border-primary">
        <MapPin className={cn("size-5 shrink-0", iconClassName ?? "text-primary")} />
        <input
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            if (value) onChange(null);
          }}
          onFocus={() => setOpen(true)}
          onBlur={() => setTimeout(() => setOpen(false), 150)}
          placeholder={placeholder}
          className="flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground"
        />
        {loading && <Loader2 className="size-4 animate-spin text-muted-foreground" />}
      </div>

      {open && results.length > 0 && (
        <div className="absolute z-30 mt-1 w-full overflow-hidden rounded-lg border border-border bg-popover shadow-lg">
          {results.map((r, i) => (
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
