import { t } from "i18next";
import { useEffect, useMemo, useState } from "react";
import { useCopyToClipboard } from "react-use";

import { Icon, Icons } from "@/components/Icon";
import { useLanguageStore } from "@/stores/language";
import { useProgressStore } from "@/stores/progress";
import { shouldShowProgress } from "@/stores/progress/utils";
import { scrapeIMDb } from "@/utils/imdbScraper";
import { getTmdbLanguageCode } from "@/utils/language";
import { scrapeRottenTomatoes } from "@/utils/rottenTomatoesScraper";

import { DetailsHeader } from "./DetailsHeader";
import { DetailsInfo } from "./DetailsInfo";
import { EpisodeCarousel } from "./EpisodeCarousel";
import { TrailerOverlay } from "./TrailerOverlay";
import { DetailsContentProps } from "./types";

export function DetailsContent({ data, minimal = false }: DetailsContentProps) {
  const [imdbData, setImdbData] = useState<any>(null);
  const [rtData, setRtData] = useState<any>(null);
  const [, setIsLoadingImdb] = useState(false);
  const [showTrailer, setShowTrailer] = useState(false);
  const [selectedSeason, setSelectedSeason] = useState<number>(1);
  const [, copyToClipboard] = useCopyToClipboard();
  const [hasCopiedShare, setHasCopiedShare] = useState(false);
  const progress = useProgressStore((s) => s.items);

  const showProgress = useMemo(() => {
    if (!data.id) return null;
    const item = progress[data.id.toString()];
    if (!item) return null;
    return shouldShowProgress(item);
  }, [data.id, progress]);

  // Set initial season based on current episode
  useEffect(() => {
    if (showProgress?.season?.number) {
      setSelectedSeason(showProgress.season.number);
    }
  }, [showProgress]);

  useEffect(() => {
    const fetchExternalData = async () => {
      if (!data.imdbId) return;

      setIsLoadingImdb(true);
      try {
        // Get the user's selected language and format it properly
        const userLanguage = useLanguageStore.getState().language;
        const formattedLanguage = getTmdbLanguageCode(userLanguage);

        // Fetch IMDb data
        const imdbMetadata = await scrapeIMDb(
          data.imdbId,
          undefined,
          undefined,
          formattedLanguage,
        );
        setImdbData(imdbMetadata);

        // Fetch Rotten Tomatoes data
        if (data.type === "movie") {
          const rtMetadata = await scrapeRottenTomatoes(
            data.title,
            data.releaseDate
              ? new Date(data.releaseDate).getFullYear()
              : undefined,
          );
          setRtData(rtMetadata);
        }
      } catch (error) {
        console.error("Failed to fetch external data:", error);
      } finally {
        setIsLoadingImdb(false);
      }
    };

    fetchExternalData();
  }, [data.imdbId, data.title, data.releaseDate, data.type]);

  const handlePlayClick = () => {
    if (data.type === "movie") {
      window.location.assign(
        `/media/tmdb-movie-${data.id}-${data.title.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`,
      );
    } else if (data.type === "show") {
      if (showProgress?.season?.id && showProgress?.episode?.id) {
        window.location.assign(
          `/media/tmdb-tv-${data.id}-${data.title.toLowerCase().replace(/[^a-z0-9]+/g, "-")}/${showProgress.season.id}/${showProgress.episode.id}`,
        );
      } else {
        // Start new show
        window.location.assign(
          `/media/tmdb-tv-${data.id}-${data.title.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`,
        );
      }
    }
  };

  const handleShareClick = () => {
    const shareUrl =
      data.type === "movie"
        ? `${window.location.origin}/media/tmdb-movie-${data.id}-${data.title.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`
        : `${window.location.origin}/media/tmdb-tv-${data.id}-${data.title.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`;

    copyToClipboard(shareUrl);
    setHasCopiedShare(true);
    setTimeout(() => setHasCopiedShare(false), 2000);
  };

  return (
    <div className="relative h-full flex flex-col">
      {/* Share notification popup */}
      {hasCopiedShare && (
        <div className="fixed top-4 left-1/2 transform -translate-x-1/2 z-50 px-4 py-2 bg-green-600 text-white rounded-lg shadow-lg transition-all duration-300 animate-[scaleIn_0.6s_ease-out_forwards]">
          <div className="flex items-center gap-2">
            <Icon icon={Icons.CHECKMARK} className="text-white" />
            <span className="text-sm font-medium">
              Link copied to clipboard!
            </span>
          </div>
        </div>
      )}

      {/* Trailer Overlay */}
      {showTrailer && imdbData?.trailer_url && (
        <TrailerOverlay
          trailerUrl={imdbData.trailer_url}
          onClose={() => setShowTrailer(false)}
        />
      )}

      {/* Backdrop - Even taller */}
      <div className="h-64 lg:h-80 xl:h-96 relative -mt-12">
        <div
          className="absolute inset-0 bg-cover bg-center"
          style={{
            backgroundImage: data.backdrop
              ? `url(${data.backdrop})`
              : undefined,
            maskImage:
              "linear-gradient(to top, rgba(0, 0, 0, 0), rgba(0, 0, 0, 1) 60px)",
            WebkitMaskImage:
              "linear-gradient(to top, rgba(0, 0, 0, 0), rgba(0, 0, 0, 1) 60px)",
          }}
        />
      </div>

      {/* Content */}
      <div className="px-6 pb-6 mt-[-70px] flex-grow">
        <DetailsHeader
          data={data}
          onPlayClick={handlePlayClick}
          onTrailerClick={() => setShowTrailer(true)}
          onShareClick={handleShareClick}
          showProgress={showProgress}
        />

        {/* Two Column Layout - Stacked on Mobile */}
        <div className="grid grid-cols-1 md:grid-cols-3 md:gap-6">
          {/* Left Column - Description */}
          <div className="md:col-span-2">
            {data.overview && (
              <p className="text-sm text-white/90 mb-6">{data.overview}</p>
            )}

            {/* Director and Cast */}
            <div className="space-y-4 mb-6">
              {data.director && (
                <div className="text-xs">
                  <span className="font-medium text-white/80">
                    {t("details.director")}
                  </span>{" "}
                  <span className="text-white/70">{data.director}</span>
                </div>
              )}
              {data.actors && data.actors.length > 0 && (
                <div className="text-xs">
                  <span className="font-medium text-white/80">
                    {t("details.cast")}
                  </span>{" "}
                  <span className="text-white/70">
                    {data.actors.join(", ")}
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* Right Column - Details */}
          <DetailsInfo data={data} imdbData={imdbData} rtData={rtData} />
        </div>

        {/* Episodes Carousel for TV Shows */}
        {data.type === "show" && data.seasonData && !minimal && (
          <EpisodeCarousel
            episodes={data.seasonData.episodes}
            showProgress={showProgress}
            progress={progress}
            selectedSeason={selectedSeason}
            onSeasonChange={setSelectedSeason}
            seasons={data.seasonData.seasons}
            mediaId={data.id}
            mediaTitle={data.title}
          />
        )}
      </div>
    </div>
  );
}
