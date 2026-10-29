import { Search } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

const API = "https://api.giphy.com/v1/gifs";
const PAGE = 24;

interface Gif {
  id: string;
  title: string;
  preview: string;
  url: string;
  width: number;
  height: number;
}

interface GiphyImage {
  url: string;
  width: string;
  height: string;
}

interface GiphyItem {
  id: string;
  title: string;
  images: {
    fixed_width: GiphyImage;
    fixed_width_downsampled: GiphyImage;
    original: GiphyImage;
  };
}

function toGif(item: GiphyItem): Gif {
  const preview = item.images.fixed_width;
  return {
    id: item.id,
    title: item.title || "GIF",
    preview: preview.url,
    // The original GIF keeps its animation; the "downsampled" variant is a
    // smaller GIF that still animates, so use it when it exists.
    url: item.images.fixed_width_downsampled?.url || item.images.original.url,
    width: Number(preview.width) || 200,
    height: Number(preview.height) || 200,
  };
}

export function GiphyPicker({ onSelect }: { onSelect: (url: string) => void }) {
  const { t } = useTranslation();
  const key = import.meta.env.VITE_GIPHY_API_KEY as string | undefined;
  const [query, setQuery] = useState("");
  const [gifs, setGifs] = useState<Gif[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(false);
  const requestId = useRef(0);

  useEffect(() => {
    if (!key) return;
    const controller = new AbortController();
    const id = ++requestId.current;
    const timer = setTimeout(async () => {
      setLoading(true);
      setError(false);
      try {
        const term = query.trim();
        const params = new URLSearchParams({
          api_key: key,
          limit: String(PAGE),
          rating: "pg-13",
          lang: "tr",
        });
        if (term) params.set("q", term);
        const endpoint = term ? "search" : "trending";
        const response = await fetch(`${API}/${endpoint}?${params}`, {
          signal: controller.signal,
        });
        if (!response.ok) throw new Error("giphy_failed");
        const payload = (await response.json()) as { data: GiphyItem[] };
        if (id !== requestId.current) return;
        setGifs(payload.data.map(toGif));
      } catch (cause) {
        if ((cause as Error)?.name === "AbortError") return;
        if (id === requestId.current) setError(true);
      } finally {
        if (id === requestId.current) setLoading(false);
      }
    }, query ? 320 : 0);

    return () => {
      controller.abort();
      clearTimeout(timer);
    };
  }, [key, query]);

  return (
    <div className="flex h-[380px] w-[330px] flex-col gap-2 rounded-xl border border-border/70 bg-popover p-2 shadow-xl">
      <div className="relative">
        <Search className="pointer-events-none absolute top-1/2 left-2.5 size-3.5 -translate-y-1/2 text-muted-foreground" />
        <Input
          autoFocus
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder={t("chat.gifSearch")}
          className="h-8 pl-8 text-[13px]"
        />
      </div>

      <div className="scrollbar-thin min-h-0 flex-1 overflow-y-auto">
        {!key ? (
          <p className="p-4 text-center text-[12px] text-muted-foreground">
            {t("chat.gifNoKey")}
          </p>
        ) : error ? (
          <p className="p-4 text-center text-[12px] text-destructive">
            {t("chat.gifError")}
          </p>
        ) : loading && gifs.length === 0 ? (
          <div className="grid grid-cols-2 gap-1.5">
            {Array.from({ length: 6 }).map((_, index) => (
              <div key={index} className="aspect-video animate-pulse rounded-md bg-secondary" />
            ))}
          </div>
        ) : gifs.length === 0 ? (
          <p className="p-4 text-center text-[12px] text-muted-foreground">
            {t("chat.gifEmpty")}
          </p>
        ) : (
          <div className="grid grid-cols-2 gap-1.5">
            {gifs.map((gif) => (
              <button
                key={gif.id}
                type="button"
                onClick={() => onSelect(gif.url)}
                className="group relative overflow-hidden rounded-md bg-secondary focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
                title={gif.title}
              >
                <img
                  src={gif.preview}
                  alt={gif.title}
                  loading="lazy"
                  className="size-full object-cover transition-transform group-hover:scale-105"
                />
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export function GifPickerButton({ onSelect }: { onSelect: (url: string) => void }) {
  const { t } = useTranslation();
  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="ghost"
          aria-label={t("chat.gif")}
          className="size-8 shrink-0 px-0 text-[10px] font-bold text-muted-foreground"
        >
          GIF
        </Button>
      </PopoverTrigger>
      <PopoverContent
        align="end"
        side="top"
        className="w-auto border-none bg-transparent p-0 shadow-none"
      >
        <GiphyPicker onSelect={onSelect} />
      </PopoverContent>
    </Popover>
  );
}
