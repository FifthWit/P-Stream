import { t } from "i18next";

import { Icon, Icons } from "@/components/Icon";
import { getRTIcon } from "@/utils/rottenTomatoesScraper";

import { DetailsRatingsProps } from "./types";

export function DetailsRatings({
  voteAverage,
  voteCount,
  imdbData,
  rtData,
  mediaId,
  mediaType,
  imdbId,
}: DetailsRatingsProps) {
  const formatVoteCount = (count?: number) => {
    if (!count) return "0";
    if (count >= 1000) {
      return `${Math.floor(count / 1000)}K+`;
    }
    return count.toString();
  };

  const getRatingColor = (rating: number) => {
    if (rating >= 8) return "bg-green-500";
    if (rating >= 6) return "bg-yellow-500";
    if (rating >= 4) return "bg-orange-500";
    return "bg-red-500";
  };

  return (
    <div className="space-y-1">
      {voteAverage !== undefined &&
        voteCount !== undefined &&
        voteCount > 0 && (
          <>
            <div className="flex items-center gap-1 text-white/80">
              <span className="font-medium">{t("details.rating")}</span>{" "}
              <span className="text-white/90">
                {imdbData?.imdb_rating
                  ? `${imdbData.imdb_rating.toFixed(1)}/10 (IMDb)`
                  : `${voteAverage.toFixed(1)}/10 (TMDB)`}
              </span>
            </div>
            {/* Rating Progress Bar */}
            <div className="w-full h-2 bg-white/10 rounded-full overflow-hidden">
              <div
                className={`h-full ${getRatingColor(imdbData?.imdb_rating || voteAverage)} transition-all duration-500`}
                style={{
                  width: `${((imdbData?.imdb_rating || voteAverage) / 10) * 100}%`,
                }}
              />
            </div>
            <div className="text-white/60 text-[10px] text-right">
              {formatVoteCount(imdbData?.votes || voteCount)}{" "}
              {t("details.votes")}
            </div>
          </>
        )}

      {/* External Links */}
      <div className="flex gap-3 mt-2">
        {mediaId && (
          <a
            href={`https://www.themoviedb.org/${mediaType === "show" ? "tv" : "movie"}/${mediaId}`}
            target="_blank"
            rel="noopener noreferrer"
            className="w-8 h-8 rounded-full bg-[#0d253f] flex items-center justify-center transition-transform hover:scale-110"
            title={t("details.tmdb")}
          >
            <Icon icon={Icons.TMDB} className="text-white" />
          </a>
        )}
        {imdbId && (
          <a
            href={`https://www.imdb.com/title/${imdbId}`}
            target="_blank"
            rel="noopener noreferrer"
            className="w-8 h-8 rounded-full bg-yellow-500 flex items-center justify-center transition-transform hover:scale-110"
            title={t("details.imdb")}
          >
            <Icon icon={Icons.IMDB} className="text-black" />
          </a>
        )}
        {rtData && (
          <div className="flex items-center gap-1">
            <div className="flex flex-col items-center justify-center gap-1">
              <div className="flex items-center gap-1" title="Tomatometer">
                <img
                  src={getRTIcon(rtData.tomatoIcon)}
                  alt="Tomatometer"
                  className="w-8 h-8"
                />
                <span className="text-sm pl-1 text-white/80">
                  {rtData.tomatoScore}%
                </span>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
