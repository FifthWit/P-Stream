import React from "react";
import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";
import { useWindowSize } from "react-use";

import { Dropdown, OptionItem } from "@/components/form/Dropdown";
import { Icon, Icons } from "@/components/Icon";
import { MediaCard } from "@/components/media/MediaCard";
import { Media } from "@/pages/discover/common";
import { MediaItem } from "@/utils/mediaTypes";

import { CarouselNavButtons } from "./CarouselNavButtons";

interface MediaCarouselProps {
  medias: Media[];
  category: string;
  isTVShow: boolean;
  isMobile: boolean;
  carouselRefs: React.MutableRefObject<{
    [key: string]: HTMLDivElement | null;
  }>;
  onShowDetails?: (media: MediaItem) => void;
  genreId?: number;
  moreContent?: boolean;
  moreLink?: string;
  relatedButtons?: Array<{ name: string; id: string }>;
  onButtonClick?: (id: string, name: string) => void;
}

function MediaCardSkeleton() {
  return (
    <div className="relative mt-4 group cursor-default user-select-none rounded-xl p-2 bg-transparent transition-colors duration-300 w-[10rem] md:w-[11.5rem] h-auto">
      <div className="animate-pulse">
        <div className="w-full aspect-[2/3] bg-mediaCard-hoverBackground rounded-lg" />
        <div className="mt-2 h-4 bg-mediaCard-hoverBackground rounded w-3/4" />
      </div>
    </div>
  );
}

