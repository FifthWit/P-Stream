import classNames from "classnames";
import { t } from "i18next";
import { useEffect, useMemo, useRef, useState } from "react";
import { Helmet } from "react-helmet-async";
import { Trans } from "react-i18next";
import { Link } from "react-router-dom";
import { useCopyToClipboard } from "react-use";

import {
  getMediaBackdrop,
  getMediaDetails,
  getMediaLogo,
} from "@/backend/metadata/tmdb";
import {
  TMDBContentTypes,
  TMDBMovieData,
  TMDBShowData,
} from "@/backend/metadata/types/tmdb";
import { Dropdown } from "@/components/form/Dropdown";
import { Icon, Icons } from "@/components/Icon";
import { MediaBookmarkButton } from "@/components/media/MediaBookmark";
import { hasAired } from "@/components/player/utils/aired";
import { useLanguageStore } from "@/stores/language";
import { usePreferencesStore } from "@/stores/preferences";
import { useProgressStore } from "@/stores/progress";
import { shouldShowProgress } from "@/stores/progress/utils";
import { scrapeIMDb } from "@/utils/imdbScraper";
import { getTmdbLanguageCode } from "@/utils/language";
import { getRTIcon, scrapeRottenTomatoes } from "@/utils/rottenTomatoesScraper";

import { useModal } from "./Modal";
import { OverlayPortal } from "./OverlayDisplay";
import { Button } from "../buttons/Button";
import { IconPatch } from "../buttons/IconPatch";
import { Flare } from "../utils/Flare";

function DetailsSkeleton() {
  return (
    <div className="animate-pulse">
      <div className="relative">
        {/* Backdrop */}
        <div className="h-64 relative -mt-12">
          <div
            className="absolute inset-0 bg-mediaCard-hoverBackground"
            style={{
              maskImage:
                "linear-gradient(to top, rgba(0, 0, 0, 0), rgba(0, 0, 0, 1) 60px)",
              WebkitMaskImage:
                "linear-gradient(to top, rgba(0, 0, 0, 0), rgba(0, 0, 0, 1) 60px)",
            }}
          />
        </div>
        {/* Content */}
        <div className="px-6 pb-6 mt-[-30px]">
          <div className="h-8 w-3/4 bg-white/10 rounded mb-3" /> {/* Title */}
          <div className="space-y-2 mb-6">
            {/* Description */}
            <div className="h-4 bg-white/10 rounded w-full" />
            <div className="h-4 bg-white/10 rounded w-full" />
            <div className="h-4 bg-white/10 rounded w-full" />
            <div className="h-4 bg-white/10 rounded w-3/4" />
          </div>
          {/* Additional details */}
          <div className="grid grid-cols-2 gap-3 mb-6">
            <div className="h-4 bg-white/10 rounded w-3/4" />
            <div className="h-4 bg-white/10 rounded w-3/4" />
            <div className="h-4 bg-white/10 rounded w-3/4" />
            <div className="h-4 bg-white/10 rounded w-3/4" />
          </div>
          {/* Genres */}
          <div className="flex flex-wrap gap-2">
            <div className="h-6 w-20 bg-white/10 rounded-full" />
            <div className="h-6 w-24 bg-white/10 rounded-full" />
            <div className="h-6 w-16 bg-white/10 rounded-full" />
          </div>
        </div>
      </div>
    </div>
  );
}

interface DetailsContent {
  title: string;
  overview?: string;
  backdrop?: string;
  runtime?: number | null;
  genres?: Array<{ id: number; name: string }>;
  language?: string;
  voteAverage?: number;
  voteCount?: number;
  releaseDate?: string;
  rating?: string;
  director?: string;
  actors?: string[];
  type?: "movie" | "show";
  id?: number;
  episodes?: number;
  seasons?: number;
  imdbId?: string;
  episode?: {
    id: number;
    number: number;
  };
  seasonData?: {
    seasons: Array<{
      id: number;
      season_number: number;
      name: string;
      episode_count: number;
      overview: string;
      air_date: string;
      poster_path: string | null;
    }>;
    episodes: Array<{
      id: number;
      name: string;
      overview: string;
      episode_number: number;
      season_number: number;
      still_path: string | null;
      air_date: string;
      vote_average: number;
      vote_count: number;
    }>;
  };
  logoUrl?: string;
}

