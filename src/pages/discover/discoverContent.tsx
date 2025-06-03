import { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";

import { get } from "@/backend/metadata/tmdb";
import {
  getLatest4KReleases,
  getLatestReleases,
} from "@/backend/metadata/traktApi";
import { WideContainer } from "@/components/layout/WideContainer";
import { DetailsModal } from "@/components/overlays/details/DetailsModal";
import { useModal } from "@/components/overlays/Modal";
import {
  Genre,
  Movie,
  TVShow,
  categories,
  tvCategories,
} from "@/pages/discover/common";
import { conf } from "@/setup/config";
import { useDiscoverStore } from "@/stores/discover";
import { useLanguageStore } from "@/stores/language";
import { ProgressMediaItem, useProgressStore } from "@/stores/progress";
import { getTmdbLanguageCode } from "@/utils/language";
import { MediaItem } from "@/utils/mediaTypes";

import { DiscoverNavigation } from "./components/DiscoverNavigation";
import type { FeaturedMedia } from "./components/FeaturedCarousel";
import { LazyMediaCarousel } from "./components/LazyMediaCarousel";
import { LazyTabContent } from "./components/LazyTabContent";
import { ScrollToTopButton } from "./components/ScrollToTopButton";

// Provider constants moved from DiscoverNavigation
export const MOVIE_PROVIDERS = [
  { name: "Netflix", id: "8" },
  { name: "Apple TV+", id: "2" },
  { name: "Amazon Prime Video", id: "10" },
  { name: "Hulu", id: "15" },
  { name: "Disney Plus", id: "337" },
  { name: "Max", id: "1899" },
  { name: "Paramount Plus", id: "531" },
  { name: "Shudder", id: "99" },
  { name: "Crunchyroll", id: "283" },
  { name: "fuboTV", id: "257" },
  { name: "AMC+", id: "526" },
  { name: "Starz", id: "43" },
  { name: "PBS", id: "209" },
  { name: "Lifetime", id: "157" },
  { name: "National Geographic", id: "1964" },
];

export const TV_PROVIDERS = [
  { name: "Netflix", id: "8" },
  { name: "Apple TV+", id: "350" },
  { name: "Amazon Prime Video", id: "10" },
  { name: "Paramount Plus", id: "531" },
  { name: "Hulu", id: "15" },
  { name: "Max", id: "1899" },
  { name: "Adult Swim", id: "318" },
  { name: "Disney Plus", id: "337" },
  { name: "fubuTV", id: "257" },
  { name: "Crunchyroll", id: "283" },
  { name: "fuboTV", id: "257" },
  { name: "Shudder", id: "99" },
  { name: "Discovery +", id: "520" },
  { name: "National Geographic", id: "1964" },
  { name: "Fox", id: "328" },
];

const shuffleArray = <T,>(array: T[]): T[] => {
  const shuffled = [...array];
  for (let i = shuffled.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
};

// Editor Picks lists
export const EDITOR_PICKS_MOVIES = shuffleArray([
  { id: 9342, type: "movie" }, // The Mask of Zorro
  { id: 293, type: "movie" }, // A River Runs Through It
  { id: 370172, type: "movie" }, // No Time To Die
  { id: 661374, type: "movie" }, // The Glass Onion
  { id: 207, type: "movie" }, // Dead Poets Society
  { id: 378785, type: "movie" }, // The Best of the Blues Brothers
  { id: 335984, type: "movie" }, // Blade Runner 2049
  { id: 13353, type: "movie" }, // It's the Great Pumpkin, Charlie Brown
  { id: 27205, type: "movie" }, // Inception
  { id: 106646, type: "movie" }, // The Wolf of Wall Street
  { id: 334533, type: "movie" }, // Captain Fantastic
  { id: 693134, type: "movie" }, // Dune: Part Two
  { id: 765245, type: "movie" }, // Swan Song
  { id: 264660, type: "movie" }, // Ex Machina
  { id: 92591, type: "movie" }, // Bernie
  { id: 976893, type: "movie" }, // Perfect Days
  { id: 13187, type: "movie" }, // A Charlie Brown Christmas
  { id: 11527, type: "movie" }, // Excalibur
  { id: 120, type: "movie" }, // LOTR: The Fellowship of the Ring
  { id: 157336, type: "movie" }, // Interstellar
  { id: 762, type: "movie" }, // Monty Python and the Holy Grail
  { id: 666243, type: "movie" }, // The Witcher: Nightmare of the Wolf
  { id: 545611, type: "movie" }, // Everything Everywhere All at Once
  { id: 329, type: "movie" }, // Jurrassic Park
  { id: 330459, type: "movie" }, // Rogue One: A Star Wars Story
  { id: 279, type: "movie" }, // Amadeus
  { id: 823219, type: "movie" }, // Flow
  { id: 22, type: "movie" }, // Pirates of the Caribbean: The Curse of the Black Pearl
  { id: 18971, type: "movie" }, // Rosencrantz and Guildenstern Are Dead
  { id: 26388, type: "movie" }, // Buried
  { id: 152601, type: "movie" }, // Her
]);

export const EDITOR_PICKS_TV_SHOWS = shuffleArray([
  { id: 456, type: "show" }, // The Simpsons
  { id: 73021, type: "show" }, // Disenchantment
  { id: 1434, type: "show" }, // Family Guy
  { id: 1695, type: "show" }, // Monk
  { id: 1408, type: "show" }, // House
  { id: 93740, type: "show" }, // Foundation
  { id: 60625, type: "show" }, // Rick and Morty
  { id: 1396, type: "show" }, // Breaking Bad
  { id: 44217, type: "show" }, // Vikings
  { id: 90228, type: "show" }, // Dune Prophecy
  { id: 13916, type: "show" }, // Death Note
  { id: 71912, type: "show" }, // The Witcher
  { id: 61222, type: "show" }, // Bojack Horseman
  { id: 93405, type: "show" }, // Squid Game
  { id: 87108, type: "show" }, // Chernobyl
  { id: 105248, type: "show" }, // Cyberpunk: Edgerunners
]);

export function DiscoverContent() {
  const { selectedCategory, setSelectedCategory } = useDiscoverStore();
  const [selectedProvider, setSelectedProvider] = useState({
    name: "",
    id: "",
  });
  const [selectedGenre, setSelectedGenre] = useState({
    name: "",
    id: "",
  });
  const [genres, setGenres] = useState<Genre[]>([]);
  const [tvGenres, setTVGenres] = useState<Genre[]>([]);
  const [providerMovies, setProviderMovies] = useState<Movie[]>([]);
  const [providerTVShows, setProviderTVShows] = useState<TVShow[]>([]);
  const [filteredGenreMovies, setFilteredGenreMovies] = useState<Movie[]>([]);
  const [filteredGenreTVShows, setFilteredGenreTVShows] = useState<TVShow[]>(
    [],
  );
  const [detailsData, setDetailsData] = useState<any>();
  const detailsModal = useModal("discover-details");
  const [movieRecommendations, setMovieRecommendations] = useState<any[]>([]);
  const [tvRecommendations, setTVRecommendations] = useState<any[]>([]);
  const [movieRecommendationTitle, setMovieRecommendationTitle] = useState("");
  const [tvRecommendationTitle, setTVRecommendationTitle] = useState("");
  const [movieRecommendationSourceId, setMovieRecommendationSourceId] =
    useState<string>("");
  const [tvRecommendationSourceId, setTVRecommendationSourceId] =
    useState<string>("");
  const [movieRecommendationSources, setMovieRecommendationSources] = useState<
    Array<{ id: string; title: string }>
  >([]);
  const [tvRecommendationSources, setTVRecommendationSources] = useState<
    Array<{ id: string; title: string }>
  >([]);
  const [selectedMovieSource, setSelectedMovieSource] = useState<string>("");
  const [selectedTVSource, setSelectedTVSource] = useState<string>("");
  const progressStore = useProgressStore();
  const { t } = useTranslation();
  const [latestReleases, setLatestReleases] = useState<Movie[]>([]);
  const [latest4KReleases, setLatest4KReleases] = useState<Movie[]>([]);
  const [isLoadingLatest, setIsLoadingLatest] = useState(false);
  const [isLoading4K, setIsLoading4K] = useState(false);
  const [isTraktAvailable, setIsTraktAvailable] = useState(false);

  const carouselRefs = useRef<{ [key: string]: HTMLDivElement | null }>({});

  const userLanguage = useLanguageStore.getState().language;
  const formattedLanguage = getTmdbLanguageCode(userLanguage);

  // Only load data for the active tab
  const isMoviesTab = selectedCategory === "movies";
  const isTVShowsTab = selectedCategory === "tvshows";
  const isEditorPicksTab = selectedCategory === "editorpicks";

  const handleCategoryChange = (category: string) => {
    setSelectedCategory(category as "movies" | "tvshows" | "editorpicks");
  };

  // Set initial provider when component mounts or category changes
  useEffect(() => {
    const providers =
      selectedCategory === "movies" ? MOVIE_PROVIDERS : TV_PROVIDERS;
    if (providers.length > 0 && !selectedProvider.id) {
      setSelectedProvider({
        name: providers[0].name,
        id: providers[0].id,
      });
    }
  }, [selectedCategory, selectedProvider.id]);

  // Set initial genre when component mounts or category changes
  useEffect(() => {
    const genreList = selectedCategory === "movies" ? genres : tvGenres;
    if (genreList.length > 0) {
      // Always reset genre when switching categories to ensure we use the correct genre IDs
      if (selectedCategory === "movies") {
        setSelectedGenre({
          name: genres[0].name,
          id: genres[0].id.toString(),
        });
      } else if (selectedCategory === "tvshows") {
        setSelectedGenre({
          name: tvGenres[0].name,
          id: tvGenres[0].id.toString(),
        });
      }
    }
  }, [selectedCategory, genres, tvGenres]);

  // Fetch provider content when selectedProvider changes
  useEffect(() => {
    const fetchProviderContent = async () => {
      if (!selectedProvider.id) return;

      try {
        const endpoint =
          selectedCategory === "movies" ? "/discover/movie" : "/discover/tv";
        const setData =
          selectedCategory === "movies"
            ? setProviderMovies
            : setProviderTVShows;
        const data = await get<any>(endpoint, {
          api_key: conf().TMDB_READ_API_KEY,
          with_watch_providers: selectedProvider.id,
          watch_region: "US",
          language: formattedLanguage,
        });
        setData(data.results);
      } catch (error) {
        console.error("Error fetching provider movies/shows:", error);
      }
    };

    fetchProviderContent();
  }, [selectedProvider, selectedCategory, formattedLanguage]);

  // Fetch genre content when selectedGenre changes
  useEffect(() => {
    const fetchGenreContent = async () => {
      if (!selectedGenre.id) return;
      try {
        const endpoint =
          selectedCategory === "movies" ? "/discover/movie" : "/discover/tv";
        const setData =
          selectedCategory === "movies"
            ? setFilteredGenreMovies
            : setFilteredGenreTVShows;
        const data = await get<any>(endpoint, {
          api_key: conf().TMDB_READ_API_KEY,
          with_genres: selectedGenre.id,
          language: formattedLanguage,
        });
        setData(data.results);
      } catch (error) {
        console.error("Error fetching genre movies/shows:", error);
      }
    };

    fetchGenreContent();
  }, [selectedGenre, selectedCategory, formattedLanguage]);

  // Fetch TV show genres
  useEffect(() => {
    if (!isTVShowsTab) return;

    const fetchTVGenres = async () => {
      try {
        const data = await get<any>("/genre/tv/list", {
          api_key: conf().TMDB_READ_API_KEY,
          language: formattedLanguage,
        });
        setTVGenres(data.genres.slice(0, 50));
      } catch (error) {
        console.error("Error fetching TV show genres:", error);
      }
    };

    fetchTVGenres();
  }, [isTVShowsTab, formattedLanguage]);

  // Fetch Movie genres
  useEffect(() => {
    if (!isMoviesTab) return;

    const fetchGenres = async () => {
      try {
        const data = await get<any>("/genre/movie/list", {
          api_key: conf().TMDB_READ_API_KEY,
          language: formattedLanguage,
        });
        setGenres(data.genres.slice(0, 50));
      } catch (error) {
        console.error("Error fetching genres:", error);
      }
    };

    fetchGenres();
  }, [isMoviesTab, formattedLanguage]);

  // Fetch Editor Picks Movies
  useEffect(() => {
    if (!isEditorPicksTab) return;

    const fetchEditorPicksMovies = async () => {
      try {
        const moviePromises = EDITOR_PICKS_MOVIES.map((item) =>
          get<any>(`/movie/${item.id}`, {
            api_key: conf().TMDB_READ_API_KEY,
            language: formattedLanguage,
            append_to_response: "videos,images",
          }),
        );

        const results = await Promise.all(moviePromises);
        const moviesWithType = results.map((movie) => ({
          ...movie,
          type: "movie" as const,
        }));
        setFilteredGenreMovies(moviesWithType);
      } catch (error) {
        console.error("Error fetching editor picks movies:", error);
      }
    };

    fetchEditorPicksMovies();
  }, [isEditorPicksTab, formattedLanguage]);

  // Fetch Editor Picks TV Shows
  useEffect(() => {
    if (!isEditorPicksTab) return;

    const fetchEditorPicksTVShows = async () => {
      try {
        const tvShowPromises = EDITOR_PICKS_TV_SHOWS.map((item) =>
          get<any>(`/tv/${item.id}`, {
            api_key: conf().TMDB_READ_API_KEY,
            language: formattedLanguage,
            append_to_response: "videos,images",
          }),
        );

        const results = await Promise.all(tvShowPromises);
        const showsWithType = results.map((show) => ({
          ...show,
          type: "show" as const,
        }));
        setFilteredGenreTVShows(showsWithType);
      } catch (error) {
        console.error("Error fetching editor picks TV shows:", error);
      }
    };

    fetchEditorPicksTVShows();
  }, [isEditorPicksTab, formattedLanguage]);

  // Update recommendations effect to store multiple sources
  useEffect(() => {
    const fetchRecommendations = async () => {
      if (!progressStore.items || Object.keys(progressStore.items).length === 0)
        return;

      try {
        // Get all movies and TV shows from progress
        const progressItems = Object.entries(progressStore.items) as [
          string,
          ProgressMediaItem,
        ][];
        const movies = progressItems.filter(
          ([_, item]) => item.type === "movie",
        );
        const tvShows = progressItems.filter(
          ([_, item]) => item.type === "show",
        );

        // Store all movie sources
        if (movies.length > 0) {
          const movieSources = movies.map(([id, item]) => ({
            id,
            title: item.title || "",
          }));
          setMovieRecommendationSources(movieSources);

          // Set initial source if not set
          if (!selectedMovieSource && movieSources.length > 0) {
            setSelectedMovieSource(movieSources[0].id);
          }
        }

        // Store all TV show sources
        if (tvShows.length > 0) {
          const tvSources = tvShows.map(([id, item]) => ({
            id,
            title: item.title || "",
          }));
          setTVRecommendationSources(tvSources);

          // Set initial source if not set
          if (!selectedTVSource && tvSources.length > 0) {
            setSelectedTVSource(tvSources[0].id);
          }
        }
      } catch (error) {
        console.error("Error setting up recommendation sources:", error);
      }
    };

    fetchRecommendations();
  }, [progressStore.items, selectedMovieSource, selectedTVSource]);

  // Add new effect to fetch recommendations when source changes
  useEffect(() => {
    const fetchRecommendationsForSource = async () => {
      if (!selectedMovieSource && !selectedTVSource) return;

      try {
        // Fetch movie recommendations if we have a selected movie source
        if (selectedMovieSource) {
          const movieResults = await get<any>(
            `/movie/${selectedMovieSource}/recommendations`,
            {
              api_key: conf().TMDB_READ_API_KEY,
              language: formattedLanguage,
            },
          );

          if (movieResults.results?.length > 0) {
            setMovieRecommendations(movieResults.results);
            const sourceMovie = movieRecommendationSources.find(
              (m) => m.id === selectedMovieSource,
            );
            if (sourceMovie) {
              setMovieRecommendationTitle(
                t("discover.carousel.title.recommended", {
                  title: sourceMovie.title,
                }),
              );
              setMovieRecommendationSourceId(selectedMovieSource);
            }
          }
        }

        // Fetch TV show recommendations if we have a selected TV source
        if (selectedTVSource) {
          const tvResults = await get<any>(
            `/tv/${selectedTVSource}/recommendations`,
            {
              api_key: conf().TMDB_READ_API_KEY,
              language: formattedLanguage,
            },
          );

          if (tvResults.results?.length > 0) {
            setTVRecommendations(tvResults.results);
            const sourceTV = tvRecommendationSources.find(
              (show) => show.id === selectedTVSource,
            );
            if (sourceTV) {
              setTVRecommendationTitle(
                t("discover.carousel.title.recommended", {
                  title: sourceTV.title,
                }),
              );
              setTVRecommendationSourceId(selectedTVSource);
            }
          }
        }
      } catch (error) {
        console.error("Error fetching recommendations:", error);
      }
    };

    fetchRecommendationsForSource();
  }, [
    selectedMovieSource,
    selectedTVSource,
    movieRecommendationSources,
    tvRecommendationSources,
    formattedLanguage,
    setMovieRecommendationTitle,
    setTVRecommendationTitle,
    setMovieRecommendationSourceId,
    setTVRecommendationSourceId,
    t,
  ]);

  // Fetch latest releases from Trakt
  useEffect(() => {
    const fetchLatestReleases = async () => {
      if (!isMoviesTab) return;
      setIsLoadingLatest(true);
      try {
        const traktData = await getLatestReleases();
        const moviePromises = traktData.tmdb_ids.slice(0, 20).map(
          (id) =>
            get<any>(`/movie/${id}`, {
              api_key: conf().TMDB_READ_API_KEY,
              language: formattedLanguage,
            }).catch(() => null), // Handle failed TMDB fetches gracefully
        );

        const results = await Promise.all(moviePromises);
        const validMovies = results
          .filter((movie): movie is Movie => movie !== null)
          .map((movie) => ({
            ...movie,
            type: "movie" as const,
          }));
        setLatestReleases(validMovies);
        setIsTraktAvailable(true);
      } catch (error) {
        console.error("Error fetching latest releases:", error);
        setIsTraktAvailable(false);
        // Fallback to TMDB if Trakt fails
        const data = await get<any>("/movie/now_playing", {
          api_key: conf().TMDB_READ_API_KEY,
          language: formattedLanguage,
        });
        setLatestReleases(
          data.results.map((movie: any) => ({
            ...movie,
            type: "movie" as const,
          })),
        );
      } finally {
        setIsLoadingLatest(false);
      }
    };

    fetchLatestReleases();
  }, [isMoviesTab, formattedLanguage]);

  // Fetch 4K releases from Trakt
  useEffect(() => {
    const fetch4KReleases = async () => {
      if (!isMoviesTab) return;
      setIsLoading4K(true);
      try {
        const traktData = await getLatest4KReleases();
        const moviePromises = traktData.tmdb_ids.slice(0, 20).map(
          (id) =>
            get<any>(`/movie/${id}`, {
              api_key: conf().TMDB_READ_API_KEY,
              language: formattedLanguage,
            }).catch(() => null), // Handle failed TMDB fetches gracefully
        );

        const results = await Promise.all(moviePromises);
        const validMovies = results
          .filter((movie): movie is Movie => movie !== null)
          .map((movie) => ({
            ...movie,
            type: "movie" as const,
          }));
        setLatest4KReleases(validMovies);
        setIsTraktAvailable(true);
      } catch (error) {
        console.error("Error fetching 4K releases:", error);
        setIsTraktAvailable(false);
        // Fallback to TMDB if Trakt fails
        const data = await get<any>("/movie/popular", {
          api_key: conf().TMDB_READ_API_KEY,
          language: formattedLanguage,
        });
        setLatest4KReleases(
          data.results.map((movie: any) => ({
            ...movie,
            type: "movie" as const,
          })),
        );
      } finally {
        setIsLoading4K(false);
      }
    };

    fetch4KReleases();
  }, [isMoviesTab, formattedLanguage]);

  const handleShowDetails = async (media: MediaItem | FeaturedMedia) => {
    setDetailsData({
      id: Number(media.id),
      type: media.type === "movie" ? "movie" : "show",
    });
    detailsModal.show();
  };

  // Render Movies content with lazy loading
  const renderMoviesContent = () => {
    return (
      <>
        {/* Movie Recommendations */}
        {movieRecommendations.length > 0 && (
          <LazyMediaCarousel
            medias={movieRecommendations}
            category={movieRecommendationTitle}
            isTVShow={false}
            carouselRefs={carouselRefs}
            onShowDetails={handleShowDetails}
            moreLink={`/discover/more/recommendations/${movieRecommendationSourceId}/movie`}
            moreContent
            recommendationSources={movieRecommendationSources}
            selectedRecommendationSource={selectedMovieSource}
            onRecommendationSourceChange={setSelectedMovieSource}
          />
        )}

        {/* Latest Releases or In Cinemas */}
        {isTraktAvailable ? (
          <LazyMediaCarousel
            medias={isLoadingLatest ? undefined : latestReleases}
            category="Latest Releases"
            isTVShow={false}
            carouselRefs={carouselRefs}
            onShowDetails={handleShowDetails}
            moreContent
          />
        ) : (
          <LazyMediaCarousel
            category={categories[0].name}
            isTVShow={false}
            carouselRefs={carouselRefs}
            onShowDetails={handleShowDetails}
            moreContent
          />
        )}

        {/* Top Rated */}
        <LazyMediaCarousel
          category={categories[1].name}
          isTVShow={false}
          carouselRefs={carouselRefs}
          onShowDetails={handleShowDetails}
          moreContent
        />

        {/* 4K Releases or Popular */}
        {isTraktAvailable ? (
          <LazyMediaCarousel
            medias={isLoading4K ? undefined : latest4KReleases}
            category="4K Releases"
            isTVShow={false}
            carouselRefs={carouselRefs}
            onShowDetails={handleShowDetails}
            moreContent
          />
        ) : (
          <LazyMediaCarousel
            category={categories[2].name}
            isTVShow={false}
            carouselRefs={carouselRefs}
            onShowDetails={handleShowDetails}
            moreContent
          />
        )}

        {/* Provider Movies */}
        <LazyMediaCarousel
          medias={providerMovies}
          category={`Movies on ${selectedProvider.name || ""}`}
          isTVShow={false}
          carouselRefs={carouselRefs}
          onShowDetails={handleShowDetails}
          relatedButtons={MOVIE_PROVIDERS.map((p) => ({
            name: p.name,
            id: p.id,
          }))}
          onButtonClick={(id, name) => setSelectedProvider({ id, name })}
          moreLink={`/discover/more/provider/${selectedProvider.id}/movie`}
          moreContent
        />

        {/* Genre Movies */}
        <LazyMediaCarousel
          medias={filteredGenreMovies}
          category={`${selectedGenre.name || ""}`}
          isTVShow={false}
          carouselRefs={carouselRefs}
          onShowDetails={handleShowDetails}
          relatedButtons={genres.map((g) => ({
            name: g.name,
            id: g.id.toString(),
          }))}
          onButtonClick={(id, name) => setSelectedGenre({ id, name })}
          moreLink={`/discover/more/genre/${selectedGenre.id}/movie`}
          moreContent
        />
      </>
    );
  };

  // Render TV Shows content with lazy loading
  const renderTVShowsContent = () => {
    return (
      <>
        {/* TV Show Recommendations */}
        {tvRecommendations.length > 0 && (
          <LazyMediaCarousel
            medias={tvRecommendations}
            category={tvRecommendationTitle}
            isTVShow
            carouselRefs={carouselRefs}
            onShowDetails={handleShowDetails}
            moreLink={`/discover/more/recommendations/${tvRecommendationSourceId}/tv`}
            moreContent
            recommendationSources={tvRecommendationSources}
            selectedRecommendationSource={selectedTVSource}
            onRecommendationSourceChange={setSelectedTVSource}
          />
        )}

        {/* On Air */}
        <LazyMediaCarousel
          category={tvCategories[0].name}
          isTVShow
          carouselRefs={carouselRefs}
          onShowDetails={handleShowDetails}
          moreContent
        />

        {/* Top Rated */}
        <LazyMediaCarousel
          category={tvCategories[1].name}
          isTVShow
          carouselRefs={carouselRefs}
          onShowDetails={handleShowDetails}
          moreContent
        />

        {/* Popular */}
        <LazyMediaCarousel
          category={tvCategories[2].name}
          isTVShow
          carouselRefs={carouselRefs}
          onShowDetails={handleShowDetails}
          moreContent
        />

        {/* Provider TV Shows */}
        <LazyMediaCarousel
          medias={providerTVShows}
          category={`Shows on ${selectedProvider.name || ""}`}
          isTVShow
          carouselRefs={carouselRefs}
          onShowDetails={handleShowDetails}
          relatedButtons={TV_PROVIDERS.map((p) => ({
            name: p.name,
            id: p.id,
          }))}
          onButtonClick={(id, name) => setSelectedProvider({ id, name })}
          moreLink={`/discover/more/provider/${selectedProvider.id}/tv`}
          moreContent
        />

        {/* Genre TV Shows */}
        <LazyMediaCarousel
          medias={filteredGenreTVShows}
          category={`${selectedGenre.name || ""}`}
          isTVShow
          carouselRefs={carouselRefs}
          onShowDetails={handleShowDetails}
          relatedButtons={tvGenres.map((g) => ({
            name: g.name,
            id: g.id.toString(),
          }))}
          onButtonClick={(id, name) => setSelectedGenre({ id, name })}
          moreLink={`/discover/more/genre/${selectedGenre.id}/tv`}
          moreContent
        />
      </>
    );
  };

  // Render Editor Picks content
  const renderEditorPicksContent = () => {
    return (
      <>
        <LazyMediaCarousel
          preloadedMedia={filteredGenreMovies}
          title="Editor Picks"
          isTVShow={false}
          carouselRefs={carouselRefs}
          onShowDetails={handleShowDetails}
          moreContent
        />
        <LazyMediaCarousel
          preloadedMedia={filteredGenreTVShows}
          title="Editor Picks"
          isTVShow
          carouselRefs={carouselRefs}
          onShowDetails={handleShowDetails}
          moreContent
        />
      </>
    );
  };

  return (
    <div className="relative min-h-screen">
      <DiscoverNavigation
        selectedCategory={selectedCategory}
        onCategoryChange={handleCategoryChange}
      />

      <WideContainer ultraWide classNames="!px-0">
        {/* Movies Tab */}
        <LazyTabContent isActive={isMoviesTab}>
          {renderMoviesContent()}
        </LazyTabContent>

        {/* TV Shows Tab */}
        <LazyTabContent isActive={isTVShowsTab}>
          {renderTVShowsContent()}
        </LazyTabContent>

        {/* Editor Picks Tab */}
        <LazyTabContent isActive={isEditorPicksTab}>
          {renderEditorPicksContent()}
        </LazyTabContent>
      </WideContainer>

      <ScrollToTopButton />

      {detailsData && <DetailsModal id="discover-details" data={detailsData} />}
    </div>
  );
}

export default DiscoverContent;
