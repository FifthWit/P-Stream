import { useEffect, useState } from "react";

import { get } from "@/backend/metadata/tmdb";
import { useIntersectionObserver } from "@/pages/discover/hooks/useIntersectionObserver";
import { useLazyTMDBData } from "@/pages/discover/hooks/useTMDBData";
import { MediaItem } from "@/utils/mediaTypes";

import { MediaCarousel } from "./MediaCarousel";
import {
  Category,
  Genre,
  Media,
  Movie,
  TVShow,
  categories,
  tvCategories,
} from "../common";

interface LazyMediaCarouselProps {
  category?: Category;
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
  relatedButtons?: Array<{ name: string; id: string }>;
  onButtonClick?: (id: string, name: string) => void;
  moreContent?: boolean;
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
  relatedButtons,
  onButtonClick,
  moreContent,
}: LazyMediaCarouselProps) {
  const [medias, setMedias] = useState<Media[]>([]);
  const [loading, setLoading] = useState(!preloadedMedia);

  const categoryData = (mediaType === "movie" ? categories : tvCategories).find(
    (c: Category) => c.name === (category?.name || genre?.name || title || ""),
  );

  // Use intersection observer to detect when this component is visible
  const { targetRef, isIntersecting } = useIntersectionObserver(
    { rootMargin: "200px" }, // Load when within 200px of viewport
  );

  // Use the lazy loading hook only if we don't have preloaded media
  const { media } = useLazyTMDBData(
    !preloadedMedia ? genre || null : null,
    !preloadedMedia ? category || null : null,
    mediaType,
    isIntersecting,
  );

  // Update medias when data is loaded or preloaded
  useEffect(() => {
    if (preloadedMedia) {
      setMedias(preloadedMedia);
      setLoading(false);
    } else if (media.length > 0) {
      setMedias(media);
      setLoading(false);
    }
  }, [media, preloadedMedia]);

  // Only fetch category content if we don't have preloaded media
  useEffect(() => {
    if (preloadedMedia || !categoryData) return;

    const fetchContent = async () => {
      try {
        const data = await get<any>(categoryData.endpoint, {
          api_key: process.env.TMDB_READ_API_KEY,
          language: "en-US",
        });
        setMedias(data.results);
      } catch (error) {
        console.error("Error fetching content:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchContent();
  }, [categoryData, preloadedMedia]);

  const categoryName = category?.name || genre?.name || title || "";
  const categorySlug = `${categoryName.toLowerCase().replace(/[^a-z0-9]+/g, "-")}-${mediaType}`;

  if (loading) {
    return (
      <div className="flex items-center justify-between ml-2 md:ml-8 mt-2">
        <div className="flex gap-4 items-center">
          <h2 className="text-2xl cursor-default font-bold text-white md:text-2xl pl-5 text-balance">
            {categoryName}
          </h2>
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
          relatedButtons={relatedButtons}
          onButtonClick={onButtonClick}
          moreContent={moreContent}
          moreLink={
            categoryData
              ? `/discover/more/category/${categoryData.urlPath}/${categoryData.mediaType}`
              : undefined
          }
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