function DetailsContent({
  data,
  minimal = false,
}: {
  data: DetailsContent;
  minimal?: boolean;
}) {
  const [imdbData, setImdbData] = useState<any>(null);
  const [rtData, setRtData] = useState<any>(null);
  const [, setIsLoadingImdb] = useState(false);
  const [isMuted, setIsMuted] = useState(true);
  const [isPaused, setIsPaused] = useState(false);
  const [showEpisodeMenu, setShowEpisodeMenu] = useState(false);
  const [customSeason, setCustomSeason] = useState("");
  const [customEpisode, setCustomEpisode] = useState("");
  const episodeMenuRef = useRef<HTMLDivElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const progress = useProgressStore((s) => s.items);
  const carouselRef = useRef<HTMLDivElement>(null);
  const activeEpisodeRef = useRef<HTMLAnchorElement>(null);
  const [showVolumeBar, setShowVolumeBar] = useState(false);
  const [volume, setVolume] = useState(0.5);

  const enableImageLogos = usePreferencesStore(
    (state) => state.enableImageLogos,
  );
  const [, copyToClipboard] = useCopyToClipboard();
  const [hasCopiedShare, setHasCopiedShare] = useState(false);

  const showProgress = useMemo(() => {
    if (!data.id) return null;
    const item = progress[data.id.toString()];
    if (!item) return null;
    return shouldShowProgress(item);
  }, [data.id, progress]);

  // Set initial season based on current episode
  const [selectedSeason, setSelectedSeason] = useState<number>(() => {
    if (showProgress?.season?.number) {
      return showProgress.season.number;
    }
    return 1;
  });

  // Update selected season when showProgress changes
  useEffect(() => {
    if (showProgress?.season?.number) {
      setSelectedSeason(showProgress.season.number);
    }
  }, [showProgress]);

  const toggleMute = () => {
    if (videoRef.current) {
      const newMuted = !videoRef.current.muted;
      videoRef.current.muted = newMuted;
      setIsMuted(newMuted);
      setShowVolumeBar(!newMuted);
    }
  };

  const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newVolume = parseFloat(e.target.value);
    setVolume(newVolume);
    if (videoRef.current) {
      videoRef.current.volume = newVolume;
      if (newVolume === 0) {
        videoRef.current.muted = true;
        setIsMuted(true);
        setShowVolumeBar(false);
      } else {
        videoRef.current.muted = false;
        setIsMuted(false);
        setShowVolumeBar(true);
      }
    }
  };

  // Hide volume bar after 2 seconds of inactivity
  useEffect(() => {
    if (!showVolumeBar || isMuted) return;
    const timeout = setTimeout(() => setShowVolumeBar(false), 2000);
    return () => clearTimeout(timeout);
  }, [showVolumeBar, isMuted, volume]);

  // Hide volume bar when clicking outside
  useEffect(() => {
    if (!showVolumeBar) return;
    const handleClick = (e: MouseEvent) => {
      const bar = document.getElementById("vertical-volume-bar");
      if (bar && !bar.contains(e.target as Node)) {
        setShowVolumeBar(false);
      }
    };
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [showVolumeBar]);

  const togglePlay = () => {
    if (videoRef.current) {
      if (videoRef.current.paused) {
        videoRef.current.play();
        setIsPaused(false);
      } else {
        videoRef.current.pause();
        setIsPaused(true);
      }
    }
  };

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

  const formatRuntime = (minutes?: number | null) => {
    if (!minutes) return null;
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return hours > 0 ? `${hours}h ${mins}m` : `${mins}m`;
  };

  const getEndTime = (runtime?: number | null) => {
    if (!runtime) return null;
    const now = new Date();
    const endTime = new Date(now.getTime() + runtime * 60000);
    return endTime.toLocaleTimeString("en-US", {
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
    });
  };

  const formatVoteCount = (count?: number) => {
    if (!count) return "0";
    if (count >= 1000) {
      return `${Math.floor(count / 1000)}K+`;
    }
    return count.toString();
  };

  const formatDate = (dateString?: string) => {
    if (!dateString) return null;
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  };

  // Function to get color based on rating
  const getRatingColor = (rating: number) => {
    if (rating >= 8) return "bg-green-500";
    if (rating >= 6) return "bg-yellow-500";
    if (rating >= 4) return "bg-orange-500";
    return "bg-red-500";
  };

  const handleScroll = (direction: "left" | "right") => {
    if (!carouselRef.current) return;

    const cardWidth = 256; // w-64 in pixels
    const cardSpacing = 16; // space-x-4 in pixels
    const scrollAmount = (cardWidth + cardSpacing) * 2;

    const newScrollPosition =
      carouselRef.current.scrollLeft +
      (direction === "left" ? -scrollAmount : scrollAmount);

    carouselRef.current.scrollTo({
      left: newScrollPosition,
      behavior: "smooth",
    });
  };

  const currentSeasonEpisodes = data.seasonData?.episodes.filter(
    (ep) => ep.season_number === selectedSeason,
  );

  // Function to generate the episode URL
  const getEpisodeUrl = (episode: any) => {
    // Find the season ID for the current season
    const season = data.seasonData?.seasons.find(
      (s) => s.season_number === selectedSeason,
    );

    if (!season || !data.id) return "#";

    // Create the URL in the format: /media/tmdb-tv-{showId}-{showName}/{seasonId}/{episodeId}
    return `/media/tmdb-tv-${data.id}-${data.title.toLowerCase().replace(/[^a-z0-9]+/g, "-")}/${season.id}/${episode.id}`;
  };

  useEffect(() => {
    if (carouselRef.current) {
      if (activeEpisodeRef.current) {
        // If there's an active episode, scroll to it
        const containerLeft = carouselRef.current.getBoundingClientRect().left;
        const containerWidth = carouselRef.current.clientWidth;
        const elementLeft =
          activeEpisodeRef.current.getBoundingClientRect().left;
        const elementWidth = activeEpisodeRef.current.clientWidth;

        const scrollPosition =
          elementLeft - containerLeft - containerWidth / 2 + elementWidth / 2;

        carouselRef.current.scrollTo({
          left: carouselRef.current.scrollLeft + scrollPosition,
          behavior: "smooth",
        });
      } else {
        // If no active episode, scroll to the start
        carouselRef.current.scrollTo({
          left: 0,
          behavior: "smooth",
        });
      }
    }
  }, [currentSeasonEpisodes, showProgress]);

  useEffect(() => {
    if (videoRef.current) {
      videoRef.current.volume = 0.4;
    }
  }, []);

  // Add click outside handler for episode menu
  useEffect(() => {
    if (!showEpisodeMenu) return;

    const handleClickOutside = (event: MouseEvent) => {
      if (
        episodeMenuRef.current &&
        !episodeMenuRef.current.contains(event.target as Node)
      ) {
        setShowEpisodeMenu(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [showEpisodeMenu]);

  const handleCustomNavigation = () => {
    const season = parseInt(customSeason, 10);
    const episode = parseInt(customEpisode, 10);

    if (Number.isNaN(season) || Number.isNaN(episode) || !data.id) return;

    // Find the season
    const seasonData = data.seasonData?.seasons.find(
      (s) => s.season_number === season,
    );
    if (!seasonData) return;

    // Find the episode
    const episodeData = data.seasonData?.episodes.find(
      (e) => e.season_number === season && e.episode_number === episode,
    );
    if (!episodeData) return;

    // Navigate to the episode
    window.location.assign(
      `/media/tmdb-tv-${data.id}-${data.title.toLowerCase().replace(/[^a-z0-9]+/g, "-")}/${seasonData.id}/${episodeData.id}`,
    );
    setShowEpisodeMenu(false);
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

      {/* Backdrop - Even taller */}
      <div className="h-64 lg:h-80 xl:h-96 relative -mt-12">
        {imdbData?.trailer_url ? (
          <div
            className="absolute inset-0"
            style={{
              maskImage:
                "linear-gradient(to top, rgba(0, 0, 0, 0), rgba(0, 0, 0, 1) 60px)",
              WebkitMaskImage:
                "linear-gradient(to top, rgba(0, 0, 0, 0), rgba(0, 0, 0, 1) 60px)",
            }}
          >
            <video
              ref={videoRef}
              className="absolute inset-0 w-full h-full object-cover cursor-pointer"
              autoPlay
              loop
              muted={isMuted}
              playsInline
              poster={data.backdrop}
              onClick={togglePlay}
            >
              <source src={imdbData.trailer_url} type="video/mp4" />
            </video>
            <div className="absolute top-4 left-4 z-10 flex flex-col items-center">
              <button
                type="button"
                onClick={toggleMute}
                onMouseEnter={() => !isMuted && setShowVolumeBar(true)}
                className="p-2 bg-black/50 hover:bg-black/70 rounded-full transition-colors"
                title={isMuted ? "Unmute" : "Mute"}
              >
                <Icon
                  icon={isMuted ? Icons.VOLUME_X : Icons.VOLUME}
                  className="text-white"
                />
              </button>
              {/* Volume Bar */}
              {showVolumeBar && !isMuted && (
                <div
                  id="vertical-volume-bar"
                  className="mt-2 h-32 w-8 bg-black/70 rounded-full flex items-center justify-center relative shadow-lg"
                  style={{
                    transition: "opacity 0.2s",
                  }}
                >
                  <input
                    type="range"
                    min={0}
                    max={1}
                    step={0.01}
                    value={volume}
                    onChange={handleVolumeChange}
                    className="absolute left-1/2 -translate-x-1/2 w-24 h-1.5 rotate-[-90deg] bg-mediaCard-barColor accent-mediaCard-barColor cursor-pointer"
                    style={{
                      position: "absolute",
                      top: "50%",
                      left: "50%",
                      transform: "translate(-50%, -50%) rotate(-90deg)",
                      width: "100px",
                    }}
                  />
                </div>
              )}
            </div>
            {isPaused && (
              <button
                type="button"
                onClick={togglePlay}
                className="absolute inset-0 flex items-center justify-center z-10"
              >
                <Icon icon={Icons.PLAY} className="text-white text-4xl" />
              </button>
            )}
          </div>
        ) : (
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
        )}
      </div>
      {/* Content */}
      <div
        className={classNames(
          "px-6 pb-6 flex-grow relative",
          enableImageLogos ? "-mt-32" : "",
        )}
      >
        {/* Title and Genres Row */}
        <div className="pb-4 relative z-10">
          {data.logoUrl && enableImageLogos ? (
            <img
              src={data.logoUrl}
              alt={data.title}
              className="max-w-[12rem] md:max-w-[20rem] max-h-[14vh] object-contain drop-shadow-lg bg-transparent"
              style={{ background: "none" }}
            />
          ) : (
            <h3 className="text-3xl font-bold text-white z-[999]">
              {data.title}
            </h3>
          )}
        </div>
        <div className="flex flex-col sm:flex-row justify-between items-start mb-6 w-full">
          <div className="flex items-center gap-4 w-full sm:w-auto">
            {!minimal && (
              <Button
                onClick={() => {
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
                }}
                theme="purple"
                className={classNames(
                  "flex-1 sm:flex-initial sm:w-auto",
                  "gap-2 h-12 rounded-lg px-4 py-2 my-1 transition-transform hover:scale-105 duration-100",
                  "text-md text-white flex items-center justify-center",
                )}
              >
                <Icon icon={Icons.PLAY} className="text-white" />
                <span className="text-white text-sm pr-1">
                  {data.type === "movie"
                    ? !data.releaseDate ||
                      new Date(data.releaseDate) > new Date()
                      ? t("media.unreleased")
                      : showProgress
                        ? t("details.resume")
                        : t("details.play")
                    : showProgress
                      ? t("details.resume")
                      : t("details.play")}
                </span>
              </Button>
            )}
            <div className="flex items-center gap-1 flex-shrink-0">
              <MediaBookmarkButton
                media={{
                  id: data.id?.toString() || "",
                  title: data.title,
                  year: data.releaseDate
                    ? new Date(data.releaseDate).getFullYear()
                    : undefined,
                  poster: data.backdrop,
                  type: data.type || "movie",
                }}
              />
              <button
                type="button"
                onClick={handleShareClick}
                className="p-2 opacity-75 transition-opacity duration-300 hover:scale-110 hover:cursor-pointer hover:opacity-95"
                title="Share"
              >
                <IconPatch
                  icon={Icons.IOS_SHARE}
                  className="transition-transform duration-300 hover:scale-110 hover:cursor-pointer"
                />
              </button>
            </div>
          </div>

          {/* Genres on the right side of the button row for larger screens */}
          {data.genres && data.genres.length > 0 && (
            <div className="hidden sm:flex flex-wrap gap-2 justify-end z-[999] items-center">
              {data.genres.map((genre, index) => (
                <span
                  key={genre.id}
                  className="text-[11px] px-2 py-0.5 rounded-full bg-white/20 text-white/80 transition-all duration-300 hover:scale-110 animate-[scaleIn_0.6s_ease-out_forwards]"
                  style={{
                    animationDelay: `${((data.genres?.length ?? 0) - 1 - index) * 60}ms`,
                    transform: "scale(0)",
                    opacity: 0,
                  }}
                >
                  {genre.name}
                </span>
              ))}
            </div>
          )}
        </div>

        {/* Genres below for small screens */}
        {data.genres && data.genres.length > 0 && (
          <div className="flex sm:hidden flex-wrap gap-2 justify-start z-[999] items-center mb-6 -mt-3">
            {data.genres.map((genre, index) => (
              <span
                key={genre.id}
                className="text-[11px] px-2 py-0.5 rounded-full bg-white/20 text-white/80 transition-all duration-300 hover:scale-110 animate-[scaleIn_0.6s_ease-out_forwards]"
                style={{
                  animationDelay: `${((data.genres?.length ?? 0) - 1 - index) * 60}ms`,
                  transform: "scale(0)",
                  opacity: 0,
                }}
              >
                {genre.name}
              </span>
            ))}
          </div>
        )}

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
          <div className="md:col-span-1 bg-video-context-border p-4 rounded-lg border-buttons-primary bg-opacity-80">
            <div className="space-y-3 text-xs">
              {data.runtime && (
                <div className="flex flex-wrap items-center gap-2 text-white/80">
                  <div className="flex items-center gap-1">
                    <span className="font-medium">{t("details.runtime")}</span>{" "}
                    {formatRuntime(data.runtime)}
                  </div>
                  {data.type === "movie" && (
                    <div className="flex items-center gap-1">
                      <span className="hidden lg:inline mx-1">•</span>
                      <Trans
                        i18nKey="details.endsAt"
                        className="font-medium"
                        values={{ time: getEndTime(data.runtime) }}
                      />
                    </div>
                  )}
                </div>
              )}
              {data.language && (
                <div className="flex items-center gap-1 text-white/80">
                  <span className="font-medium">{t("details.language")}</span>{" "}
                  {data.language.toUpperCase()}
                </div>
              )}
              {data.releaseDate && (
                <div className="flex items-center gap-1 text-white/80">
                  <span className="font-medium">
                    {t("details.releaseDate")}
                  </span>{" "}
                  {formatDate(data.releaseDate)}
                </div>
              )}
              {data.rating && (
                <div className="flex items-center gap-1 text-white/80">
                  <span className="font-medium">{t("details.rating")}</span>{" "}
                  {data.rating}
                </div>
              )}
              {/* Rating and External Links Section */}
              <div className="space-y-1">
                {data.voteAverage !== undefined &&
                  data.voteCount !== undefined &&
                  data.voteCount > 0 && (
                    <>
                      <div className="flex items-center gap-1 text-white/80">
                        <span className="font-medium">
                          {t("details.rating")}
                        </span>{" "}
                        <span className="text-white/90">
                          {imdbData?.imdb_rating
                            ? `${imdbData.imdb_rating.toFixed(1)}/10 (IMDb)`
                            : `${data.voteAverage.toFixed(1)}/10 (TMDB)`}
                        </span>
                      </div>
                      {/* Rating Progress Bar */}
                      <div className="w-full h-2 bg-white/10 rounded-full overflow-hidden">
                        <div
                          className={`h-full ${getRatingColor(imdbData?.imdb_rating || data.voteAverage)} transition-all duration-500`}
                          style={{
                            width: `${((imdbData?.imdb_rating || data.voteAverage) / 10) * 100}%`,
                          }}
                        />
                      </div>
                      <div className="text-white/60 text-[10px] text-right">
                        {formatVoteCount(imdbData?.votes || data.voteCount)}{" "}
                        {t("details.votes")}
                      </div>
                    </>
                  )}

                {/* External Links - Now outside the vote count condition */}
                <div className="flex gap-3 mt-2">
                  {data.id && (
                    <a
                      href={`https://www.themoviedb.org/${data.type === "show" ? "tv" : "movie"}/${data.id}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="w-8 h-8 rounded-full bg-[#0d253f] flex items-center justify-center transition-transform hover:scale-110"
                      title={t("details.tmdb")}
                    >
                      <Icon icon={Icons.TMDB} className="text-white" />
                    </a>
                  )}
                  {data.imdbId && (
                    <a
                      href={`https://www.imdb.com/title/${data.imdbId}`}
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
                        <div
                          className="flex items-center gap-1"
                          title="Tomatometer"
                        >
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
            </div>
          </div>
        </div>

        {/* Episodes Carousel for TV Shows */}
        {data.type === "show" && data.seasonData && !minimal && (
          <div className="mt-6 md:mt-0">
            {/* Season Selector */}
            <div className="flex justify-between items-center mb-3">
              <div className="flex items-center gap-3">
                <h4 className="text-lg font-semibold text-white">
                  {t("details.episodes")}
                </h4>
                <div className="relative">
                  <button
                    type="button"
                    onClick={() => setShowEpisodeMenu(!showEpisodeMenu)}
                    className="p-2 rounded-full hover:bg-white/10 transition-colors"
                    title={t("details.goToEpisode")}
                  >
                    <Icon icon={Icons.SEARCH} className="text-white/80" />
                  </button>

                  {/* Episode Selection Menu */}
                  {showEpisodeMenu && (
                    <div
                      ref={episodeMenuRef}
                      className="absolute top-full left-0 mt-2 p-4 bg-background-main rounded-lg shadow-lg border border-white/10 z-50 min-w-[250px]"
                    >
                      <div className="space-y-4">
                        <div>
                          <label className="block text-sm text-white/80 mb-1">
                            {t("details.season")}
                          </label>
                          <input
                            type="number"
                            value={customSeason}
                            onChange={(e) => setCustomSeason(e.target.value)}
                            min="1"
                            max={data.seasonData.seasons.length}
                            className="w-full px-3 py-2 bg-white/5 rounded border border-white/10 text-white focus:outline-none focus:border-white/30"
                            placeholder={t("details.season")}
                          />
                        </div>
                        <div>
                          <label className="block text-sm text-white/80 mb-1">
                            {t("details.episode")}
                          </label>
                          <input
                            type="number"
                            value={customEpisode}
                            onChange={(e) => setCustomEpisode(e.target.value)}
                            min="1"
                            className="w-full px-3 py-2 bg-white/5 rounded border border-white/10 text-white focus:outline-none focus:border-white/30"
                            placeholder={t("details.episode")}
                          />
                        </div>
                        <Button
                          theme="purple"
                          onClick={handleCustomNavigation}
                          className="w-full px-4 py-2"
                        >
                          {t("details.play")}
                        </Button>
                      </div>
                    </div>
                  )}
                </div>
              </div>
              <Dropdown
                options={data.seasonData.seasons.map((season) => ({
                  id: season.season_number.toString(),
                  name: `${t("details.season")} ${season.season_number}`,
                }))}
                selectedItem={{
                  id: selectedSeason.toString(),
                  name: `${t("details.season")} ${selectedSeason}`,
                }}
                setSelectedItem={(item) => setSelectedSeason(Number(item.id))}
              />
            </div>

            {/* Episodes Carousel */}
            <div className="relative">
              {/* Left scroll button */}
              <div className="absolute left-0 top-1/2 transform -translate-y-1/2 z-10 px-4 hidden lg:block">
                <button
                  type="button"
                  className="p-2 bg-black/80 hover:bg-video-context-hoverColor transition-colors rounded-full border border-video-context-border backdrop-blur-sm"
                  onClick={() => handleScroll("left")}
                >
                  <Icon icon={Icons.CHEVRON_LEFT} className="text-white/80" />
                </button>
              </div>

              <div
                ref={carouselRef}
                className="flex overflow-x-auto space-x-4 pb-4 pt-2 lg:px-12 scrollbar-hide carousel-container"
                style={{
                  scrollbarWidth: "none",
                  msOverflowStyle: "none",
                }}
              >
                {/* Add padding before the first card */}
                <div className="flex-shrink-0 w-4" />

                {currentSeasonEpisodes?.map((episode) => {
                  const isActive =
                    showProgress?.episode?.id === episode.id.toString();
                  const episodeProgress =
                    progress[data.id?.toString() ?? ""]?.episodes?.[episode.id];
                  const percentage = episodeProgress
                    ? (episodeProgress.progress.watched /
                        episodeProgress.progress.duration) *
                      100
                    : 0;
                  const isAired = hasAired(episode.air_date);

                  return (
                    <Link
                      key={episode.id}
                      to={getEpisodeUrl(episode)}
                      ref={isActive ? activeEpisodeRef : null}
                      className={classNames(
                        "flex-shrink-0 w-52 md:w-64 rounded-lg overflow-hidden transition-all duration-200 relative cursor-pointer hover:scale-95",
                        isActive
                          ? "bg-video-context-hoverColor/50 hover:bg-white/5"
                          : "hover:bg-white/5",
                        !isAired ? "opacity-50" : "",
                      )}
                    >
                      {/* Thumbnail */}
                      <div className="relative aspect-video w-full bg-video-context-hoverColor">
                        {episode.still_path ? (
                          <img
                            src={`https://image.tmdb.org/t/p/w300${episode.still_path}`}
                            alt={episode.name}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center bg-black bg-opacity-50">
                            <Icon
                              icon={Icons.FILM}
                              className="text-video-context-type-main opacity-50 text-3xl"
                            />
                          </div>
                        )}

                        {/* Episode Number Badge */}
                        <div className="absolute top-2 left-2 flex items-center space-x-2">
                          <span className="p-0.5 px-2 rounded inline bg-video-context-hoverColor bg-opacity-80 text-video-context-type-main text-sm">
                            {t("media.episodeShort")}
                            {episode.episode_number}
                          </span>
                          {!isAired && (
                            <span className="text-video-context-type-main/70 text-sm">
                              {episode.air_date
                                ? `(${t("details.airs")} - ${new Date(episode.air_date).toLocaleDateString()})`
                                : `(${t("media.unreleased")})`}
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Content */}
                      <div className="p-3">
                        <h3 className="font-bold text-white line-clamp-1">
                          {episode.name}
                        </h3>
                        {episode.overview && (
                          <p className="text-sm text-white/80 mt-1.5 line-clamp-2">
                            {episode.overview}
                          </p>
                        )}
                      </div>

                      {/* Progress Bar */}
                      {percentage > 0 && (
                        <div className="absolute bottom-0 left-0 right-0 h-1 bg-progress-background/25">
                          <div
                            className="h-full bg-progress-filled"
                            style={{
                              width: `${percentage > 98 ? 100 : percentage}%`,
                            }}
                          />
                        </div>
                      )}
                    </Link>
                  );
                })}

                {/* Add padding after the last card */}
                <div className="flex-shrink-0 w-4" />
              </div>

              {/* Right scroll button */}
              <div className="absolute right-0 top-1/2 transform -translate-y-1/2 z-10 px-4 hidden lg:block">
                <button
                  type="button"
                  className="p-2 bg-black/80 hover:bg-video-context-hoverColor transition-colors rounded-full border border-video-context-border backdrop-blur-sm"
                  onClick={() => handleScroll("right")}
                >
                  <Icon icon={Icons.CHEVRON_RIGHT} className="text-white/80" />
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export function DetailsModal(props: {
  id: string;
  data?: {
    id: number;
    type: "movie" | "show";
  };
  minimal?: boolean;
}) {
  const modal = useModal(props.id);
  const [detailsData, setDetailsData] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    const fetchDetails = async () => {
      if (!props.data?.id || !props.data?.type) return;

      setIsLoading(true);
      try {
        const type =
          props.data.type === "movie"
            ? TMDBContentTypes.MOVIE
            : TMDBContentTypes.TV;
        const details = await getMediaDetails(props.data.id.toString(), type);
        const backdropUrl = getMediaBackdrop(details.backdrop_path);
        const logoUrl = await getMediaLogo(props.data.id.toString(), type);
        if (type === TMDBContentTypes.MOVIE) {
          const movieDetails = details as TMDBMovieData;
          setDetailsData({
            title: movieDetails.title,
            overview: movieDetails.overview,
            backdrop: backdropUrl,
            runtime: movieDetails.runtime,
            genres: movieDetails.genres,
            language: movieDetails.original_language,
            voteAverage: movieDetails.vote_average,
            voteCount: movieDetails.vote_count,
            releaseDate: movieDetails.release_date,
            rating: movieDetails.release_dates?.results?.find(
              (r) => r.iso_3166_1 === "US",
            )?.release_dates?.[0]?.certification,
            director: movieDetails.credits?.crew?.find(
              (person) => person.job === "Director",
            )?.name,
            actors: movieDetails.credits?.cast
              ?.slice(0, 5)
              .map((actor) => actor.name),
            type: "movie",
            id: movieDetails.id,
            imdbId: movieDetails.external_ids?.imdb_id,
            logoUrl,
          });
        } else {
          const showDetails = details as TMDBShowData & {
            episodes: Array<{
              id: number;
              name: string;
              episode_number: number;
              overview: string;
              still_path: string | null;
              air_date: string;
              season_number: number;
            }>;
          };
          setDetailsData({
            title: showDetails.name,
            overview: showDetails.overview,
            backdrop: backdropUrl,
            episodes: showDetails.number_of_episodes,
            seasons: showDetails.number_of_seasons,
            genres: showDetails.genres,
            language: showDetails.original_language,
            voteAverage: showDetails.vote_average,
            voteCount: showDetails.vote_count,
            releaseDate: showDetails.first_air_date,
            rating: showDetails.content_ratings?.results?.find(
              (r) => r.iso_3166_1 === "US",
            )?.rating,
            director: showDetails.credits?.crew?.find(
              (person) => person.job === "Director",
            )?.name,
            actors: showDetails.credits?.cast
              ?.slice(0, 5)
              .map((actor) => actor.name),
            type: "show",
            id: showDetails.id,
            imdbId: showDetails.external_ids?.imdb_id,
            seasonData: {
              seasons: showDetails.seasons,
              episodes: showDetails.episodes,
            },
            logoUrl,
          });
        }
      } catch (err) {
        console.error("Failed to fetch media details:", err);
      } finally {
        setIsLoading(false);
      }
    };

    if (modal.isShown && props.data?.id) {
      fetchDetails();
    }
  }, [modal.isShown, props.data]);

  useEffect(() => {
    if (modal.isShown && !props.data?.id && !isLoading) {
      modal.hide();
    }
  }, [modal, props.data, isLoading]);

  return (
    <OverlayPortal darken close={modal.hide} show={modal.isShown}>
      <Helmet>
        <html data-no-scroll />
      </Helmet>
      <div className="flex absolute inset-0 items-center justify-center">
        <Flare.Base
          className={classNames(
            "group -m-[0.705em] rounded-3xl bg-background-main transition-colors duration-300 focus:relative focus:z-10",
            "max-h-[900px] max-w-[1200px]",
            "bg-mediaCard-hoverBackground bg-opacity-60 backdrop-filter backdrop-blur-lg shadow-lg overflow-hidden",
            props.minimal
              ? "h-[90%] md:h-[70%] lg:h-fit w-[90%] md:w-[70%] lg:w-[50%]"
              : "h-[90%] w-[90%] md:w-[70%] lg:w-[60%]",
          )}
        >
          <div className="transition-transform duration-300 h-full">
            <Flare.Light
              flareSize={300}
              cssColorVar="--colors-mediaCard-hoverAccent"
              backgroundClass="bg-mediaCard-hoverBackground duration-100"
              className="rounded-3xl bg-background-main group-hover:opacity-100"
            />
            <Flare.Child className="pointer-events-auto relative h-full overflow-y-auto scrollbar-none select-text">
              <div className="absolute right-4 top-4 z-10">
                <button
                  type="button"
                  className="text-s font-semibold text-type-secondary hover:text-white transition-transform hover:scale-95 select-none"
                  onClick={modal.hide}
                >
                  <IconPatch icon={Icons.X} />
                </button>
              </div>
              <div className="pt-12 select-text">
                {isLoading || !detailsData ? (
                  <DetailsSkeleton />
                ) : (
                  <DetailsContent data={detailsData} minimal={props.minimal} />
                )}
              </div>
            </Flare.Child>
          </div>
        </Flare.Base>
      </div>
    </OverlayPortal>
  );
}
