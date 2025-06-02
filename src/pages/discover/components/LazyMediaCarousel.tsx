import { useEffect, useRef, useState } from "react";

import { get } from "@/backend/metadata/tmdb";
import { useIntersectionObserver } from "@/pages/discover/hooks/useIntersectionObserver";
import { useLazyTMDBData } from "@/pages/discover/hooks/useTMDBData";
import { MediaItem } from "@/utils/mediaTypes";

import { MediaCarousel } from "./MediaCarousel";
import {
  Category,
  Media,
  Movie,
  TVShow,
  categories,
  tvCategories,
} from "../common";

interface LazyMediaCarouselProps {
  medias?: Media[];
  category?: string;
  isTVShow: boolean;
  carouselRefs: React.MutableRefObject<{
    [key: string]: HTMLDivElement | null;
  }>;
  onShowDetails?: (media: MediaItem) => void;
  genreId?: number;
  moreContent?: boolean;
  moreLink?: string;
  relatedButtons?: Array<{ name: string; id: string }>;
  onButtonClick?: (id: string, name: string) => void;
  recommendationSources?: Array<{ id: string; title: string }>;
  selectedRecommendationSource?: string;
  onRecommendationSourceChange?: (id: string) => void;
  preloadedMedia?: Movie[] | TVShow[];
  title?: string;
}

export function LazyMediaCarousel({
  medias: propMedias,
  category,
  isTVShow,
  carouselRefs,
  onShowDetails,
  genreId,
  moreContent,
  moreLink,
  relatedButtons,
  onButtonClick,
  recommendationSources,
  selectedRecommendationSource,
  onRecommendationSourceChange,
  preloadedMedia,
  title,
}: LazyMediaCarouselProps) {
  const [medias, setMedias] = useState<Media[]>(propMedias || []);
  const [loading, setLoading] = useState(!preloadedMedia && !propMedias);
  const hasLoaded = useRef(false);

  const categoryData = (isTVShow ? tvCategories : categories).find(
    (c: Category) => c.name === (category || title || ""),
  );

  // Use intersection observer to detect when this component is visible
  const { targetRef, isIntersecting } = useIntersectionObserver(
    { rootMargin: "200px" }, // Load when within 200px of viewport
  );

  // Use the lazy loading hook only if we don't have preloaded media or prop medias
  // and haven't loaded yet
  const { media } = useLazyTMDBData(
    null, // We don't use genre anymore since we're using category directly
    !preloadedMedia && !propMedias && !hasLoaded.current
      ? categoryData || null
      : null,
    isTVShow ? "tv" : "movie",
    isIntersecting && !hasLoaded.current,
  );

  // Update medias when data is loaded or preloaded
  useEffect(() => {
    if (preloadedMedia) {
      setMedias(preloadedMedia);
      setLoading(false);
      hasLoaded.current = true;
    } else if (propMedias) {
      setMedias(propMedias);
      setLoading(false);
      hasLoaded.current = true;
    } else if (media.length > 0) {
      setMedias(media);
      setLoading(false);
      hasLoaded.current = true;
    }
  }, [media, preloadedMedia, propMedias]);

  // Only fetch category content if we don't have preloaded media or prop medias
  // and haven't loaded yet
  useEffect(() => {
    if (preloadedMedia || propMedias || !categoryData || hasLoaded.current)
      return;

    const fetchContent = async () => {
      try {
        const data = await get<any>(categoryData.endpoint, {
          api_key: process.env.TMDB_READ_API_KEY,
          language: "en-US",
        });
        setMedias(data.results);
        hasLoaded.current = true;
      } catch (error) {
        console.error("Error fetching content:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchContent();
  }, [categoryData, preloadedMedia, propMedias]);

  const categoryName = category || title || "";
  const categorySlug = `${categoryName.toLowerCase().replace(/[^a-z0-9]+/g, "-")}-${isTVShow ? "tv" : "movie"}`;

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
          isTVShow={isTVShow}
          carouselRefs={carouselRefs}
          onShowDetails={onShowDetails}
          genreId={genreId}
          relatedButtons={relatedButtons}
          onButtonClick={onButtonClick}
          moreContent={moreContent}
          moreLink={moreLink}
          recommendationSources={recommendationSources}
          selectedRecommendationSource={selectedRecommendationSource}
          onRecommendationSourceChange={onRecommendationSourceChange}
        />
      ) : (
        <div className="relative overflow-hidden carousel-container">
          <div id={`carousel-${categorySlug}`}>
            <h2 className="ml-2 md:ml-8 mt-2 text-2xl cursor-default font-bold text-white md:text-2xl mx-auto pl-5 text-balance">
              {categoryName} {isTVShow ? "Shows" : "Movies"}
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
