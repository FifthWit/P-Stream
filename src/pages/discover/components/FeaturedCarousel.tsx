import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";

import { getMediaLogo } from "@/backend/metadata/tmdb";
import { TMDBContentTypes } from "@/backend/metadata/types/tmdb";
import { Button } from "@/components/buttons/Button";
import { Icon, Icons } from "@/components/Icon";
import { Movie, TVShow } from "@/pages/discover/common";

export interface FeaturedMedia extends Partial<Movie & TVShow> {
  backdrop_path: string;
  overview: string;
  title?: string;
  name?: string;
  type: "movie" | "show";
}

interface FeaturedCarouselProps {
  media: FeaturedMedia[];
  onShowDetails: (media: FeaturedMedia) => void;
}

export function FeaturedCarousel({
  media,
  onShowDetails,
}: FeaturedCarouselProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isAutoPlaying, setIsAutoPlaying] = useState(true);
  const [logoUrl, setLogoUrl] = useState<string | undefined>();
  const [touchStart, setTouchStart] = useState<number | null>(null);
  const [touchEnd, setTouchEnd] = useState<number | null>(null);
  const autoPlayInterval = useRef<NodeJS.Timeout | null>(null);
  const navigate = useNavigate();

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

  return (
    <div
      className="relative h-[80vh] w-full overflow-hidden"
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
    >
      <div className="relative w-full h-full">
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
                "linear-gradient(to top, rgba(0, 0, 0, 0), rgba(0, 0, 0, 1) 100px)",
              WebkitMaskImage:
                "linear-gradient(to top, rgba(0, 0, 0, 0), rgba(0, 0, 0, 1) 100px)",
            }}
          />
        ))}
      </div>

      {/* Navigation Buttons */}
      <button
        type="button"
        onClick={handlePrevSlide}
        className="absolute left-4 top-1/2 -translate-y-1/2 z-20 p-2 rounded-full bg-black/30 hover:bg-black/50 transition-colors"
        aria-label="Previous slide"
      >
        <Icon icon={Icons.CHEVRON_LEFT} className="text-white w-8 h-8" />
      </button>
      <button
        type="button"
        onClick={handleNextSlide}
        className="absolute right-4 top-1/2 -translate-y-1/2 z-20 p-2 rounded-full bg-black/30 hover:bg-black/50 transition-colors"
        aria-label="Next slide"
      >
        <Icon icon={Icons.CHEVRON_RIGHT} className="text-white w-8 h-8" />
      </button>

      {/* Navigation Dots */}
      <div className="absolute bottom-8 left-1/2 -translate-x-1/2 z-20 flex gap-2">
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
      <div className="absolute inset-0 flex items-end pb-20 z-10">
        <div className="container mx-auto px-4">
          <div className="max-w-3xl">
            {logoUrl ? (
              <img
                src={logoUrl}
                alt={mediaTitle}
                className="max-w-[14rem] md:max-w-[22rem] max-h-[20dvh] object-contain drop-shadow-lg bg-transparent mb-4"
                style={{ background: "none" }}
              />
            ) : (
              <h1 className="text-4xl md:text-6xl font-bold text-white mb-4">
                {mediaTitle}
              </h1>
            )}
            <p className="text-lg text-white/80 mb-6 line-clamp-2">
              {currentMedia.overview}
            </p>
            <div
              className="flex gap-4"
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
                className="gap-2 h-12 rounded-lg px-6 py-2 transition-transform hover:scale-105 duration-100 text-md text-white flex items-center justify-center bg-buttons-purple bg-opacity-45 hover:bg-buttons-purpleHover hover:bg-opacity-25 backdrop-blur-md border-2 border-gray-400 border-opacity-20"
              >
                <Icon icon={Icons.PLAY} className="text-white" />
                <span className="text-white text-sm">Play Now</span>
              </Button>
              <Button
                onClick={() => onShowDetails(currentMedia)}
                theme="secondary"
                className="gap-2 h-12 rounded-lg px-6 py-2 transition-transform hover:scale-105 duration-100 text-md text-white flex items-center justify-center bg-buttons-purple bg-opacity-45 hover:bg-buttons-purpleHover hover:bg-opacity-25 backdrop-blur-md border-2 border-gray-400 border-opacity-20"
              >
                <Icon icon={Icons.CIRCLE_QUESTION} className="text-white" />
                <span className="text-white text-sm">More Info</span>
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
