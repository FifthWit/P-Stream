import { useTranslation } from "react-i18next";

import { useIsMobile } from "@/hooks/useIsMobile";
import { categories, tvCategories } from "@/pages/discover/common";

import { CategoryButtons } from "./CategoryButtons";

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

interface DiscoverNavigationProps {
  selectedCategory: string;
  genres: any[];
  tvGenres: any[];
  onCategoryChange: (category: string) => void;
  onProviderClick: (id: string, name: string) => void;
  onCategoryClick: (id: string, name: string) => void;
}

export function DiscoverNavigation({
  selectedCategory,
  genres,
  tvGenres,
  onCategoryChange,
  onProviderClick,
  onCategoryClick,
}: DiscoverNavigationProps) {
  const { isMobile } = useIsMobile();
  const { t } = useTranslation();

  return (
    <div className="mt-8 pb-2 w-full max-w-screen-xl mx-auto">
      <div className="relative flex justify-center mb-4">
        <div className="flex space-x-4">
          {["movies", "tvshows", "editorpicks"].map((category) => (
            <button
              key={category}
              type="button"
              className={`text-xl md:text-2xl font-bold p-2 bg-transparent text-center rounded-full cursor-pointer flex items-center transition-transform duration-200 ${
                selectedCategory === category
                  ? "transform scale-105 text-type-link"
                  : "text-type-secondary"
              }`}
              onClick={() => onCategoryChange(category)}
            >
              {t(`discover.tabs.${category}`)}
            </button>
          ))}
        </div>
      </div>

      {/* Only show provider and genre buttons for movies and tvshows categories */}
      {selectedCategory !== "editorpicks" && (
        <>
          <div className="flex justify-center overflow-x-auto">
            <CategoryButtons
              categories={
                selectedCategory === "movies" ? MOVIE_PROVIDERS : TV_PROVIDERS
              }
              onCategoryClick={onProviderClick}
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
              onCategoryClick={onCategoryClick}
              categoryType="movies"
              isMobile={isMobile}
              showAlwaysScroll
            />
          </div>
        </>
      )}
    </div>
  );
}