export function MediaCarousel({
  medias,
  category,
  isTVShow,
  isMobile,
  carouselRefs,
  onShowDetails,
  genreId,
  moreContent,
  moreLink,
  relatedButtons,
  onButtonClick,
}: MediaCarouselProps) {
  const { t } = useTranslation();
  const { width: windowWidth } = useWindowSize();
  const [selectedGenre, setSelectedGenre] = React.useState<OptionItem | null>(
    null,
  );
  const categorySlug = `${category.toLowerCase().replace(/[^a-z0-9]+/g, "-")}-${isTVShow ? "tv" : "movie"}`;
  const browser = !!window.chrome;
  let isScrolling = false;

  const handleWheel = (e: React.WheelEvent) => {
    if (isScrolling) return;
    isScrolling = true;

    if (Math.abs(e.deltaX) > Math.abs(e.deltaY)) {
      e.stopPropagation();
      e.preventDefault();
    }

    if (browser) {
      setTimeout(() => {
        isScrolling = false;
      }, 345);
    } else {
      isScrolling = false;
    }
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
      return isTVShow
        ? t("discover.carousel.title.editorPicksShows")
        : t("discover.carousel.title.editorPicksMovies");
    }

    if (categoryName.includes("Movies on")) {
      return t("discover.carousel.title.moviesOn", {
        provider: categoryName.split(" ")[2],
      });
    }

    if (categoryName.includes("Shows on")) {
      return t("discover.carousel.title.tvshowsOn", {
        provider: categoryName.split(" ")[2],
      });
    }

    return isTVShowCondition
      ? t("discover.carousel.title.tvshows", { category: categoryName })
      : t("discover.carousel.title.movies", { category: categoryName });
  }

  const displayCategory = getDisplayCategory(category, isTVShow);

  const filteredMedias = medias
    .filter(
      (media, index, self) =>
        index ===
        self.findIndex((m) => m.id === media.id && m.title === media.title),
    )
    .slice(0, 20);

  const SKELETON_COUNT = 10;

  const visibleButtons = relatedButtons
    ? windowWidth > 850
      ? relatedButtons.slice(0, 5)
      : relatedButtons.slice(0, 0)
    : [];

  const dropdownButtons = relatedButtons
    ? windowWidth > 850
      ? relatedButtons.slice(5)
      : relatedButtons.slice(0)
    : [];

  const dropdownOptions: OptionItem[] = dropdownButtons.map((button) => ({
    id: button.id,
    name: button.name,
  }));

  return (
    <>
      <div className="flex items-center justify-between ml-2 md:ml-8 mt-2">
        <div className="flex gap-4 items-center">
          <h2 className="text-2xl cursor-default font-bold text-white md:text-2xl pl-5 text-balance">
            {displayCategory}
          </h2>
        </div>
        {relatedButtons && relatedButtons.length > 0 && (
          <div className="flex items-center space-x-2 mr-6">
            {visibleButtons?.map((button) => (
              <button
                type="button"
                key={button.id}
                onClick={() => onButtonClick?.(button.id, button.name)}
                className="px-3 py-1 text-sm bg-mediaCard-hoverBackground rounded-full hover:bg-mediaCard-background transition-colors whitespace-nowrap flex-shrink-0"
              >
                {button.name}
              </button>
            ))}
            {dropdownButtons && dropdownButtons.length > 0 && (
              <div className="relative my-0">
                <Dropdown
                  selectedItem={selectedGenre || { id: "", name: "..." }}
                  setSelectedItem={(item) => {
                    setSelectedGenre(item);
                    onButtonClick?.(item.id, item.name);
                  }}
                  options={dropdownOptions}
                  customButton={
                    <button
                      type="button"
                      className="px-3 py-1 text-sm bg-mediaCard-hoverBackground rounded-full hover:bg-mediaCard-background transition-colors flex items-center gap-1"
                    >
                      <span>...</span>
                      <Icon
                        icon={Icons.UP_DOWN_ARROW}
                        className="text-xs text-dropdown-secondary"
                      />
                    </button>
                  }
                />
              </div>
            )}
          </div>
        )}
      </div>
      <div className="relative overflow-hidden carousel-container">
        <div
          id={`carousel-${categorySlug}`}
          className="grid grid-flow-col auto-cols-max gap-4 pt-0 pb-4 overflow-x-scroll scrollbar rounded-xl overflow-y-hidden md:pl-8 md:pr-8"
          ref={(el) => {
            carouselRefs.current[categorySlug] = el;
          }}
          onWheel={handleWheel}
        >
          <div className="md:w-12" />

          {filteredMedias.length > 0
            ? filteredMedias.map((media) => (
                <div
                  onContextMenu={(e: React.MouseEvent<HTMLDivElement>) =>
                    e.preventDefault()
                  }
                  key={media.id}
                  className="relative mt-4 group cursor-pointer user-select-none rounded-xl p-2 bg-transparent transition-colors duration-300 w-[10rem] md:w-[11.5rem] h-auto"
                >
                  <MediaCard
                    linkable
                    key={media.id}
                    media={{
                      id: media.id.toString(),
                      title: media.title || media.name || "",
                      poster: `https://image.tmdb.org/t/p/w342${media.poster_path}`,
                      type: isTVShow ? "show" : "movie",
                      year: isTVShow
                        ? media.first_air_date
                          ? parseInt(media.first_air_date.split("-")[0], 10)
                          : undefined
                        : media.release_date
                          ? parseInt(media.release_date.split("-")[0], 10)
                          : undefined,
                    }}
                    onShowDetails={onShowDetails}
                  />
                </div>
              ))
            : Array.from({ length: SKELETON_COUNT }).map(() => (
                <MediaCardSkeleton
                  key={`skeleton-${categorySlug}-${Math.random().toString(36).substring(7)}`}
                />
              ))}

          <div className="md:w-12" />
        </div>

        {!isMobile && (
          <CarouselNavButtons
            categorySlug={categorySlug}
            carouselRefs={carouselRefs}
          />
        )}
      </div>
      {!moreContent && (
        <div className="flex justify-center">
          <Link
            to={
              moreLink ||
              `/discover/more/${categorySlug}${genreId ? `/${genreId}` : ""}`
            }
            className="flex items-center justify-center px-6 py-2 rounded-full bg-mediaCard-hoverBackground hover:bg-mediaCard-background transition-colors"
          >
            <span className="mr-2">{t("discover.carousel.more")}</span>
            <Icon className="text-xl" icon={Icons.ARROW_RIGHT} />
          </Link>
        </div>
      )}
    </>
  );
}
