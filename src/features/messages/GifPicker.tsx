import { Loader2, Search } from "lucide-react";
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";

import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

const API_KEY = import.meta.env.VITE_GIPHY_API_KEY as string | undefined;

interface GifResult {
  id: string;
  title: string;
  preview: string;
  url: string;
  width: number;
  height: number;
}

async function searchGifs(query: string): Promise<GifResult[]> {
  if (!API_KEY) return [];
  const endpoint = query.trim()
    ? `https://api.giphy.com/v1/gifs/search?api_key=${API_KEY}&q=${encodeURIComponent(query)}&limit=24&rating=pg-13`
    : `https://api.giphy.com/v1/gifs/trending?api_key=${API_KEY}&limit=24&rating=pg-13`;

  const response = await fetch(endpoint);
  if (!response.ok) throw new Error("gif_search_failed");
  const body = await response.json();

  return (body.data ?? []).map((item: Record<string, unknown>) => {
    const images = item.images as Record<string, { url: string; width: string; height: string }>;
    const fixed = images.fixed_height ?? images.downsized;
    return {
      id: String(item.id),
      title: String(item.title ?? ""),
      preview: images.fixed_width_small?.url ?? fixed.url,
      url: fixed.url,
      width: Number(fixed.width),
      height: Number(fixed.height),
    };
  });
}

export function GifPicker({
  onSelect,
  children,
}: {
  onSelect: (gif: { url: string; width: number; height: number; title: string }) => void;
  children: React.ReactNode;
}) {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<GifResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    if (!open || !API_KEY) return;
    let cancelled = false;
    setLoading(true);
    setFailed(false);
    const timer = setTimeout(() => {
      void searchGifs(query)
        .then((items) => {
          if (!cancelled) setResults(items);
        })
        .catch(() => {
          if (!cancelled) setFailed(true);
        })
        .finally(() => {
          if (!cancelled) setLoading(false);
        });
    }, 320);

    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [open, query]);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>{children}</PopoverTrigger>
      <PopoverContent align="end" side="top" className="w-80 p-2">
        <div className="relative mb-2">
          <Search className="pointer-events-none absolute top-1/2 left-2.5 size-3.5 -translate-y-1/2 text-muted-foreground" />
          <Input
            autoFocus
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder={t("gif.search")}
            className="h-8 pl-8 text-[12.5px]"
          />
        </div>

        {!API_KEY ? (
          <p className="px-2 py-6 text-center text-[12px] text-muted-foreground">
            {t("gif.notConfigured")}
          </p>
        ) : loading ? (
          <div className="flex justify-center py-8">
            <Loader2 className="size-4 animate-spin text-muted-foreground" />
          </div>
        ) : failed ? (
          <p className="px-2 py-6 text-center text-[12px] text-muted-foreground">
            {t("common.error")}
          </p>
        ) : results.length === 0 ? (
          <p className="px-2 py-6 text-center text-[12px] text-muted-foreground">
            {t("gif.empty")}
          </p>
        ) : (
          <div className="scrollbar-thin grid max-h-64 grid-cols-2 gap-1.5 overflow-y-auto">
            {results.map((gif) => (
              <button
                key={gif.id}
                type="button"
                onClick={() => {
                  onSelect(gif);
                  setOpen(false);
                }}
                className={cn(
                  "overflow-hidden rounded-md border border-transparent transition-colors hover:border-primary",
                )}
              >
                <img
                  src={gif.preview}
                  alt={gif.title}
                  loading="lazy"
                  className="h-24 w-full object-cover"
                />
              </button>
            ))}
          </div>
        )}

        <p className="pt-1.5 text-center text-[10px] text-muted-foreground">
          Powered by GIPHY
        </p>
      </PopoverContent>
    </Popover>
  );
}

export function useGifAvailable() {
  return Boolean(API_KEY);
}
