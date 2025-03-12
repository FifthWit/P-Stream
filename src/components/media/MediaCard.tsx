import classNames from "classnames";
import { useCallback, useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";
import { useCopyToClipboard } from "react-use";

import { getMetaFromId } from "@/backend/metadata/getmeta";
import { mediaItemToId } from "@/backend/metadata/tmdb";
import { MWMediaType, MWSeasonMeta } from "@/backend/metadata/types/mw";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from "@/components/overlays/DropdownMenu";
import { DotList } from "@/components/text/DotList";
import { Flare } from "@/components/utils/Flare";
import { useSearchQuery } from "@/hooks/useSearchQuery";
import { MediaItem } from "@/utils/mediaTypes";

import { MediaBookmarkButton } from "./MediaBookmark";
import { Button } from "../buttons/Button";
import { IconPatch } from "../buttons/IconPatch";
import { Icon, Icons } from "../Icon";

function checkReleased(media: MediaItem): boolean {
  const isReleasedYear = Boolean(
    media.year && media.year <= new Date().getFullYear(),
  );
  const isReleasedDate = Boolean(
    media.release_date && media.release_date <= new Date(),
  );

  // If the media has a release date, use that, otherwise use the year
  const isReleased = media.release_date ? isReleasedDate : isReleasedYear;

  return isReleased;
}

function getBaseUrl(): string {
  return window.location.origin;
}

interface EpisodeSelectorProps {
  closable?: boolean;
  series: {
    season?: number;
    episode: number;
    episodeId: string;
    seasonId: string;
  };
  tmdbId: string | number;
}

interface EpisodeSelectorProps {
  closable?: boolean;
  series: {
    season?: number;
    episode: number;
    episodeId: string;
    seasonId: string;
  };
  tmdbId: string | number;
}

// very perfect implementation because I totally know a ton about react!

function EpisodeSelector({ closable, series, tmdbId }: EpisodeSelectorProps) {
  const { t } = useTranslation();
  const [currentSeasonId, setCurrentSeasonId] = useState(series.seasonId);
  const [show, setShow] = useState("");
  const [currentSeason, setCurrentSeason] = useState(series.season || 1);
  const [seasons, setSeasons] = useState<MWSeasonMeta[]>([]);
  const [episodes, setEpisodes] = useState<any[]>([]);
  const [isLoadingEpisodes, setIsLoadingEpisodes] = useState(false);
  const buttonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    async function fetchSeasons() {
      try {
        const data = await getMetaFromId(MWMediaType.SERIES, tmdbId.toString());
        if (data?.meta?.type === MWMediaType.SERIES && data.meta.seasons) {
          setSeasons(data.meta.seasons);
          setShow(data.meta.title);
        }
      } catch (error) {
        console.error("Failed to fetch seasons", error);
      }
    }

    fetchSeasons();
  }, [tmdbId]);

  useEffect(() => {
    async function fetchEpisodes() {
      setIsLoadingEpisodes(true);
      try {
        const data = await getMetaFromId(
          MWMediaType.SERIES,
          tmdbId.toString(),
          currentSeasonId,
        );
        if (
          data?.meta?.type === MWMediaType.SERIES &&
          data.meta.seasonData?.episodes
        ) {
          setEpisodes(data.meta.seasonData.episodes);
        }
      } catch (error) {
        console.error("error", error);
      } finally {
        setIsLoadingEpisodes(false);
      }
    }

    if (currentSeasonId) {
      fetchEpisodes();
    }
  }, [tmdbId, currentSeasonId]);

  const handleSeasonChange = (seasonId: string, seasonNumber: number) => {
    setCurrentSeasonId(seasonId);
    setCurrentSeason(seasonNumber);
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          ref={buttonRef}
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
          }}
          className="absolute right-2 top-2 rounded-lg bg-mediaCard-badge px-2 py-1 transition-colors flex items-center z-10"
        >
          <p
            className={`text-center text-xs font-bold text-mediaCard-badgeText transition-colors ${closable ? "" : "group-hover:text-white"}`}
          >
            {t("media.episodeDisplay", {
              season: series.season,
              episode: series.episode,
            })}
          </p>
          <Icon className="ml-1" icon={Icons.CHEVRON_DOWN} />
        </button>
      </DropdownMenuTrigger>

      <DropdownMenuContent
        className="w-56 rounded-xl overflow-hidden shadow-lg focus:outline-none"
        align="end"
        onClick={(e) => e.stopPropagation()}
      >
        <DropdownMenuSub>
          <DropdownMenuSubTrigger className="sticky top-0 z-10 bg-mediaCard-badge bg-opacity-30 text-type-main rounded-t-xl">
            <span className="font-medium">Season {currentSeason}</span>
          </DropdownMenuSubTrigger>

          <DropdownMenuSubContent className="max-h-60 overflow-y-auto rounded-xl shadow-lg focus:outline-none">
            {seasons.map((season) => (
              <DropdownMenuItem
                key={season.id}
                className={`px-4 py-2 text-sm hover:bg-mediaCard-hoverBackground cursor-pointer ${
                  season.id === currentSeasonId
                    ? "bg-mediaCard-badge bg-opacity-50"
                    : ""
                }`}
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  handleSeasonChange(season.id, season.number);
                }}
              >
                {season.title}
              </DropdownMenuItem>
            ))}
          </DropdownMenuSubContent>
        </DropdownMenuSub>

        {/* Episode list */}
        <div className="py-1 h-60 overflow-y-auto">
          {isLoadingEpisodes ? (
            <div className="px-4 py-2 text-sm text-type-secondary">
              Loading episodes...
            </div>
          ) : (
            <>
              {episodes.map((episode) => (
                <DropdownMenuItem
                  key={episode.id}
                  asChild
                  className="px-1 hover:bg-mediaCard-hoverBackground"
                >
                  <Link
                    to={`/media/tmdb-tv-${tmdbId}-${show.replace(/\s+/g, "-")}/${currentSeasonId}/${episode.id}`}
                    className="flex items-center px-4 py-2 text-sm text-type-main hover:bg-mediaCard-hoverBackground rounded-lg"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <span className="p-0.5 px-2 mr-2 rounded-md inline bg-video-context-hoverColor bg-opacity-50">
                      {episode.number}
                    </span>
                    <span className="line-clamp-1">{episode.title}</span>
                  </Link>
                </DropdownMenuItem>
              ))}
            </>
          )}
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

