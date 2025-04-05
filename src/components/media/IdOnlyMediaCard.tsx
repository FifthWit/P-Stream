import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";

import {
  formatTMDBMetaToMediaItem,
  getMediaDetails,
} from "@/backend/metadata/tmdb";
import { TMDBContentTypes } from "@/backend/metadata/types/tmdb";
import { MediaItem } from "@/utils/mediaTypes";

import { MediaCard } from "./MediaCard";

interface IdOnlyMediaCardProps {
  id: string;
  mediaType: "movie" | "show";
  linkable?: boolean;
  series?: {
    episode: number;
    season?: number;
    episodeId: string;
    seasonId: string;
  };
  percentage?: number;
  closable?: boolean;
  onClose?: () => void;
}

export function IdOnlyMediaCard({
  id,
  mediaType,
  linkable = true,
  series,
  percentage,
  closable,
  onClose,
}: IdOnlyMediaCardProps) {
  const { t } = useTranslation();
  const [loading, setLoading] = useState(true);
  const [media, setMedia] = useState<MediaItem | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isRateLimited, setIsRateLimited] = useState(false);
  // Shitty rate limit handler
  function isRateLimitError(err: unknown): boolean {
    if (err instanceof Error) {
      if (
        err.message.includes("429") ||
        err.message.toLowerCase().includes("rate limit") ||
        err.message.toLowerCase().includes("too many requests")
      ) {
        return true;
      }
    }

    if (typeof err === "object" && err !== null) {
      if ("status" in err && (err as any).status === 429) {
        return true;
      }
      if ("statusCode" in err && (err as any).statusCode === 429) {
        return true;
      }
    }

    return false;
  }

  useEffect(() => {
    const fetchMediaDetails = async () => {
      try {
        setLoading(true);
        setError(null);
        setIsRateLimited(false);

        const tmdbType =
          mediaType === "movie" ? TMDBContentTypes.MOVIE : TMDBContentTypes.TV;

        const details = await getMediaDetails(id, tmdbType);

        const mediaItem = formatTMDBMetaToMediaItem({
          id: details.id,
          title:
            tmdbType === TMDBContentTypes.MOVIE
              ? (details as any).title
              : (details as any).name,
          object_type: tmdbType,
          poster: (details as any).poster_path
            ? `https://image.tmdb.org/t/p/w342${(details as any).poster_path}`
            : undefined,
          original_release_date: new Date(
            tmdbType === TMDBContentTypes.MOVIE
              ? (details as any).release_date
              : (details as any).first_air_date,
          ),
        });

        setMedia(mediaItem);
      } catch (err) {
        console.error("Error fetching media details:", err);

        const isRateLimit = isRateLimitError(err);

        if (isRateLimit) {
          setIsRateLimited(true);
        } else {
          setError(t("errors.failedToLoad"));
        }
      } finally {
        setLoading(false);
      }
    };

    if (id) {
      fetchMediaDetails();
    }
  }, [id, mediaType, t]);

  if (isRateLimited) {
    return null;
  }

  if (error) {
    return (
      <div className="media-card-content">
        <div className="rounded-xl bg-background-main p-[0.4em]">
          <div className="relative mb-4 pb-[150%] w-full overflow-hidden rounded-xl bg-mediaCard-hoverBackground flex items-center justify-center">
            <div className="text-white text-center p-4">
              <p>{error}</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (loading || !media) {
    return (
      <div className="media-card-content">
        <div className="rounded-xl bg-background-main p-[0.4em]">
          <div className="relative mb-4 pb-[150%] w-full overflow-hidden rounded-xl bg-mediaCard-hoverBackground/20 animate-pulse" />
          <div className="h-5 w-full rounded-md bg-mediaCard-hoverBackground/20 animate-pulse mb-2" />
          <div className="h-3 w-1/2 rounded-md bg-mediaCard-hoverBackground/20 animate-pulse" />
        </div>
      </div>
    );
  }

  return (
    <MediaCard
      media={media}
      linkable={linkable}
      series={series}
      percentage={percentage}
      closable={closable}
      onClose={onClose}
    />
  );
}
