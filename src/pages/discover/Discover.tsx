import { useEffect, useState } from "react";
import { Helmet } from "react-helmet-async";

import { get } from "@/backend/metadata/tmdb";
import { DetailsModal } from "@/components/overlays/DetailsModal";
import { useModal } from "@/components/overlays/Modal";
import { Genre } from "@/pages/discover/common";
import { conf } from "@/setup/config";
import { useLanguageStore } from "@/stores/language";
import { getTmdbLanguageCode } from "@/utils/language";

import { SubPageLayout } from "../layouts/SubPageLayout";
import { DiscoverNavigation } from "./components/DiscoverNavigation";
import { FeaturedCarousel } from "./components/FeaturedCarousel";
import type { FeaturedMedia } from "./components/FeaturedCarousel";
import DiscoverContent from "./discoverContent";
import { PageTitle } from "../parts/util/PageTitle";

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
  const [selectedCategory, setSelectedCategory] = useState<
    "movies" | "tvshows" | "editorpicks"
  >("movies");
  const [selectedProvider, setSelectedProvider] = useState({
    name: "",
    id: "",
  });
  const [genres, setGenres] = useState<Genre[]>([]);
  const [tvGenres, setTVGenres] = useState<Genre[]>([]);
  const [detailsData, setDetailsData] = useState<any>();
  const detailsModal = useModal("discover-details");

  // Clear details data when modal is closed
  useEffect(() => {
    if (!detailsModal.isShown) {
      setDetailsData(undefined);
    }
  }, [detailsModal.isShown]);

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

  const handleCategoryChange = (category: string) => {
    setSelectedCategory(category as "movies" | "tvshows" | "editorpicks");
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

      <div className="!mt-[-170px]">
        {/* Featured Carousel */}
        <FeaturedCarousel
          category={selectedCategory}
          onShowDetails={handleShowDetails}
        />
      </div>

      {/* Random Movie Button */}
      {/* <RandomMovieButton
        allMovies={Object.values(genreMovies)
          .flat()
          .filter((media): media is Movie => "title" in media)}
      /> */}

      {/* Navigation */}
      <div className="relative z-30">
        <DiscoverNavigation
          selectedCategory={selectedCategory}
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