export interface MediaCardProps {
  media: MediaItem;
  linkable?: boolean;
  series?: {
    episode: number;
    season?: number;
    episodeId: string;
    seasonId: string;
  };
  percentage?: number;
  closable?: boolean;
  onClose?: () => void;
}

function MediaCardContent({
  media,
  linkable,
  series,
  percentage,
  closable,
  onClose,
  overlayVisible,
  setOverlayVisible,
  handleMouseEnter,
  handleMouseLeave,
  link,
}: MediaCardProps & {
  overlayVisible: boolean;
  setOverlayVisible: React.Dispatch<React.SetStateAction<boolean>>;
  handleMouseEnter: () => void;
  handleMouseLeave: () => void;
  link: string;
}) {
  const { t } = useTranslation();
  const percentageString = `${Math.round(percentage ?? 0).toFixed(0)}%`;

  const isReleased = useCallback(() => checkReleased(media), [media]);

  const canLink = linkable && !closable && isReleased();

  const dotListContent = [t(`media.types.${media.type}`)];

  const altDotListContent = [t(`ID: ${media.id}`)];

  const [searchQuery] = useSearchQuery();

  const [, copyToClipboard] = useCopyToClipboard();
  const [hasCopied, setHasCopied] = useState(false);

  const [hasCopiedID, setHasCopiedID] = useState(false);

  if (closable) {
    setOverlayVisible(false);
  }

  if (media.year) {
    dotListContent.push(media.year.toFixed());
  }

  if (!isReleased()) {
    dotListContent.push(t("media.unreleased"));
  }

  const handleMoreInfoClick = (
    e: React.MouseEvent<HTMLButtonElement | HTMLAnchorElement>,
  ) => {
    e.preventDefault();

    const searchParam = encodeURIComponent(encodeURI(media.id));
    const url =
      media.type === "movie"
        ? `https://www.themoviedb.org/movie/${searchParam}`
        : `https://www.themoviedb.org/tv/${searchParam}`;

    window.open(url, "_blank");
  };

  const handleCopyClick = (
    e: React.MouseEvent<HTMLButtonElement | HTMLAnchorElement>,
  ) => {
    e.preventDefault();
    copyToClipboard(link);
    setHasCopied(true);
    setTimeout(() => setHasCopied(false), 2000);
  };

  const handleCopyIDClick = (
    e: React.MouseEvent<HTMLButtonElement | HTMLAnchorElement>,
  ) => {
    e.preventDefault();
    copyToClipboard(media.id);
    setHasCopiedID(true);
    setTimeout(() => setHasCopiedID(false), 2000);
  };

  return (
    <div
      className={classNames("media-card-content", { jiggle: closable })}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      <Flare.Base
        className={`group -m-[0.705em] rounded-xl bg-background-main transition-colors duration-300 focus:relative focus:z-10 ${
          canLink ? "hover:bg-mediaCard-hoverBackground tabbable" : ""
        }`}
        tabIndex={canLink ? 0 : -1}
        onKeyUp={(e) => e.key === "Enter" && e.currentTarget.click()}
      >
        <Flare.Light
          flareSize={300}
          cssColorVar="--colors-mediaCard-hoverAccent"
          backgroundClass="bg-mediaCard-hoverBackground duration-100"
          className={classNames({
            "rounded-xl bg-background-main group-hover:opacity-100": canLink,
          })}
        />
        <Flare.Child
          className={`pointer-events-auto relative mb-2 p-[0.4em] transition-transform duration-300 ${
            canLink ? "group-hover:scale-95" : "opacity-60"
          }`}
        >
          <div
            className={classNames(
              "relative mb-4 pb-[150%] w-full overflow-hidden rounded-xl bg-mediaCard-hoverBackground bg-cover bg-center transition-[border-radius] duration-300",
              {
                "group-hover:rounded-lg": canLink,
                "blur-sm": overlayVisible,
              },
            )}
            style={{
              backgroundImage: media.poster
                ? overlayVisible
                  ? `linear-gradient(rgba(0, 0, 0, 0.2), rgba(0, 0, 0, 0.8)), url(${media.poster})`
                  : `url(${media.poster})`
                : undefined,
            }}
          >
            {!overlayVisible ? (
              <div>
                {series ? (
                  <EpisodeSelector
                    tmdbId={media.id}
                    closable={!!closable}
                    series={series}
                  />
                ) : null}

                {percentage !== undefined ? (
                  <>
                    <div
                      className={`absolute inset-x-0 -bottom-px pb-1 h-12 bg-gradient-to-t from-mediaCard-shadow to-transparent transition-colors ${
                        canLink ? "group-hover:from-mediaCard-hoverShadow" : ""
                      }`}
                    />
                    <div
                      className={`absolute inset-x-0 bottom-0 h-12 bg-gradient-to-t from-mediaCard-shadow to-transparent transition-colors ${
                        canLink ? "group-hover:from-mediaCard-hoverShadow" : ""
                      }`}
                    />
                    <div className="absolute inset-x-0 bottom-0 p-3">
                      <div className="relative h-1 overflow-hidden rounded-full bg-mediaCard-barColor">
                        <div
                          className="absolute inset-y-0 left-0 rounded-full bg-mediaCard-barFillColor"
                          style={{
                            width: percentageString,
                          }}
                        />
                      </div>
                    </div>
                  </>
                ) : null}
              </div>
            ) : null}

            {!overlayVisible ? (
              <div>
                {!closable ? (
                  <div>
                    <div
                      className="absolute bookmark-button"
                      onClick={(e) => e.preventDefault()}
                    >
                      <MediaBookmarkButton media={media} />
                    </div>
                    {searchQuery.length > 0 ? (
                      <div
                        className="absolute"
                        onClick={(e) => e.preventDefault()}
                      >
                        <MediaBookmarkButton media={media} />
                      </div>
                    ) : null}
                  </div>
                ) : null}
                <div
                  className={`absolute inset-0 flex items-center justify-center bg-mediaCard-badge bg-opacity-80 transition-opacity duration-500 ${
                    closable ? "opacity-100" : "pointer-events-none opacity-0"
                  }`}
                >
                  <IconPatch
                    clickable
                    className="text-2xl text-mediaCard-badgeText transition-transform hover:scale-110 duration-500"
                    onClick={() => closable && onClose?.()}
                    icon={Icons.X}
                  />
                </div>
              </div>
            ) : null}
          </div>

          {overlayVisible ? (
            <div>
              <div className="absolute inset-0 flex flex-col items-center justify-start gap-y-2 pt-8 md:pt-12">
                <Button
                  theme="secondary"
                  className={classNames(
                    "w-[86%] md:w-[90%] h-12 rounded-lg px-4 py-2 my-1 transition-transform hover:scale-105 duration-100", // Button Size & Hover
                    "text-md text-white flex items-center justify-center", // Centering Content
                    "bg-buttons-purple bg-opacity-15 hover:bg-buttons-purpleHover hover:bg-opacity-25 backdrop-blur-md", // Background
                    "border-2 border-gray-400 border-opacity-20", // Border
                  )}
                  onClick={handleMoreInfoClick}
                >
                  More Info
                </Button>

                {canLink ? (
                  <Button
                    theme="secondary"
                    className={classNames(
                      "w-[86%] md:w-[90%] h-12 rounded-lg px-4 py-2 my-1 transition-transform hover:scale-105 duration-100", // Button Size & Hover
                      "text-md text-white flex items-center justify-center", // Centering Content
                      "bg-buttons-purple bg-opacity-15 hover:bg-buttons-purpleHover hover:bg-opacity-25 backdrop-blur-md", // Background
                      "border-2 border-gray-400 border-opacity-20", // Border
                    )}
                    href={link}
                    onClick={handleCopyClick}
                  >
                    {hasCopied ? (
                      <Icon
                        className="text-md text-white mix-blend-screen"
                        icon={Icons.CHECKMARK}
                      />
                    ) : (
                      "Copy Link"
                    )}
                  </Button>
                ) : null}

                <Button
                  theme="secondary"
                  className={classNames(
                    "w-[86%] md:w-[90%] h-12 rounded-lg px-4 py-2 my-1 transition-transform hover:scale-105 duration-100", // Button Size & Hover
                    "text-md text-white flex items-center justify-center", // Centering Content
                    "bg-buttons-purple bg-opacity-15 hover:bg-buttons-purpleHover hover:bg-opacity-25 backdrop-blur-md", // Background
                    "border-2 border-gray-400 border-opacity-20", // Border
                  )}
                  onClick={() => setOverlayVisible(false)}
                >
                  Close
                </Button>
              </div>
            </div>
          ) : null}

          <h1 className="mb-1 line-clamp-3 max-h-[4.5rem] text-ellipsis break-words font-bold text-white">
            <span>{media.title}</span>
          </h1>
          <div className="media-info-container justify-content-center flex flex-wrap">
            {!overlayVisible ? (
              <DotList className="text-xs" content={dotListContent} />
            ) : (
              <button
                type="button"
                onClick={handleCopyIDClick}
                className="z-50"
              >
                {!hasCopiedID ? (
                  <DotList className="text-xs" content={altDotListContent} />
                ) : (
                  <div className="flex items-center gap-1">
                    <DotList className="text-xs" content={altDotListContent} />
                    <Icon
                      className="text-xs text-type-secondary"
                      icon={Icons.CHECKMARK}
                    />
                  </div>
                )}
              </button>
            )}
          </div>

          {!overlayVisible && !closable ? (
            <div className="absolute bottom-0 translate-y-1 right-1">
              <button
                className="media-more-button p-2"
                type="button"
                onClick={(e) => {
                  e.preventDefault();
                  setOverlayVisible(!overlayVisible);
                }}
              >
                <Icon
                  className="text-xs font-semibold text-type-secondary"
                  icon={Icons.ELLIPSIS}
                />
              </button>
            </div>
          ) : null}
        </Flare.Child>
      </Flare.Base>
    </div>
  );
}

