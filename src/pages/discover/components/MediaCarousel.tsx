import { Listbox } from "@headlessui/react";
import React from "react";
import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";
import { useWindowSize } from "react-use";

import { Dropdown, OptionItem } from "@/components/form/Dropdown";
import { Icon, Icons } from "@/components/Icon";
import { MediaCard } from "@/components/media/MediaCard";
import { Flare } from "@/components/utils/Flare";
import { Media } from "@/pages/discover/common";
import { useDiscoverStore } from "@/stores/discover";
import { MediaItem } from "@/utils/mediaTypes";

import { MOVIE_PROVIDERS, TV_PROVIDERS } from "../discoverContent";
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
  recommendationSources?: Array<{ id: string; title: string }>;
  selectedRecommendationSource?: string;
  onRecommendationSourceChange?: (id: string) => void;
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

function MoreCard({ link }: { link: string }) {
  const { t } = useTranslation();

  return (
    <div className="relative mt-4 group cursor-pointer user-select-none rounded-xl p-2 bg-transparent transition-colors duration-300 w-[10rem] md:w-[11.5rem] h-auto">
      <Link to={link} className="block">
        <Flare.Base className="group -m-[0.705em] h-[20rem] hover:scale-95 transition-all rounded-xl bg-background-main duration-300 hover:bg-mediaCard-hoverBackground tabbable">
          <Flare.Light
            flareSize={300}
            cssColorVar="--colors-mediaCard-hoverAccent"
            backgroundClass="bg-mediaCard-hoverBackground duration-100"
            className="rounded-xl bg-background-main group-hover:opacity-100"
          />
          <Flare.Child className="pointer-events-auto h-[20rem] relative mb-2 p-[0.4em] transition-transform duration-300">
            <div className="flex absolute inset-0 flex-col items-center justify-center">
              <Icon
                icon={Icons.ARROW_RIGHT}
                className="text-4xl mb-2 transition-transform duration-300"
              />
              <span className="text-sm text-center px-2">
                {t("discover.carousel.more")}
              </span>
            </div>
          </Flare.Child>
        </Flare.Base>
      </Link>
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
  recommendationSources,
  selectedRecommendationSource,
  onRecommendationSourceChange,
}: MediaCarouselProps) {
  const { t } = useTranslation();
  const { width: windowWidth } = useWindowSize();
  const { setLastView } = useDiscoverStore();
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

    if (
      categoryName.includes("Movies on") ||
      categoryName.includes("Shows on")
    ) {
      const providerName = categoryName.split(" on ")[1];
      const providers = isTVShowCondition ? TV_PROVIDERS : MOVIE_PROVIDERS;
      const provider = providers.find(
        (p) => p.name.toLowerCase() === providerName.toLowerCase(),
      );

      if (provider) {
        return isTVShowCondition
          ? t("discover.carousel.title.tvshowsOn", { provider: provider.name })
          : t("discover.carousel.title.moviesOn", { provider: provider.name });
      }
      // If provider not found, fall back to using the raw provider name
      return isTVShowCondition
        ? t("discover.carousel.title.tvshowsOn", { provider: providerName })
        : t("discover.carousel.title.moviesOn", { provider: providerName });
    }

    if (categoryName.includes("Because You Watched")) {
      return t("discover.carousel.title.recommended", {
        title: categoryName.split("Because You Watched:")[1],
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

  const { visibleButtons, dropdownButtons } = React.useMemo(() => {
    if (!relatedButtons) return { visibleButtons: [], dropdownButtons: [] };

    const visible =
      windowWidth > 850
        ? relatedButtons.slice(0, 5)
        : relatedButtons.slice(0, 0);

    const dropdown =
      windowWidth > 850 ? relatedButtons.slice(5) : relatedButtons.slice(0);

    return { visibleButtons: visible, dropdownButtons: dropdown };
  }, [relatedButtons, windowWidth]);

  const activeButton = relatedButtons?.find(
    (btn) => btn.name === category.split(" on ")[1] || btn.name === category,
  );

  const dropdownOptions: OptionItem[] = dropdownButtons.map((button) => ({
    id: button.id,
    name: button.name,
  }));

  React.useEffect(() => {
    if (
      activeButton &&
      !visibleButtons.find((btn) => btn.id === activeButton.id)
    ) {
      setSelectedGenre({ id: activeButton.id, name: activeButton.name });
    }
  }, [activeButton, visibleButtons]);

  const handleMoreClick = () => {
    setLastView({
      url: window.location.pathname,
      scrollPosition: window.scrollY,
    });
  };

  return (
    <>
      <div className="flex items-center justify-between ml-2 md:ml-8 mt-2">
        <div className="flex flex-col">
          <div className="flex items-center gap-4">
            <h2 className="text-2xl cursor-default font-bold text-white md:text-2xl pl-5 text-balance">
              {displayCategory}
            </h2>
            {recommendationSources &&
              recommendationSources.length > 0 &&
              onRecommendationSourceChange && (
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
                    setSelectedItem={(item) =>
                      onRecommendationSourceChange(item.id)
                    }
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
              )}
          </div>
          {moreContent && (
            <Link
              to={
                moreLink ||
                `/discover/more/${categorySlug}${genreId ? `/${genreId}` : ""}`
              }
              onClick={handleMoreClick}
              className="flex px-5 items-center hover:text-type-link transition-colors"
            >
              <span className="text-sm">{t("discover.carousel.more")}</span>
              <Icon className="text-sm ml-1" icon={Icons.ARROW_RIGHT} />
            </Link>
          )}
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
                  selectedItem={
                    selectedGenre || {
                      id: "",
                      name:
                        activeButton &&
                        !visibleButtons.find(
                          (btn) => btn.id === activeButton.id,
                        )
                          ? activeButton.name
                          : "...",
                    }
                  }
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
                      <span>
                        {activeButton &&
                        !visibleButtons.find(
                          (btn) => btn.id === activeButton.id,
                        )
                          ? activeButton.name
                          : "..."}
                      </span>
                      <Icon
                        icon={Icons.UP_DOWN_ARROW}
                        className="text-xs text-dropdown-secondary"
                      />
                    </button>
                  }
                  side="right"
                  preventWrap
                />
              </div>
            )}
          </div>
        )}
      </div>
      <div className="relative overflow-hidden carousel-container md:pb-4">
        <div
          id={`carousel-${categorySlug}`}
          className="grid grid-flow-col auto-cols-max gap-4 pt-0 overflow-x-scroll scrollbar rounded-xl overflow-y-hidden md:pl-8 md:pr-8"
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

          {moreContent && (
            <MoreCard
              link={
                moreLink ||
                `/discover/more/${categorySlug}${genreId ? `/${genreId}` : ""}`
              }
            />
          )}

          <div className="md:w-12" />
        </div>

        {!isMobile && (
          <CarouselNavButtons
            categorySlug={categorySlug}
            carouselRefs={carouselRefs}
          />
        )}
      </div>
    </>
  );
}
