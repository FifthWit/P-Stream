import { useEffect, useState } from "react";
import { Helmet } from "react-helmet-async";
import { useTranslation } from "react-i18next";

import { get } from "@/backend/metadata/tmdb";
import { DetailsModal } from "@/components/overlays/DetailsModal";
import { useModal } from "@/components/overlays/Modal";
import { useIsMobile } from "@/hooks/useIsMobile";
import {
  Genre,
  Movie,
  categories,
  tvCategories,
} from "@/pages/discover/common";
import { conf } from "@/setup/config";
import { useLanguageStore } from "@/stores/language";
import { getTmdbLanguageCode } from "@/utils/language";

import { SubPageLayout } from "../layouts/SubPageLayout";
import { CategoryButtons } from "./components/CategoryButtons";
import { DiscoverNavigation } from "./components/DiscoverNavigation";
import { FeaturedCarousel } from "./components/FeaturedCarousel";
import type { FeaturedMedia } from "./components/FeaturedCarousel";
import { RandomMovieButton } from "./components/RandomMovieButton";
import DiscoverContent, {
  EDITOR_PICKS_MOVIES,
  EDITOR_PICKS_TV_SHOWS,
} from "./discoverContent";
import { useTMDBData } from "./hooks/useTMDBData";
import { PageTitle } from "../parts/util/PageTitle";

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
  { name: "Amazon Prime Video", id: "10" },
  { name: "Paramount Plus", id: "531" },
  { name: "Hulu", id: "15" },
  { name: "Max", id: "1899" },
  { name: "Disney Plus", id: "337" },
  { name: "fubuTV", id: "257" },
];

interface FeaturedMovie extends Movie {
  backdrop_path: string;
  overview: string;
  type: "movie";
}

interface DiscoverContentProps {
  selectedCategory: string;
  selectedProvider: {
    name: string;
    id: string;
  };
}

function DiscoverContentWithProps(props: DiscoverContentProps) {
  return <DiscoverContent {...props} />;
}

export function Discover() {
  const [selectedCategory, setSelectedCategory] = useState("movies");
  const [featuredMedia, setFeaturedMedia] = useState<FeaturedMedia[]>([]);
  const [selectedProvider, setSelectedProvider] = useState({
    name: "",
    id: "",
  });
  const [genres, setGenres] = useState<Genre[]>([]);
  const [tvGenres, setTVGenres] = useState<Genre[]>([]);
  const [detailsData, setDetailsData] = useState<any>();
  const detailsModal = useModal("discover-details");
  const { genreMedia: genreMovies } = useTMDBData(genres, categories, "movie");
  const { isMobile } = useIsMobile();
  const { t } = useTranslation();
  const userLanguage = useLanguageStore.getState().language;
  const formattedLanguage = getTmdbLanguageCode(userLanguage);

  // Fetch genres
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
        setGenres(movieData.genres.slice(0, 12));
        setTVGenres(tvData.genres.slice(0, 10));
      } catch (error) {
        console.error("Error fetching genres:", error);
      }
    };

    fetchGenres();
  }, [formattedLanguage]);

  // Fetch featured media
  useEffect(() => {
    const fetchFeaturedMedia = async () => {
      try {
        if (selectedCategory === "movies") {
          const data = await get<any>("/movie/popular", {
            api_key: conf().TMDB_READ_API_KEY,
            language: formattedLanguage,
          });
          setFeaturedMedia(
            data.results.slice(0, 5).map((movie: any) => ({
              ...movie,
              type: "movie" as const,
            })),
          );
        } else if (selectedCategory === "tvshows") {
          const data = await get<any>("/tv/popular", {
            api_key: conf().TMDB_READ_API_KEY,
            language: formattedLanguage,
          });
          setFeaturedMedia(
            data.results.slice(0, 5).map((show: any) => ({
              ...show,
              type: "show" as const,
            })),
          );
        } else if (selectedCategory === "editorpicks") {
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
          setFeaturedMedia(combined);
        }
      } catch (error) {
        console.error("Error fetching featured media:", error);
      }
    };

    fetchFeaturedMedia();
  }, [formattedLanguage, selectedCategory]);

  const handleCategoryChange = (category: string) => {
    setSelectedCategory(category);
  };

  const handleProviderClick = async (id: string, name: string) => {
    setSelectedProvider({ name, id });
  };

  const handleCategoryClick = (id: string, name: string) => {
    const categorySlugBase = name.toLowerCase().replace(/[^a-z0-9]+/g, "-");
    const movieElement = document.getElementById(
      `carousel-${categorySlugBase}-movie`,
    );
    const tvElement = document.getElementById(
      `carousel-${categorySlugBase}-tv`,
    );

    const element = selectedCategory === "tvshows" ? tvElement : movieElement;
    if (element) {
      element.scrollIntoView({
        behavior: "smooth",
        block: "center",
      });
    }
  };

  const handleShowDetails = (media: FeaturedMedia) => {
    setDetailsData({
      id: Number(media.id),
      type: media.type,
    });
    detailsModal.show();
  };

  return (
    <SubPageLayout>
      <Helmet>
        {/* Hide scrollbar */}
        <style type="text/css">{`
            html, body {
              scrollbar-width: none;
              -ms-overflow-style: none;
            }
          `}</style>
      </Helmet>

      <PageTitle subpage k="global.pages.discover" />

      {/* Main background */}
      <div className="fixed inset-0 bg-background-main" />

      <div className="!mt-[-170px]">
        {/* Featured Carousel */}
        {featuredMedia.length > 0 && (
          <FeaturedCarousel
            media={featuredMedia}
            onShowDetails={handleShowDetails}
          />
        )}
      </div>

      {/* Random Movie Button */}
      <RandomMovieButton
        allMovies={Object.values(genreMovies)
          .flat()
          .filter((media): media is Movie => "title" in media)}
      />

      {/* Navigation */}
      <div className="relative z-30">
        <DiscoverNavigation
          selectedCategory={selectedCategory}
          selectedProvider={selectedProvider}
          genres={genres}
          tvGenres={tvGenres}
          onCategoryChange={handleCategoryChange}
          onProviderClick={handleProviderClick}
          onCategoryClick={handleCategoryClick}
        />
      </div>

      {/* Main Content */}
      <div className="relative z-20">
        <DiscoverContentWithProps
          selectedCategory={selectedCategory}
          selectedProvider={selectedProvider}
        />
      </div>

      {detailsData && <DetailsModal id="discover-details" data={detailsData} />}
    </SubPageLayout>
  );
}
