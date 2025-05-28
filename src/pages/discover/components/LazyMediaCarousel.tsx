import { useEffect, useState } from "react";

import { useIntersectionObserver } from "@/pages/discover/hooks/useIntersectionObserver";
import { useLazyTMDBData } from "@/pages/discover/hooks/useTMDBData";
import { MediaItem } from "@/utils/mediaTypes";

import { MediaCarousel } from "./MediaCarousel";
import { Genre, Media, Movie, TVShow } from "../common";

interface LazyMediaCarouselProps {
  category?: {
    name: string;
    endpoint: string;
  };
  genre?: Genre;
  mediaType: "movie" | "tv";
  isMobile: boolean;
  carouselRefs: React.MutableRefObject<{
    [key: string]: HTMLDivElement | null;
  }>;
  onShowDetails?: (media: MediaItem) => void;
  preloadedMedia?: Movie[] | TVShow[];
  genreId?: number;
  title?: string;
}

export function LazyMediaCarousel({
  category,
  genre,
  mediaType,
  isMobile,
  carouselRefs,
  onShowDetails,
  preloadedMedia,
  genreId,
  title,
}: LazyMediaCarouselProps) {
  const [medias, setMedias] = useState<Media[]>([]);

  // Use intersection observer to detect when this component is visible
  const { targetRef, isIntersecting } = useIntersectionObserver(
    { rootMargin: "200px" }, // Load when within 200px of viewport
  );

  // Use the lazy loading hook only if we don't have preloaded media
  const { media, isLoading } = useLazyTMDBData(
    !preloadedMedia ? genre || null : null,
    !preloadedMedia ? category || null : null,
    mediaType,
    isIntersecting,
  );

  // Update medias when data is loaded or preloaded
  useEffect(() => {
    if (preloadedMedia) {
      setMedias(preloadedMedia);
    } else if (media.length > 0) {
      setMedias(media);
    }
  }, [media, preloadedMedia]);

  const categoryName = category?.name || genre?.name || title || "";
  const categorySlug = `${categoryName.toLowerCase().replace(/[^a-z0-9]+/g, "-")}-${mediaType}`;

  if (isLoading) {
    return (
      <div className="relative overflow-hidden carousel-container">
        <div id={`carousel-${categorySlug}`}>
          <h2 className="ml-2 md:ml-8 mt-2 text-2xl cursor-default font-bold text-white md:text-2xl mx-auto pl-5 text-balance">
            {categoryName} {mediaType === "tv" ? "Shows" : "Movies"}
          </h2>
          <div className="flex whitespace-nowrap pt-0 pb-4 overflow-auto scrollbar rounded-xl overflow-y-hidden h-[300px] animate-pulse bg-background-secondary/20">
            <div className="w-full text-center flex items-center justify-center">
              {isLoading ? "Loading..." : ""}
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div ref={targetRef as React.RefObject<HTMLDivElement>}>
      {isIntersecting ? (
        <MediaCarousel
          medias={medias}
          category={categoryName}
          isTVShow={mediaType === "tv"}
          isMobile={isMobile}
          carouselRefs={carouselRefs}
          onShowDetails={onShowDetails}
          genreId={genreId}
        />
      ) : (
        <div className="relative overflow-hidden carousel-container">
          <div id={`carousel-${categorySlug}`}>
            <h2 className="ml-2 md:ml-8 mt-2 text-2xl cursor-default font-bold text-white md:text-2xl mx-auto pl-5 text-balance">
              {categoryName} {mediaType === "tv" ? "Shows" : "Movies"}
            </h2>
            <div className="flex whitespace-nowrap pt-0 pb-4 overflow-auto scrollbar rounded-xl overflow-y-hidden h-[300px] animate-pulse bg-background-secondary/20">
              <div className="w-full text-center flex items-center justify-center">
                Loading...
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