export function MediaCard(props: MediaCardProps) {
  const [overlayVisible, setOverlayVisible] = useState(false);
  const [timeoutId, setTimeoutId] = useState<NodeJS.Timeout | null>(null);

  const handleMouseLeave = () => {
    const id = setTimeout(() => {
      setOverlayVisible(false);
    }, 2000); // 2 seconds
    setTimeoutId(id);
  };

  const handleMouseEnter = () => {
    if (timeoutId) {
      clearTimeout(timeoutId);
      setTimeoutId(null);
    }
  };

  const isReleased = useCallback(
    () => checkReleased(props.media),
    [props.media],
  );

  const canLink = props.linkable && !props.closable && isReleased();

  let link = canLink
    ? `${getBaseUrl()}/media/${encodeURIComponent(mediaItemToId(props.media))}`
    : "#";
  if (canLink && props.series) {
    if (props.series.season === 0 && !props.series.episodeId) {
      link += `/${encodeURIComponent(props.series.seasonId)}`;
    } else {
      link += `/${encodeURIComponent(
        props.series.seasonId,
      )}/${encodeURIComponent(props.series.episodeId)}`;
    }
  }

  const content = (
    <MediaCardContent
      {...props}
      overlayVisible={overlayVisible}
      setOverlayVisible={setOverlayVisible}
      handleMouseEnter={handleMouseEnter}
      handleMouseLeave={handleMouseLeave}
      link={link}
    />
  );

  if (!canLink) return <span>{content}</span>;
  return (
    <div className="relative">
      {!overlayVisible ? (
        <Link
          to={link}
          tabIndex={-1}
          className={classNames(
            "tabbable",
            props.closable ? "hover:cursor-default" : "",
          )}
        >
          {content}
        </Link>
      ) : (
        <div
          tabIndex={-1}
          className={classNames(
            "tabbable",
            props.closable ? "hover:cursor-default" : "",
          )}
        >
          {content}
        </div>
      )}
    </div>
  );
}
