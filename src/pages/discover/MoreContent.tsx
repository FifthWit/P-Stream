import { useCallback, useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate, useParams } from "react-router-dom";

import { get } from "@/backend/metadata/tmdb";
import { Button } from "@/components/buttons/Button";
import { Icon, Icons } from "@/components/Icon";
import { WideContainer } from "@/components/layout/WideContainer";
import { MediaCard } from "@/components/media/MediaCard";
import { DetailsModal } from "@/components/overlays/DetailsModal";
import { useModal } from "@/components/overlays/Modal";
import { Heading1 } from "@/components/utils/Text";
import { SubPageLayout } from "@/pages/layouts/SubPageLayout";
import { conf } from "@/setup/config";
import { useLanguageStore } from "@/stores/language";
import { getTmdbLanguageCode } from "@/utils/language";
import { MediaItem } from "@/utils/mediaTypes";

import { EDITOR_PICKS_MOVIES, EDITOR_PICKS_TV_SHOWS } from "./discoverContent";

interface MoreContentProps {
  onShowDetails?: (media: MediaItem) => void;
}

export function MoreContent({ onShowDetails }: MoreContentProps) {
  const { category, genreId } = useParams();
  const [medias, setMedias] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [detailsData, setDetailsData] = useState<any>();
  const { t } = useTranslation();
  const navigate = useNavigate();
  const detailsModal = useModal("discover-details");
  const userLanguage = useLanguageStore.getState().language;
  const formattedLanguage = getTmdbLanguageCode(userLanguage);

  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  const handleShowDetails = async (media: MediaItem) => {
    if (onShowDetails) {
      onShowDetails(media);
      return;
    }
    setDetailsData({
      id: Number(media.id),
      type: media.type === "movie" ? "movie" : "show",
    });
    detailsModal.show();
  };

  function getDisplayCategory(
    categoryName: string,
    isTVShowCondition: boolean,
  ): string {
    const providerMatch = categoryName.match(
      /^Popular (Movies|Shows) on (.+)$/,
    );
    if (providerMatch) {
      const type = providerMatch[1].toLowerCase();
      const provider = providerMatch[2];
      return t("discover.carousel.title.popularOn", {
        type:
          type === "movies" ? t("media.types.movie") : t("media.types.show"),
        provider,
      });
    }

    if (categoryName === "Now Playing") {
      return t("discover.carousel.title.inCinemas");
    }

    if (categoryName === "Editor Picks") {
      return isTVShowCondition
        ? t("discover.carousel.title.editorPicksShows")
        : t("discover.carousel.title.editorPicksMovies");
    }

    // Capitalize each word in the category name
    const capitalizedCategory = categoryName
      .split(" ")
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
      .join(" ");

    return isTVShowCondition
      ? t("discover.carousel.title.tvshows", { category: capitalizedCategory })
      : t("discover.carousel.title.movies", { category: capitalizedCategory });
  }

  const fetchContent = useCallback(
    async (page: number, append: boolean = false) => {
      try {
        const isTVShow = category?.includes("tv");
        let endpoint = "";

        // Handle editor picks separately
        if (category?.includes("editor-picks")) {
          const editorPicks = isTVShow
            ? EDITOR_PICKS_TV_SHOWS
            : EDITOR_PICKS_MOVIES;

          // Fetch details for all editor picks
          const promises = editorPicks.map((item) =>
            get<any>(`/${isTVShow ? "tv" : "movie"}/${item.id}`, {
              api_key: conf().TMDB_READ_API_KEY,
              language: formattedLanguage,
            }),
          );

          const results = await Promise.all(promises);
          setMedias(results);
          setHasMore(false);
          return;
        }

        // Determine the correct endpoint based on the category
        if (category?.includes("now-playing")) {
          endpoint = isTVShow ? "/tv/on_the_air" : "/movie/now_playing";
        } else if (category?.includes("top-rated")) {
          endpoint = isTVShow ? "/tv/top_rated" : "/movie/top_rated";
        } else if (category?.includes("popular")) {
          endpoint = isTVShow ? "/tv/popular" : "/movie/popular";
        } else {
          endpoint = isTVShow ? "/discover/tv" : "/discover/movie";
        }

        const allResults: any[] = [];
        const pagesToFetch = 2; // Fetch 2 pages at a time

        for (let i = 0; i < pagesToFetch; i += 1) {
          const currentPageNum = page + i;
          const params: any = {
            api_key: conf().TMDB_READ_API_KEY,
            language: formattedLanguage,
            page: currentPageNum,
          };

          if (genreId) {
            params.with_genres = genreId;
          }

          const data = await get<any>(endpoint, params);
          allResults.push(...data.results);

          // Check if we've reached the end
          if (currentPageNum >= data.total_pages) {
            setHasMore(false);
            break;
          }
        }

        if (append) {
          setMedias((prev) => [...prev, ...allResults]);
        } else {
          setMedias(allResults);
        }
      } catch (error) {
        console.error("Error fetching content:", error);
      }
    },
    [category, genreId, formattedLanguage],
  );

  useEffect(() => {
    const loadInitialContent = async () => {
      setLoading(true);
      await fetchContent(1);
      setLoading(false);
    };

    loadInitialContent();
  }, [category, genreId, formattedLanguage, fetchContent]);

  const handleLoadMore = async () => {
    setLoadingMore(true);
    const nextPage = currentPage + 2;
    await fetchContent(nextPage, true);
    setCurrentPage(nextPage);
    setLoadingMore(false);
  };

  const getDisplayTitle = () => {
    if (!category) return "";
    const baseTitle = category.split("-").slice(0, -1).join(" ");
    const isTVShow = category?.includes("tv");
    return getDisplayCategory(baseTitle, isTVShow);
  };

  if (loading) {
    return (
      <SubPageLayout>
        <WideContainer>
          <div className="animate-pulse">
            <div className="h-8 bg-gray-700 rounded w-1/4 mb-8" />
            <div className="grid grid-cols-2 gap-6 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-6 3xl:grid-cols-8 4xl:grid-cols-10">
              {Array.from({ length: 20 }).map(() => (
                <div
                  key={crypto.randomUUID()}
                  className="aspect-[2/3] bg-gray-700 rounded-lg"
                />
              ))}
            </div>
          </div>
        </WideContainer>
      </SubPageLayout>
    );
  }

  return (
    <SubPageLayout>
      <WideContainer>
        <Heading1 className="text-3xl font-bold text-white">
          {getDisplayTitle()}
        </Heading1>

        <div className="flex items-center gap-4 mb-8">
          <button
            type="button"
            onClick={() => navigate(-1)}
            className="flex items-center text-white hover:text-gray-300 transition-colors"
          >
            <Icon className="text-xl" icon={Icons.ARROW_LEFT} />
            <span className="ml-2">{t("discover.page.back")}</span>
          </button>
        </div>
        <div className="grid grid-cols-2 gap-8 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-6 3xl:grid-cols-8 4xl:grid-cols-10">
          {medias.map((media) => (
            <div
              key={media.id}
              style={{ userSelect: "none" }}
              onContextMenu={(e: React.MouseEvent<HTMLDivElement>) =>
                e.preventDefault()
              }
            >
              <MediaCard
                media={{
                  id: media.id.toString(),
                  title: media.title || media.name || "",
                  poster: `https://image.tmdb.org/t/p/w342${media.poster_path}`,
                  type: category?.includes("tv") ? "show" : "movie",
                  year: category?.includes("tv")
                    ? media.first_air_date
                      ? parseInt(media.first_air_date.split("-")[0], 10)
                      : undefined
                    : media.release_date
                      ? parseInt(media.release_date.split("-")[0], 10)
                      : undefined,
                }}
                onShowDetails={handleShowDetails}
                linkable={!category?.includes("upcoming")}
              />
            </div>
          ))}
        </div>
        {hasMore && (
          <div className="flex justify-center mt-8">
            <Button
              theme="purple"
              onClick={handleLoadMore}
              disabled={loadingMore}
            >
              {loadingMore
                ? t("discover.page.loading")
                : t("discover.page.loadMore")}
            </Button>
          </div>
        )}
      </WideContainer>
      {detailsData && <DetailsModal id="discover-details" data={detailsData} />}
    </SubPageLayout>
  );
}
