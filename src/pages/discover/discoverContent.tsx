import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";

import { get } from "@/backend/metadata/tmdb";
import { IdOnlyMediaCard } from "@/components/media/IdOnlyMediaCard";
import { useIsMobile } from "@/hooks/useIsMobile";
import {
  Genre,
  Movie,
  categories,
  tvCategories,
} from "@/pages/discover/common";
import { conf } from "@/setup/config";

import "./discover.css";
import { CategoryButtons } from "./components/CategoryButtons";
import { LazyMediaCarousel } from "./components/LazyMediaCarousel";
import { LazyTabContent } from "./components/LazyTabContent";
import { MediaCarousel } from "./components/MediaCarousel";
import { RandomMovieButton } from "./components/RandomMovieButton";
import { ScrollToTopButton } from "./components/ScrollToTopButton";
import { EDITOR_PICKS_MOVIES, EDITOR_PICKS_TV_SHOWS } from "./EditorPicks";
import { useTMDBData } from "./hooks/useTMDBData";

const MOVIE_PROVIDERS = [
  { name: "Netflix", id: "8" },
  { name: "Apple TV+", id: "2" },
  { name: "Amazon Prime Video", id: "10" },
  { name: "Hulu", id: "15" },
  { name: "Max", id: "1899" },
  { name: "Paramount Plus", id: "531" },
  { name: "Disney Plus", id: "337" },
  { name: "Shudder", id: "99" },
];

const TV_PROVIDERS = [
  { name: "Netflix", id: "8" },
  { name: "Apple TV+", id: "350" },
  { name: "Paramount Plus", id: "531" },
  { name: "Hulu", id: "15" },
  { name: "Max", id: "1899" },
  { name: "Disney Plus", id: "337" },
  { name: "fubuTV", id: "257" },
];

