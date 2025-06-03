import { Listbox } from "@headlessui/react";
import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate, useParams } from "react-router-dom";
import { useWindowSize } from "react-use";

import { get } from "@/backend/metadata/tmdb";
import {
  getLatest4KReleases,
  getLatestReleases,
} from "@/backend/metadata/traktApi";
import { Button } from "@/components/buttons/Button";
import { Dropdown, OptionItem } from "@/components/form/Dropdown";
import { Icon, Icons } from "@/components/Icon";
import { WideContainer } from "@/components/layout/WideContainer";
import { MediaCard } from "@/components/media/MediaCard";
import { MediaGrid } from "@/components/media/MediaGrid";
import { DetailsModal } from "@/components/overlays/details/DetailsModal";
import { useModal } from "@/components/overlays/Modal";
import { Heading1 } from "@/components/utils/Text";
import { SubPageLayout } from "@/pages/layouts/SubPageLayout";
import { conf } from "@/setup/config";
import { useDiscoverStore } from "@/stores/discover";
import { useLanguageStore } from "@/stores/language";
import { ProgressMediaItem, useProgressStore } from "@/stores/progress";
import { getTmdbLanguageCode } from "@/utils/language";
import { MediaItem } from "@/utils/mediaTypes";

import { Genre, Movie, categories, tvCategories } from "./common";
import {
  EDITOR_PICKS_MOVIES,
  EDITOR_PICKS_TV_SHOWS,
  MOVIE_PROVIDERS,
  TV_PROVIDERS,
} from "./discoverContent";

interface MoreContentProps {
  onShowDetails?: (media: MediaItem) => void;
}

interface Provider {
  id: string;
  name: string;
}

