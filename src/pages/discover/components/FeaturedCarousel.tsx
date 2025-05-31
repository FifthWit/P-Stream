import classNames from "classnames";
import { ReactNode, useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";

import { get, getMediaLogo } from "@/backend/metadata/tmdb";
import { TMDBContentTypes } from "@/backend/metadata/types/tmdb";
import { Button } from "@/components/buttons/Button";
import { Icon, Icons } from "@/components/Icon";
import { Movie, TVShow } from "@/pages/discover/common";
import { conf } from "@/setup/config";
import { useLanguageStore } from "@/stores/language";
import { usePreferencesStore } from "@/stores/preferences";
import { getTmdbLanguageCode } from "@/utils/language";

import { EDITOR_PICKS_MOVIES, EDITOR_PICKS_TV_SHOWS } from "../discoverContent";
import { useSelectedCategory } from "../hooks/useSelectedCategory";

export interface FeaturedMedia extends Partial<Movie & TVShow> {
  children?: ReactNode;
  backdrop_path: string;
  overview: string;
  title?: string;
  name?: string;
  type: "movie" | "show";
}

interface FeaturedCarouselProps {
  onShowDetails: (media: FeaturedMedia) => void;
  children?: ReactNode;
  searching?: boolean;
  shorter?: boolean;
  forcedCategory?: "movies" | "tvshows" | "editorpicks";
}

export function FeaturedCarousel({
  onShowDetails,
  children,
  searching,
  shorter,
  forcedCategory,
}: FeaturedCarouselProps) {
  const { selectedCategory } = useSelectedCategory();
  const effectiveCategory = forcedCategory || selectedCategory;
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isAutoPlaying, setIsAutoPlaying] = useState(true);
  const [logoUrl, setLogoUrl] = useState<string | undefined>();
  const [touchStart, setTouchStart] = useState<number | null>(null);
  const [touchEnd, setTouchEnd] = useState<number | null>(null);
  const [media, setMedia] = useState<FeaturedMedia[]>([]);
  const autoPlayInterval = useRef<NodeJS.Timeout | null>(null);
  const navigate = useNavigate();
  const enableImageLogos = usePreferencesStore(
    (state) => state.enableImageLogos,
  );
  const userLanguage = useLanguageStore.getState().language;
  const formattedLanguage = getTmdbLanguageCode(userLanguage);

  // Fetch featured media
  useEffect(() => {
    const fetchFeaturedMedia = async () => {
      try {
        if (effectiveCategory === "movies") {
          const data = await get<any>("/movie/popular", {
            api_key: conf().TMDB_READ_API_KEY,
            language: formattedLanguage,
          });
          setMedia(
            data.results.slice(0, 5).map((movie: any) => ({
              ...movie,
              type: "movie" as const,
            })),
          );
        } else if (effectiveCategory === "tvshows") {
          const data = await get<any>("/tv/popular", {
            api_key: conf().TMDB_READ_API_KEY,
            language: formattedLanguage,
          });
          setMedia(
            data.results.slice(0, 5).map((show: any) => ({
              ...show,
              type: "show" as const,
            })),
          );
        } else if (effectiveCategory === "editorpicks") {
          // Fetch editor picks movies
          const moviePromises = EDITOR_PICKS_MOVIES.slice(0, 3).map((item) =>
            get<any>(`/movie/${item.id}`, {
              api_key: conf().TMDB_READ_API_KEY,
              language: formattedLanguage,
            }),
          );

          // Fetch editor picks TV shows
          const showPromises = EDITOR_PICKS_TV_SHOWS.slice(0, 2).map((item) =>
            get<any>(`/tv/${item.id}`, {
              api_key: conf().TMDB_READ_API_KEY,
              language: formattedLanguage,
            }),
          );

          const [movieResults, showResults] = await Promise.all([
            Promise.all(moviePromises),
            Promise.all(showPromises),
          ]);

          const movies = movieResults.map((movie) => ({
            ...movie,
            type: "movie" as const,
          }));
          const shows = showResults.map((show) => ({
            ...show,
            type: "show" as const,
          }));

          // Combine and shuffle
          const combined = [...movies, ...shows].sort(
            () => 0.5 - Math.random(),
          );
          setMedia(combined);
        }
      } catch (error) {
        console.error("Error fetching featured media:", error);
      }
    };

    fetchFeaturedMedia();
  }, [formattedLanguage, effectiveCategory]);

  const handlePrevSlide = () => {
    setCurrentIndex((prev) => (prev - 1 + media.length) % media.length);
  };

  const handleNextSlide = () => {
    setCurrentIndex((prev) => (prev + 1) % media.length);
  };

  const handleTouchStart = (e: React.TouchEvent) => {
    setTouchStart(e.targetTouches[0].clientX);
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    setTouchEnd(e.targetTouches[0].clientX);
  };

  const handleTouchEnd = () => {
    if (!touchStart || !touchEnd) return;

    const distance = touchStart - touchEnd;
    const minSwipeDistance = 50;

    if (Math.abs(distance) > minSwipeDistance) {
      if (distance > 0) {
        handleNextSlide();
      } else {
        handlePrevSlide();
      }
    }

    setTouchStart(null);
    setTouchEnd(null);
  };

  // Fetch logo when current media changes
  useEffect(() => {
    const fetchLogo = async () => {
      if (!media[currentIndex]?.id) return;
      const logo = await getMediaLogo(
        media[currentIndex].id.toString(),
        media[currentIndex].type === "movie"
          ? TMDBContentTypes.MOVIE
          : TMDBContentTypes.TV,
      );
      setLogoUrl(logo);
    };
    fetchLogo();
  }, [currentIndex, media]);

  useEffect(() => {
    if (isAutoPlaying && media.length > 0) {
      autoPlayInterval.current = setInterval(() => {
        setCurrentIndex((prev) => (prev + 1) % media.length);
      }, 5000);
    }

    return () => {
      if (autoPlayInterval.current) {
        clearInterval(autoPlayInterval.current);
      }
    };
  }, [isAutoPlaying, media.length]);

  if (media.length === 0) return null;

  const currentMedia = media[currentIndex];
  const mediaTitle = currentMedia.title || currentMedia.name;

  let searchClasses = "";
  if (searching) searchClasses = "opacity-0 transition-opacity duration-300";
  else searchClasses = "opacity-100 transition-opacity duration-300";

  return (
    <div
      className={classNames(
        "relative w-full transition-[height] duration-300 ease-in-out",
        searching ? "h-24" : shorter ? "h-[75vh]" : "h-[75vh] md:h-[100vh]",
      )}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
    >
      <div
        className={classNames(
          "relative w-full h-full overflow-hidden",
          searchClasses,
        )}
      >
        {media.map((item, index) => (
          <div
            key={item.id}
            className={`absolute inset-0 transition-opacity duration-1000 ${
              index === currentIndex ? "opacity-100" : "opacity-0"
            }`}
            style={{
              backgroundImage: `url(https://image.tmdb.org/t/p/original${item.backdrop_path})`,
              backgroundSize: "cover",
              backgroundPosition: "center",
              maskImage:
                "linear-gradient(to top, rgba(0, 0, 0, 0), rgba(0, 0, 0, 1) 500px)",
              WebkitMaskImage:
                "linear-gradient(to top, rgba(0, 0, 0, 0), rgba(0, 0, 0, 1) 500px)",
            }}
          />
        ))}
      </div>

      {/* Navigation Buttons */}
      <button
        type="button"
        onClick={handlePrevSlide}
        className={classNames(
          "absolute left-4 top-1/2 -translate-y-1/2 z-20 p-2 rounded-full bg-black/30 hover:bg-black/50 transition-colors",
          searchClasses,
        )}
        aria-label="Previous slide"
      >
        <Icon icon={Icons.CHEVRON_LEFT} className="text-white w-8 h-8" />
      </button>
      <button
        type="button"
        onClick={handleNextSlide}
        className={classNames(
          "absolute right-4 top-1/2 -translate-y-1/2 z-20 p-2 rounded-full bg-black/30 hover:bg-black/50 transition-colors",
          searchClasses,
        )}
        aria-label="Next slide"
      >
        <Icon icon={Icons.CHEVRON_RIGHT} className="text-white w-8 h-8" />
      </button>

      {/* Navigation Dots */}
      <div
        className={classNames(
          "absolute bottom-8 left-1/2 -translate-x-1/2 z-[19] flex gap-2",
          searchClasses,
        )}
      >
        {media.map((item, index) => (
          <button
            key={`dot-${item.id}`}
            type="button"
            onClick={() => setCurrentIndex(index)}
            className={`w-2.5 h-2.5 rounded-full transition-all ${
              index === currentIndex
                ? "bg-white scale-125"
                : "bg-white/50 hover:bg-white/75"
            }`}
            aria-label={`Go to slide ${index + 1}`}
          />
        ))}
      </div>

      {/* Content Overlay */}
      <div
        className={classNames(
          "absolute inset-0 flex items-end pb-20 z-10",
          searchClasses,
        )}
      >
        <div className="container mx-auto px-8 md:px-4">
          <div className="max-w-3xl">
            {logoUrl && enableImageLogos ? (
              <img
                src={logoUrl}
                alt={mediaTitle}
                className="max-w-[14rem] md:max-w-[22rem] max-h-[20vh] object-contain drop-shadow-lg bg-transparent mb-6"
                style={{ background: "none" }}
              />
            ) : (
              <h1 className="text-4xl md:text-6xl font-bold text-white mb-4">
                {mediaTitle}
              </h1>
            )}
            <p className="text-lg text-white mb-6 line-clamp-2">
              {currentMedia.overview}
            </p>
            <div
              className="flex gap-4 justify-center items-center sm:justify-start"
              onMouseEnter={() => setIsAutoPlaying(false)}
              onMouseLeave={() => setIsAutoPlaying(true)}
            >
              <Button
                onClick={() =>
                  navigate(
                    `/media/tmdb-${currentMedia.type}-${currentMedia.id}-${mediaTitle?.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`,
                  )
                }
                theme="secondary"
                className="w-full sm:w-auto text-base"
              >
                <Icon icon={Icons.PLAY} className="text-white" />
                <span className="text-white">Play Now</span>
              </Button>
              <Button
                onClick={() => onShowDetails(currentMedia)}
                theme="secondary"
                className="w-full sm:w-auto text-base"
              >
                <Icon
                  icon={Icons.CIRCLE_QUESTION}
                  className="text-white scale-100"
                />
                <span className="text-white">More Info</span>
              </Button>
            </div>
          </div>
        </div>
      </div>
      {children && (
        <div className="absolute inset-0 pointer-events-none">
          <div className="pointer-events-auto z-50">{children}</div>
        </div>
      )}
    </div>
  );
}