// Modal component to show all items
function MoreItemsModal({
  isModalOpen,
  modalTitle,
  modalItems,
  onClose,
}: {
  isModalOpen: boolean;
  modalTitle: string;
  modalItems: { id: string; type: "movie" | "show" }[];
  onClose: () => void;
}) {
  if (!isModalOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/80"
      onClick={onClose}
    >
      <div
        className="bg-background-main rounded-xl max-w-[90vw] max-h-[90vh] overflow-y-auto p-6"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-bold">{modalTitle}</h2>
          <button
            type="button"
            className="p-2 rounded-full hover:bg-gray-700/50"
            onClick={onClose}
          >
            ✕
          </button>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
          {modalItems.map((item) => (
            <div key={item.id}>
              <IdOnlyMediaCard id={item.id} mediaType={item.type} linkable />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function BackendDiscoverContent() {
  interface TraktMovie {
    title: string;
    year: number;
    ids: {
      trakt: number;
      slug: string;
      tmdb: number;
    };
  }

  interface DiscoverResponse {
    mostWatched: {
      watcher_count: number;
      play_count: number;
      collected_count: number;
      movie: TraktMovie;
    }[];
    lastWeekend: {
      revenue: number;
      movie: TraktMovie;
    }[];
    trending: TraktMovie[];
    traktLists: {
      name: string;
      likes: number;
      items: {
        type: "movie" | "show";
        name: string;
        year: number;
        id: number; // TMDbID
      }[];
    }[];
  }

  const [discoverData, setDiscoverData] = useState<DiscoverResponse | null>(
    null,
  );
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [visibleListCount, setVisibleListCount] = useState(5);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalItems, setModalItems] = useState<
    { id: string; type: "movie" | "show" }[]
  >([]);
  const [modalTitle, setModalTitle] = useState("");

  const carouselRefs = useRef<{ [key: string]: HTMLDivElement | null }>({});

  useEffect(() => {
    const fetchDiscoverData = async () => {
      try {
        setIsLoading(true);
        setError(null);

        const response = await fetch("https://backend.fifthwit.net/discover");

        if (!response.ok) {
          throw new Error(`Failed to fetch discover data: ${response.status}`);
        }

        const data: DiscoverResponse = await response.json();
        setDiscoverData(data);
      } catch (err) {
        console.error("Error fetching discover data:", err);
        setError("Failed to load discover content. Please try again later.");
      } finally {
        setIsLoading(false);
      }
    };

    fetchDiscoverData();
  }, []);

  const openModal = (items: any[], title: string) => {
    const formattedItems = items.map((item) => {
      if ("movie" in item) {
        return {
          id: item.movie.ids.tmdb.toString(),
          type: "movie",
        };
      }
      if ("ids" in item) {
        return {
          id: item.ids.tmdb.toString(),
          type: "movie",
        };
      }
      return {
        id: item.id.toString(),
        type: item.type,
      };
    });

    setModalItems(formattedItems);
    setModalTitle(title);
    setIsModalOpen(true);
  };

  const loadMoreLists = () => {
    setVisibleListCount((prev) => prev + 5);
  };

  const renderCarouselSection = (
    title: string,
    items: any[],
    keyPrefix: string,
    type: "movie" | "show" = "movie",
  ) => {
    if (!items?.length) return null;

    const limitedItems = items.slice(0, 20);
    const hasMoreItems = items.length > 20;

    return (
      <div
        className="section mb-8"
        ref={(el) => {
          carouselRefs.current[keyPrefix] = el;
        }}
      >
        <h2 className="text-2xl font-bold mb-4 px-4">{title}</h2>
        <div className="relative">
          <div className="flex overflow-x-auto scrollbar-hide py-4 px-4 gap-4">
            {limitedItems.map((item) => (
              <div
                key={`${crypto.randomUUID()}`} // THANKS ESLINT
                className="flex-none w-[160px] md:w-[200px]"
              >
                <IdOnlyMediaCard
                  id={
                    "movie" in item
                      ? item.movie.ids.tmdb.toString()
                      : "ids" in item
                        ? item.ids.tmdb.toString()
                        : item.id.toString()
                  }
                  mediaType={"type" in item ? item.type : type}
                  linkable
                />
              </div>
            ))}
            {hasMoreItems && (
              <div
                className="flex-none w-[160px] md:w-[200px] aspect-[2/3] rounded-xl bg-mediaCard-hoverBackground/30 flex items-center justify-center cursor-pointer hover:bg-mediaCard-hoverBackground/50 transition-colors"
                onClick={() => openModal(items, title)}
              >
                <div className="text-center p-4">
                  <div className="text-xl font-bold mb-2">View All</div>
                  <div className="text-sm">{items.length} items</div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  };

  if (isLoading) {
    return (
      <div className="flex justify-center items-center min-h-[400px]">
        <div className="animate-pulse flex flex-col gap-4 w-full max-w-4xl">
          <div className="h-8 bg-mediaCard-hoverBackground/20 rounded-md w-2/5 mx-auto" />
          <div className="flex overflow-x-auto py-4 gap-4 px-4">
            {[...Array(6)].map((_) => (
              <div
                key={`${crypto.randomUUID}`}
                className="flex-none w-[160px] md:w-[200px] aspect-[2/3] rounded-xl bg-mediaCard-hoverBackground/20"
              />
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (error || !discoverData) {
    return (
      <div className="flex justify-center items-center min-h-[300px]">
        <div className="text-center p-4 max-w-md">
          <h3 className="text-xl font-semibold mb-2">Something went wrong</h3>
          <p className="text-type-secondary">
            {error || "Failed to load content"}
          </p>
        </div>
      </div>
    );
  }

  const visibleTraktLists =
    discoverData.traktLists?.slice(0, visibleListCount) || [];
  const hasMoreLists =
    discoverData.traktLists &&
    visibleListCount < discoverData.traktLists.length;

  return (
    <div className="backend-discover-container py-6 space-y-4">
      {renderCarouselSection(
        "Most Watched",
        discoverData.mostWatched,
        "most-watched",
      )}
      {renderCarouselSection(
        "Box Office",
        discoverData.lastWeekend,
        "box-office",
      )}
      {renderCarouselSection("Trending", discoverData.trending, "trending")}

      {visibleTraktLists.map((list) =>
        renderCarouselSection(
          list.name,
          list.items,
          `list-${list.name}`,
          "type" in list.items[0] ? undefined : "movie",
        ),
      )}

      {hasMoreLists && (
        <div className="flex justify-center py-4">
          <button
            type="button"
            className="px-6 py-2 bg-mediaCard-hoverBackground/30 rounded-full hover:bg-mediaCard-hoverBackground/50 transition-colors"
            onClick={loadMoreLists}
          >
            Load More Lists
          </button>
        </div>
      )}

      {/* Modal for showing all items */}
      <MoreItemsModal
        isModalOpen={isModalOpen}
        modalTitle={modalTitle}
        modalItems={modalItems}
        onClose={() => setIsModalOpen(false)}
      />
    </div>
  );
}

export function DiscoverContent() {
  // State management
  const [selectedCategory, setSelectedCategory] = useState("movies");
  const [genres, setGenres] = useState<Genre[]>([]);
  const [tvGenres, setTVGenres] = useState<Genre[]>([]);
  const [randomMovie, setRandomMovie] = useState<Movie | null>(null);
  const [countdown, setCountdown] = useState<number | null>(null);
  const [countdownTimeout, setCountdownTimeout] =
    useState<NodeJS.Timeout | null>(null);
  const [selectedProvider, setSelectedProvider] = useState({
    name: "",
    id: "",
  });
  const [providerMovies, setProviderMovies] = useState<Movie[]>([]);
  const [providerTVShows, setProviderTVShows] = useState<any[]>([]);
  const [editorPicksMovies, setEditorPicksMovies] = useState<Movie[]>([]);
  const [editorPicksTVShows, setEditorPicksTVShows] = useState<any[]>([]);

  // Refs
  const carouselRefs = useRef<{ [key: string]: HTMLDivElement | null }>({});

  // Hooks
  const navigate = useNavigate();
  const { isMobile } = useIsMobile();
  const { genreMedia: genreMovies } = useTMDBData(genres, categories, "movie");
  // const { genreMedia: genreTVShows } = useTMDBData(
  //   tvGenres,
  //   tvCategories,
  //   "tv",
  // );

  // Only load data for the active tab
  const isMoviesTab = selectedCategory === "movies";
  const isTVShowsTab = selectedCategory === "tvshows";
  const isEditorPicksTab = selectedCategory === "editorpicks";
  const isBackendTab = selectedCategory === "backend";

  // Fetch TV show genres
  useEffect(() => {
    if (!isTVShowsTab) return;

    const fetchTVGenres = async () => {
      try {
        const data = await get<any>("/genre/tv/list", {
          api_key: conf().TMDB_READ_API_KEY,
          language: "en-US",
        });
        // Fetch only the first 10 TV show genres
        setTVGenres(data.genres.slice(0, 10));
      } catch (error) {
        console.error("Error fetching TV show genres:", error);
      }
    };

    fetchTVGenres();
  }, [isTVShowsTab]);

  // Fetch Movie genres
  useEffect(() => {
    if (!isMoviesTab) return;

    const fetchGenres = async () => {
      try {
        const data = await get<any>("/genre/movie/list", {
          api_key: conf().TMDB_READ_API_KEY,
          language: "en-US",
        });

        // Fetch only the first 12 genres
        setGenres(data.genres.slice(0, 12));
      } catch (error) {
        console.error("Error fetching genres:", error);
      }
    };

    fetchGenres();
  }, [isMoviesTab]);

  // Fetch Editor Picks Movies
  useEffect(() => {
    if (!isEditorPicksTab) return;

    const fetchEditorPicksMovies = async () => {
      try {
        const moviePromises = EDITOR_PICKS_MOVIES.map((item) =>
          get<any>(`/movie/${item.id}`, {
            api_key: conf().TMDB_READ_API_KEY,
            language: "en-US",
            append_to_response: "videos,images",
          }),
        );

        const results = await Promise.all(moviePromises);
        // Shuffle the results to display them randomly
        const shuffled = [...results].sort(() => 0.5 - Math.random());
        setEditorPicksMovies(shuffled);
      } catch (error) {
        console.error("Error fetching editor picks movies:", error);
      }
    };

    fetchEditorPicksMovies();
  }, [isEditorPicksTab]);

  // Fetch Editor Picks TV Shows
  useEffect(() => {
    if (!isEditorPicksTab) return;

    const fetchEditorPicksTVShows = async () => {
      try {
        const tvShowPromises = EDITOR_PICKS_TV_SHOWS.map((item) =>
          get<any>(`/tv/${item.id}`, {
            api_key: conf().TMDB_READ_API_KEY,
            language: "en-US",
            append_to_response: "videos,images",
          }),
        );

        const results = await Promise.all(tvShowPromises);
        // Shuffle the results to display them randomly
        const shuffled = [...results].sort(() => 0.5 - Math.random());
        setEditorPicksTVShows(shuffled);
      } catch (error) {
        console.error("Error fetching editor picks TV shows:", error);
      }
    };

    fetchEditorPicksTVShows();
  }, [isEditorPicksTab]);

  useEffect(() => {
    let countdownInterval: NodeJS.Timeout;
    if (countdown !== null && countdown > 0) {
      countdownInterval = setInterval(() => {
        setCountdown((prev) => (prev !== null ? prev - 1 : prev));
      }, 1000);
    }
    return () => clearInterval(countdownInterval);
  }, [countdown]);

  // Handlers
  const handleCategoryChange = (
    eventOrValue: React.ChangeEvent<HTMLSelectElement> | string,
  ) => {
    const value =
      typeof eventOrValue === "string"
        ? eventOrValue
        : eventOrValue.target.value;
    setSelectedCategory(value);
  };

  const handleRandomMovieClick = () => {
    const allMovies = Object.values(genreMovies).flat();
    const uniqueTitles = new Set(allMovies.map((movie) => movie.title));
    const uniqueTitlesArray = Array.from(uniqueTitles);
    const randomIndex = Math.floor(Math.random() * uniqueTitlesArray.length);
    const selectedMovie = allMovies.find(
      (movie) => movie.title === uniqueTitlesArray[randomIndex],
    );

    if (selectedMovie) {
      if (countdown !== null && countdown > 0) {
        setCountdown(null);
        if (countdownTimeout) {
          clearTimeout(countdownTimeout);
          setCountdownTimeout(null);
          setRandomMovie(null);
        }
      } else {
        setRandomMovie(selectedMovie as Movie);
        setCountdown(5);
        const timeoutId = setTimeout(() => {
          navigate(`/media/tmdb-movie-${selectedMovie.id}-discover-random`);
        }, 5000);
        setCountdownTimeout(timeoutId);
      }
    }
  };

  const handleProviderClick = async (id: string, name: string) => {
    try {
      setSelectedProvider({ name, id });
      const endpoint =
        selectedCategory === "movies" ? "/discover/movie" : "/discover/tv";
      const setData =
        selectedCategory === "movies" ? setProviderMovies : setProviderTVShows;
      const data = await get<any>(endpoint, {
        api_key: conf().TMDB_READ_API_KEY,
        with_watch_providers: id,
        watch_region: "US",
        language: "en-US",
      });
      setData(data.results);
    } catch (error) {
      console.error("Error fetching provider movies/shows:", error);
    }
  };

  const handleCategoryClick = (id: string, name: string) => {
    const categorySlug = name.toLowerCase().replace(/[^a-z0-9]+/g, "-");
    const element = document.getElementById(`carousel-${categorySlug}`);

    if (element) {
      element.scrollIntoView({
        behavior: "smooth",
        block: "center",
      });
    }
  };

  // Render Editor Picks content
  const renderEditorPicksContent = () => {
    return (
      <div>
        <LazyMediaCarousel
          preloadedMedia={editorPicksMovies}
          title="Editor Picks"
          mediaType="movie"
          isMobile={isMobile}
          carouselRefs={carouselRefs}
        />
        <LazyMediaCarousel
          preloadedMedia={editorPicksTVShows}
          title="Editor Picks"
          mediaType="tv"
          isMobile={isMobile}
          carouselRefs={carouselRefs}
        />
      </div>
    );
  };

  // Render Movies content with lazy loading
  const renderMoviesContent = () => {
    return (
      <>
        {/* Provider Movies */}
        {providerMovies.length > 0 && (
          <MediaCarousel
            medias={providerMovies}
            category={selectedProvider.name}
            isTVShow={false}
            isMobile={isMobile}
            carouselRefs={carouselRefs}
          />
        )}

        {/* Categories */}
        {categories.map((category) => (
          <LazyMediaCarousel
            key={category.name}
            category={category}
            mediaType="movie"
            isMobile={isMobile}
            carouselRefs={carouselRefs}
          />
        ))}

        {/* Genres */}
        {genres.map((genre) => (
          <LazyMediaCarousel
            key={genre.id}
            genre={genre}
            mediaType="movie"
            isMobile={isMobile}
            carouselRefs={carouselRefs}
          />
        ))}
      </>
    );
  };

  // Render TV Shows content with lazy loading
  const renderTVShowsContent = () => {
    return (
      <>
        {/* Provider TV Shows */}
        {providerTVShows.length > 0 && (
          <MediaCarousel
            medias={providerTVShows}
            category={selectedProvider.name}
            isTVShow
            isMobile={isMobile}
            carouselRefs={carouselRefs}
          />
        )}

        {/* Categories */}
        {tvCategories.map((category) => (
          <LazyMediaCarousel
            key={category.name}
            category={category}
            mediaType="tv"
            isMobile={isMobile}
            carouselRefs={carouselRefs}
          />
        ))}

        {/* Genres */}
        {tvGenres.map((genre) => (
          <LazyMediaCarousel
            key={genre.id}
            genre={genre}
            mediaType="tv"
            isMobile={isMobile}
            carouselRefs={carouselRefs}
          />
        ))}
      </>
    );
  };

  return (
    <div className="pt-6">
      \{/* Random Movie Button */}
      <RandomMovieButton
        countdown={countdown}
        onClick={handleRandomMovieClick}
        randomMovieTitle={randomMovie ? randomMovie.title : null}
      />
      {/* Category Tabs */}
      <div className="mt-8 pb-2 w-full max-w-screen-xl mx-auto">
        <div className="relative flex justify-center mb-4">
          <div className="flex space-x-4">
            {["movies", "tvshows", "editorpicks", "backend"].map((category) => (
              <button
                key={category}
                type="button"
                className={`text-xl md:text-2xl font-bold p-2 bg-transparent text-center rounded-full cursor-pointer flex items-center transition-transform duration-200 ${
                  selectedCategory === category
                    ? "transform scale-105 text-type-link"
                    : "text-type-secondary"
                }`}
                onClick={() => handleCategoryChange(category)}
              >
                {category === "movies"
                  ? "Movies"
                  : category === "tvshows"
                    ? "TV Shows"
                    : category === "editorpicks"
                      ? "Editor Picks"
                      : "Discover"}
              </button>
            ))}
          </div>
        </div>

        {/* Only show provider and genre buttons for movies and tvshows categories */}
        {selectedCategory !== "editorpicks" &&
          selectedCategory !== "backend" && (
            <>
              <div className="flex justify-center overflow-x-auto">
                <CategoryButtons
                  categories={
                    selectedCategory === "movies"
                      ? MOVIE_PROVIDERS
                      : TV_PROVIDERS
                  }
                  onCategoryClick={handleProviderClick}
                  categoryType="providers"
                  isMobile={isMobile}
                  showAlwaysScroll={false}
                />
              </div>
              <div className="flex overflow-x-auto">
                <CategoryButtons
                  categories={
                    selectedCategory === "movies"
                      ? [...categories, ...genres]
                      : [...tvCategories, ...tvGenres]
                  }
                  onCategoryClick={handleCategoryClick}
                  categoryType="movies"
                  isMobile={isMobile}
                  showAlwaysScroll
                />
              </div>
            </>
          )}
      </div>
      {/* Content Section with Lazy Loading Tabs */}
      <div className="w-full md:w-[90%] max-w-[2400px] mx-auto">
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

        {/* Amazing data from backend.fifthwit.net/discover */}
        <LazyTabContent isActive={isBackendTab}>
          <BackendDiscoverContent />
        </LazyTabContent>
      </div>
      <ScrollToTopButton />
    </div>
  );
}

export default DiscoverContent;