export function MoreContent({ onShowDetails }: MoreContentProps) {
  const { category, type: contentType, id, mediaType } = useParams();
  const [medias, setMedias] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [detailsData, setDetailsData] = useState<any>();
  const [genres, setGenres] = useState<Genre[]>([]);
  const [tvGenres, setTVGenres] = useState<Genre[]>([]);
  const [selectedProvider, setSelectedProvider] = useState<OptionItem | null>(
    null,
  );
  const [selectedGenre, setSelectedGenre] = useState<OptionItem | null>(null);
  const { t } = useTranslation();
  const navigate = useNavigate();
  const detailsModal = useModal("discover-details");
  const { lastView } = useDiscoverStore();
  const userLanguage = useLanguageStore.getState().language;
  const formattedLanguage = getTmdbLanguageCode(userLanguage);
  const [sourceTitle, setSourceTitle] = useState("");
  const progressStore = useProgressStore();
  const { width: windowWidth } = useWindowSize();
  const [recommendationSources, setRecommendationSources] = useState<
    Array<{ id: string; title: string }>
  >([]);
  const [selectedRecommendationSource, setSelectedRecommendationSource] =
    useState<string>("");

  const handleBack = () => {
    if (lastView) {
      navigate(lastView.url);
      window.scrollTo(0, lastView.scrollPosition);
    } else {
      navigate(-1);
    }
  };

  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  // Fetch genres when component mounts
  useEffect(() => {
    const fetchGenres = async () => {
      try {
        const [movieData, tvData] = await Promise.all([
          get<any>("/genre/movie/list", {
            api_key: conf().TMDB_READ_API_KEY,
            language: formattedLanguage,
          }),
          get<any>("/genre/tv/list", {
            api_key: conf().TMDB_READ_API_KEY,
            language: formattedLanguage,
          }),
        ]);
        setGenres(movieData.genres);
        setTVGenres(tvData.genres);
      } catch (error) {
        console.error("Error fetching genres:", error);
      }
    };

    fetchGenres();
  }, [formattedLanguage]);

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

  const fetchContent = useCallback(
    async (page: number, append: boolean = false) => {
      try {
        const isTVShow = mediaType === "tv";
        let endpoint = "";

        // Map category URLs to their corresponding TMDB endpoints
        const categoryEndpointMap: { [key: string]: string } = {
          // Movie categories
          "now-playing-movie": "/movie/now_playing",
          "top-rated-movie": "/movie/top_rated",
          "most-popular-movie": "/movie/popular",
          // TV categories
          "on-the-air-tv": "/tv/on_the_air",
          "top-rated-tv": "/tv/top_rated",
          "most-popular-tv": "/tv/popular",
        };

        // Handle recommendations separately
        if (contentType === "recommendations") {
          // Get title from progress store instead of fetching details
          const progressItem = progressStore.items[id || ""];
          if (progressItem) {
            setSourceTitle(progressItem.title || "");
          }

          // Get recommendations with proper page number
          const results = await get<any>(
            `/${isTVShow ? "tv" : "movie"}/${id}/recommendations`,
            {
              api_key: conf().TMDB_READ_API_KEY,
              language: formattedLanguage,
              page,
            },
          );

          const processedResults = results.results.map((item: any) => {
            const isItemTVShow = Boolean(item.first_air_date);
            return {
              ...item,
              type: isItemTVShow ? "show" : "movie",
              // Keep both dates in the raw data
              first_air_date: item.first_air_date,
              release_date: item.release_date,
            };
          });

          if (append) {
            setMedias((prev) => [...prev, ...processedResults]);
          } else {
            setMedias(processedResults);
          }
          setHasMore(page < results.total_pages);
          setCurrentPage(page);
          return;
        }

        // Handle editor picks separately
        if (category?.includes("editor-picks")) {
          const isEditorPicksTV = category.includes("tv");
          const editorPicks = isEditorPicksTV
            ? EDITOR_PICKS_TV_SHOWS
            : EDITOR_PICKS_MOVIES;

          // Fetch details for all editor picks
          const promises = editorPicks.map((item) =>
            get<any>(`/${isEditorPicksTV ? "tv" : "movie"}/${item.id}`, {
              api_key: conf().TMDB_READ_API_KEY,
              language: formattedLanguage,
            }),
          );

          const results = await Promise.all(promises);
          const validResults = results.map((item) => ({
            ...item,
            type: isEditorPicksTV ? "show" : "movie",
            release_date: isEditorPicksTV
              ? item.first_air_date
              : item.release_date,
          }));
          setMedias(validResults);
          setHasMore(false);
          return;
        }

        // Handle Trakt categories separately
        if (
          category?.includes("latest-releases") ||
          category?.includes("4k-releases")
        ) {
          try {
            const traktFunction = category?.includes("latest-releases")
              ? getLatestReleases
              : getLatest4KReleases;

            const traktData = await traktFunction();
            const moviePromises = traktData.tmdb_ids
              .slice((page - 1) * 20, page * 20)
              .map((tmdbId: number) =>
                get<any>(`/movie/${tmdbId}`, {
                  api_key: conf().TMDB_READ_API_KEY,
                  language: formattedLanguage,
                }).catch(() => null),
              );

            const results = await Promise.all(moviePromises);
            const validMovies = results
              .filter((movie: any): movie is Movie => movie !== null)
              .map((movie: Movie) => {
                const isItemTVShow = Boolean(movie.first_air_date);
                return {
                  ...movie,
                  type: isItemTVShow ? "show" : "movie",
                  // Keep both dates in the raw data
                  first_air_date: movie.first_air_date,
                  release_date: movie.release_date,
                };
              });

            if (append) {
              setMedias((prev) => [...prev, ...validMovies]);
            } else {
              setMedias(validMovies);
            }
            setHasMore(traktData.tmdb_ids.length > page * 20);
            return;
          } catch (error) {
            console.error(`Error fetching ${category}:`, error);
          }
        }

        // Determine the correct endpoint based on the category
        if (category && categoryEndpointMap[category]) {
          endpoint = categoryEndpointMap[category];
        } else if (contentType === "provider") {
          endpoint = isTVShow ? "/discover/tv" : "/discover/movie";
        } else if (contentType === "genre") {
          endpoint = isTVShow ? "/discover/tv" : "/discover/movie";
        }

        if (!endpoint) {
          console.error("No endpoint found for category:", category);
          return;
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

          if (contentType === "provider") {
            params.with_watch_providers = id;
            params.watch_region = "US";
          } else if (contentType === "genre") {
            params.with_genres = id;
          }

          const data = await get<any>(endpoint, params);
          const processedResults = data.results.map((item: any) => {
            const isItemTVShow = Boolean(item.first_air_date);
            return {
              ...item,
              type: isItemTVShow ? "show" : "movie",
              // Keep both dates in the raw data
              first_air_date: item.first_air_date,
              release_date: item.release_date,
            };
          });

          allResults.push(...processedResults);

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
    [
      contentType,
      id,
      mediaType,
      category,
      formattedLanguage,
      progressStore.items,
    ],
  );

  useEffect(() => {
    const loadInitialContent = async () => {
      setLoading(true);
      await fetchContent(1);
      setLoading(false);
    };

    loadInitialContent();
  }, [contentType, id, mediaType, category, formattedLanguage, fetchContent]);

  const handleLoadMore = async () => {
    setLoadingMore(true);
    const nextPage =
      contentType === "recommendations" ? currentPage + 1 : currentPage + 2;
    await fetchContent(nextPage, true);
    setCurrentPage(nextPage);
    setLoadingMore(false);
  };

  const getDisplayTitle = () => {
    const isTVShow = mediaType === "tv";

    if (contentType === "recommendations") {
      return t("discover.carousel.title.recommended", {
        title: sourceTitle,
      });
    }

    if (category?.includes("editor-picks")) {
      return category.includes("tv")
        ? t("discover.carousel.title.editorPicksShows")
        : t("discover.carousel.title.editorPicksMovies");
    }

    if (category?.includes("latest-releases")) {
      return t("discover.carousel.title.latestReleases");
    }

    if (category?.includes("4k-releases")) {
      return t("discover.carousel.title.4kReleases");
    }

    // Map category URLs to their display titles
    const categoryTitleMap: { [key: string]: string } = {
      // Movie categories
      "now-playing-movie": t("discover.carousel.title.nowPlaying"),
      "top-rated-movie": t("discover.carousel.title.topRated"),
      "most-popular-movie": t("discover.carousel.title.popular"),
      // TV categories
      "on-the-air-tv": t("discover.carousel.title.onTheAir"),
      "top-rated-tv": t("discover.carousel.title.topRated"),
      "most-popular-tv": t("discover.carousel.title.popular"),
    };

    if (category && categoryTitleMap[category]) {
      return categoryTitleMap[category];
    }

    if (!contentType || !id) return "";

    if (contentType === "provider") {
      const providers = isTVShow ? TV_PROVIDERS : MOVIE_PROVIDERS;
      const provider = providers.find((p: Provider) => p.id === id);
      return isTVShow
        ? t("discover.carousel.title.tvshowsOn", {
            provider: provider?.name,
          })
        : t("discover.carousel.title.moviesOn", {
            provider: provider?.name,
          });
    }

    if (contentType === "genre") {
      const genreList = isTVShow ? tvGenres : genres;
      const genre = genreList.find((g: Genre) => g.id.toString() === id);
      return isTVShow
        ? t("discover.carousel.title.genreShows", { genre: genre?.name || id })
        : t("discover.carousel.title.genreMovies", {
            genre: genre?.name || id,
          });
    }

    if (contentType === "category") {
      const categoryList = isTVShow ? tvCategories : categories;
      const categoryData = categoryList.find((c) => c.urlPath === id);
      if (categoryData) {
        return isTVShow
          ? t("discover.carousel.title.categoryShows", {
              category: categoryData.name,
            })
          : t("discover.carousel.title.categoryMovies", {
              category: categoryData.name,
            });
      }
    }
  };

  useEffect(() => {
    if (contentType === "provider" && selectedProvider) {
      navigate(`/discover/more/provider/${selectedProvider.id}/${mediaType}`);
    } else if (contentType === "genre" && selectedGenre) {
      navigate(`/discover/more/genre/${selectedGenre.id}/${mediaType}`);
    }
  }, [selectedProvider, selectedGenre, contentType, mediaType, navigate]);

  useEffect(() => {
    if (contentType === "provider" && id) {
      const providers = mediaType === "tv" ? TV_PROVIDERS : MOVIE_PROVIDERS;
      const provider = providers.find((p) => p.id === id);
      if (provider) {
        setSelectedProvider({ id: provider.id, name: provider.name });
      }
    } else if (contentType === "genre" && id) {
      const genreList = mediaType === "tv" ? tvGenres : genres;
      const genre = genreList.find((g) => g.id.toString() === id);
      if (genre) {
        setSelectedGenre({ id: genre.id.toString(), name: genre.name });
      }
    }
  }, [contentType, id, mediaType, genres, tvGenres]);

  const providerButtons = useMemo(() => {
    if (contentType !== "provider")
      return { visibleButtons: [], dropdownButtons: [] };
    const providers = mediaType === "tv" ? TV_PROVIDERS : MOVIE_PROVIDERS;
    const visible =
      windowWidth > 850 ? providers.slice(0, 7) : providers.slice(0, 2);
    const dropdown =
      windowWidth > 850 ? providers.slice(5) : providers.slice(0);
    return { visibleButtons: visible, dropdownButtons: dropdown };
  }, [contentType, mediaType, windowWidth]);

  const genreButtons = useMemo(() => {
    if (contentType !== "genre")
      return { visibleButtons: [], dropdownButtons: [] };
    const genreList = mediaType === "tv" ? tvGenres : genres;
    const visible =
      windowWidth > 850 ? genreList.slice(0, 7) : genreList.slice(0, 2);
    const dropdown =
      windowWidth > 850 ? genreList.slice(5) : genreList.slice(0);
    return { visibleButtons: visible, dropdownButtons: dropdown };
  }, [contentType, mediaType, windowWidth, tvGenres, genres]);

  const renderProviderButtons = () => {
    if (contentType !== "provider") return null;
    const { visibleButtons, dropdownButtons } = providerButtons;

    return (
      <div className="flex items-center space-x-2">
        {visibleButtons.map((provider) => (
          <button
            type="button"
            key={provider.id}
            onClick={() =>
              setSelectedProvider({ id: provider.id, name: provider.name })
            }
            className="px-3 py-1 text-sm rounded-full transition-colors whitespace-nowrap flex-shrink-0 bg-mediaCard-hoverBackground hover:bg-mediaCard-background"
          >
            {provider.name}
          </button>
        ))}
        {dropdownButtons.length > 0 && (
          <div className="relative">
            <Dropdown
              selectedItem={selectedProvider || { id: "", name: "..." }}
              setSelectedItem={(item) => setSelectedProvider(item)}
              options={dropdownButtons.map((p) => ({ id: p.id, name: p.name }))}
              customButton={
                <button
                  type="button"
                  className="px-3 py-1 text-sm bg-mediaCard-hoverBackground hover:bg-mediaCard-background rounded-full transition-colors flex items-center gap-1"
                >
                  <span>...</span>
                  <Icon
                    icon={Icons.UP_DOWN_ARROW}
                    className="text-xs text-dropdown-secondary"
                  />
                </button>
              }
              side="right"
            />
          </div>
        )}
      </div>
    );
  };

  const renderGenreButtons = () => {
    if (contentType !== "genre") return null;
    const { visibleButtons, dropdownButtons } = genreButtons;

    return (
      <div className="flex items-center space-x-2">
        {visibleButtons.map((genre) => (
          <button
            type="button"
            key={genre.id}
            onClick={() =>
              setSelectedGenre({ id: genre.id.toString(), name: genre.name })
            }
            className="px-3 py-1 text-sm rounded-full transition-colors whitespace-nowrap flex-shrink-0 bg-mediaCard-hoverBackground hover:bg-mediaCard-background"
          >
            {genre.name}
          </button>
        ))}
        {dropdownButtons.length > 0 && (
          <div className="relative">
            <Dropdown
              selectedItem={selectedGenre || { id: "", name: "..." }}
              setSelectedItem={(item) => setSelectedGenre(item)}
              options={dropdownButtons.map((g) => ({
                id: g.id.toString(),
                name: g.name,
              }))}
              customButton={
                <button
                  type="button"
                  className="px-3 py-1 text-sm bg-mediaCard-hoverBackground hover:bg-mediaCard-background rounded-full transition-colors flex items-center gap-1"
                >
                  <span>...</span>
                  <Icon
                    icon={Icons.UP_DOWN_ARROW}
                    className="text-xs text-dropdown-secondary"
                  />
                </button>
              }
              side="right"
            />
          </div>
        )}
      </div>
    );
  };

  // Add effect to set up recommendation sources
  useEffect(() => {
    const setupRecommendationSources = async () => {
      if (
        contentType !== "recommendations" ||
        !progressStore.items ||
        Object.keys(progressStore.items).length === 0
      )
        return;

      try {
        const progressItems = Object.entries(progressStore.items) as [
          string,
          ProgressMediaItem,
        ][];
        const items = progressItems.filter(
          ([_, item]) => item.type === (mediaType === "tv" ? "show" : "movie"),
        );

        if (items.length > 0) {
          const sources = items.map(([itemId, item]) => ({
            id: itemId,
            title: item.title || "",
          }));
          setRecommendationSources(sources);

          // Set initial source if not set
          if (!selectedRecommendationSource && sources.length > 0) {
            setSelectedRecommendationSource(sources[0].id);
          }
        }
      } catch (error) {
        console.error("Error setting up recommendation sources:", error);
      }
    };

    setupRecommendationSources();
  }, [
    contentType,
    mediaType,
    progressStore.items,
    selectedRecommendationSource,
  ]);

  // Add effect to handle recommendation source changes
  useEffect(() => {
    if (contentType === "recommendations" && selectedRecommendationSource) {
      navigate(
        `/discover/more/recommendations/${selectedRecommendationSource}/${mediaType}`,
      );
    }
  }, [selectedRecommendationSource, contentType, mediaType, navigate]);

  const renderRecommendationSourceDropdown = () => {
    if (contentType !== "recommendations" || recommendationSources.length === 0)
      return null;

    return (
      <div className="flex items-center gap-2">
        <div className="relative pr-4">
          <Dropdown
            selectedItem={
              recommendationSources.find(
                (s) => s.id === selectedRecommendationSource,
              )
                ? {
                    id: selectedRecommendationSource || "",
                    name:
                      recommendationSources.find(
                        (s) => s.id === selectedRecommendationSource,
                      )?.title || "",
                  }
                : {
                    id: "",
                    name: recommendationSources[0]?.title || "",
                  }
            }
            setSelectedItem={(item) => setSelectedRecommendationSource(item.id)}
            options={recommendationSources.map((source) => ({
              id: source.id,
              name: source.title,
            }))}
            customButton={
              <button
                type="button"
                className="px-2 py-1 text-sm bg-mediaCard-hoverBackground rounded-full hover:bg-mediaCard-background transition-colors flex items-center gap-1"
              >
                <span>{t("discover.carousel.change")}</span>
                <Icon
                  icon={Icons.UP_DOWN_ARROW}
                  className="text-xs text-dropdown-secondary"
                />
              </button>
            }
            side="right"
            customMenu={
              <Listbox.Options static className="py-1">
                {recommendationSources.map((opt) => (
                  <Listbox.Option
                    className={({ active }) =>
                      `cursor-pointer min-w-60 flex gap-4 items-center relative select-none py-2 px-4 mx-1 rounded-lg ${
                        active
                          ? "bg-background-secondaryHover text-type-link"
                          : "text-type-secondary"
                      }`
                    }
                    key={opt.id}
                    value={{ id: opt.id, name: opt.title }}
                  >
                    {({ selected }) => (
                      <>
                        <span
                          className={`block ${selected ? "font-medium" : "font-normal"}`}
                        >
                          {opt.title}
                        </span>
                        {selected && (
                          <Icon
                            icon={Icons.CHECKMARK}
                            className="text-xs text-type-link"
                          />
                        )}
                      </>
                    )}
                  </Listbox.Option>
                ))}
              </Listbox.Options>
            }
          />
        </div>
      </div>
    );
  };

  if (loading) {
    return (
      <SubPageLayout>
        <WideContainer>
          <div className="animate-pulse">
            <div className="h-8 bg-gray-700 rounded w-1/4 mb-8" />
            <MediaGrid>
              {Array.from({ length: 20 }).map(() => (
                <div
                  key={crypto.randomUUID()}
                  className="aspect-[2/3] bg-gray-700 rounded-lg"
                />
              ))}
            </MediaGrid>
          </div>
        </WideContainer>
      </SubPageLayout>
    );
  }

  return (
    <SubPageLayout>
      <WideContainer>
        <div className="flex items-center justify-between gap-8">
          <Heading1 className="text-2xl font-bold text-white">
            {getDisplayTitle()}
          </Heading1>
          {renderRecommendationSourceDropdown()}
        </div>

        <div className="flex items-center gap-4 mb-2">
          <button
            type="button"
            onClick={handleBack}
            className="flex items-center text-white hover:text-gray-300 transition-colors"
          >
            <Icon className="text-xl" icon={Icons.ARROW_LEFT} />
            <span className="ml-2">{t("discover.page.back")}</span>
          </button>
        </div>

        {renderProviderButtons()}
        {renderGenreButtons()}

        <div className="grid grid-cols-2 gap-8 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-6 3xl:grid-cols-8 4xl:grid-cols-10 pt-8">
          {medias.map((media) => {
            // Determine if this is a TV show based on the presence of first_air_date
            const isTVShow = Boolean(media.first_air_date);
            const releaseDate = isTVShow
              ? media.first_air_date
              : media.release_date;
            const year = releaseDate
              ? parseInt(releaseDate.split("-")[0], 10)
              : undefined;

            const mediaItem: MediaItem = {
              id: media.id.toString(),
              title: media.title || media.name || "",
              poster: `https://image.tmdb.org/t/p/w342${media.poster_path}`,
              type: isTVShow ? "show" : "movie",
              year,
              release_date: releaseDate ? new Date(releaseDate) : undefined,
            };

            return (
              <div
                key={media.id}
                style={{ userSelect: "none" }}
                onContextMenu={(e: React.MouseEvent<HTMLDivElement>) =>
                  e.preventDefault()
                }
              >
                <MediaCard
                  media={mediaItem}
                  onShowDetails={handleShowDetails}
                  linkable={!category?.includes("upcoming")}
                />
              </div>
            );
          })}
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
