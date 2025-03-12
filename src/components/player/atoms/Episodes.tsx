import classNames from "classnames";
import {
  Fragment,
  ReactNode,
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";
import { useTranslation } from "react-i18next";
import { useAsync } from "react-use";

import { getMetaFromId } from "@/backend/metadata/getmeta";
import { MWMediaType, MWSeasonMeta } from "@/backend/metadata/types/mw";
import { Icon, Icons } from "@/components/Icon";
import { ProgressRing } from "@/components/layout/ProgressRing";
import { OverlayAnchor } from "@/components/overlays/OverlayAnchor";
import { Overlay } from "@/components/overlays/OverlayDisplay";
import { OverlayPage } from "@/components/overlays/OverlayPage";
import { OverlayRouter } from "@/components/overlays/OverlayRouter";
import { usePlayerMeta } from "@/components/player/hooks/usePlayerMeta";
import { VideoPlayerButton } from "@/components/player/internals/Button";
import { Menu } from "@/components/player/internals/ContextMenu";
import { useOverlayRouter } from "@/hooks/useOverlayRouter";
import { PlayerMeta } from "@/stores/player/slices/source";
import { usePlayerStore } from "@/stores/player/store";
import { useProgressStore } from "@/stores/progress";

import { hasAired } from "../utils/aired";

function CenteredText(props: { children: React.ReactNode }) {
  return (
    <div className="h-full w-full flex justify-center items-center p-8 text-center">
      {props.children}
    </div>
  );
}

function useSeasonData(mediaId: string, seasonId: string) {
  const [seasons, setSeason] = useState<MWSeasonMeta[] | null>(null);

  const state = useAsync(async () => {
    const data = await getMetaFromId(MWMediaType.SERIES, mediaId, seasonId);
    if (data?.meta.type !== MWMediaType.SERIES) return null;
    setSeason(data.meta.seasons);
    return {
      season: data.meta.seasonData,
      fullData: data,
    };
  }, [mediaId, seasonId]);

  return [state, seasons] as const;
}

function SeasonsView({
  selectedSeason,
  setSeason,
}: {
  selectedSeason: string;
  setSeason: (id: string) => void;
}) {
  const { t } = useTranslation();
  const meta = usePlayerStore((s) => s.meta);
  const [loadingState, seasons] = useSeasonData(
    meta?.tmdbId ?? "",
    selectedSeason,
  );

  let content: ReactNode = null;
  if (seasons) {
    content = (
      <Menu.Section className="pb-6">
        {seasons?.map((season) => {
          return (
            <Menu.ChevronLink
              key={season.id}
              onClick={() => setSeason(season.id)}
            >
              {season.title}
            </Menu.ChevronLink>
          );
        })}
      </Menu.Section>
    );
  } else if (loadingState.error)
    content = (
      <CenteredText>{t("player.menus.episodes.loadingError")}</CenteredText>
    );
  else if (loadingState.loading)
    content = (
      <CenteredText>{t("player.menus.episodes.loadingList")}</CenteredText>
    );

  return (
    <Menu.CardWithScrollable>
      <Menu.Title>
        {meta?.title ?? t("player.menus.episodes.loadingTitle")}
      </Menu.Title>
      {content}
    </Menu.CardWithScrollable>
  );
}

function EpisodesView({
  id,
  selectedSeason,
  goBack,
  onChange,
}: {
  id: string;
  selectedSeason: string;
  goBack?: () => void;
  onChange?: (meta: PlayerMeta) => void;
}) {
  const { t } = useTranslation();
  const router = useOverlayRouter(id);
  const { setPlayerMeta } = usePlayerMeta();
  const meta = usePlayerStore((s) => s.meta);
  const [loadingState] = useSeasonData(meta?.tmdbId ?? "", selectedSeason);
  const progress = useProgressStore();
  const carouselRef = useRef<HTMLDivElement>(null);

  // const hasUnairedEpisodes = loadingState.value?.season.episodes.some(
  //   (ep) => !hasAired(ep.air_date),
  // );

  // {hasUnairedEpisodes && (
  //   <div className="text-xs text-video-context-type-main/70 mt-0.5">
  //     {t("player.menus.episodes.unairedEpisodes")}
  //   </div>
  // )}

  const playEpisode = useCallback(
    (episodeId: string) => {
      if (loadingState.value) {
        const newData = setPlayerMeta(loadingState.value.fullData, episodeId);
        if (newData) onChange?.(newData);
      }
      // prevent router clear here, otherwise its done double
      // player already switches route after meta change
      router.close(true);
    },
    [setPlayerMeta, loadingState, router, onChange],
  );

  // Handle horizontal scroll with nav buttons
  const handleScroll = (direction: "left" | "right") => {
    if (!carouselRef.current) return;

    const cardWidth = 256; // w-64 in pixels
    const cardSpacing = 16; // space-x-4 in pixels
    const cardsToScroll = 3;
    const scrollAmount = (cardWidth + cardSpacing) * cardsToScroll;

    const newScrollPosition =
      carouselRef.current.scrollLeft +
      (direction === "left" ? -scrollAmount : scrollAmount);

    carouselRef.current.scrollTo({
      left: newScrollPosition,
      behavior: "smooth",
    });
  };

  if (!meta?.tmdbId) return null;

  let content: ReactNode = null;
  if (loadingState.error)
    content = (
      <CenteredText>{t("player.menus.episodes.loadingError")}</CenteredText>
    );
  else if (loadingState.loading)
    content = (
      <CenteredText>{t("player.menus.episodes.loadingList")}</CenteredText>
    );
  else if (loadingState.value) {
    content = (
      <Menu.ScrollToActiveSection>
        <div className="relative">
          {/* Horizontal scroll buttons - only visible on larger screens */}
          <div className="absolute left-0 top-1/2 transform -translate-y-1/2 z-10 px-10 hidden md:block">
            <button
              type="button"
              className="p-2 bg-black/80 hover:bg-video-context-hoverColor transition-colors rounded-full border border-video-context-border backdrop-blur-sm"
              onClick={() => handleScroll("left")}
            >
              <Icon icon={Icons.CHEVRON_LEFT} className="text-white/80" />
            </button>
          </div>

          <div
            ref={carouselRef}
            className="md:flex md:overflow-x-auto flex-col md:flex-row space-y-2 sm:space-y-4 md:space-y-0 md:space-x-4 pb-4 pt-2 md:px-20 scrollbar-hide no-scrollbar overflow-y-auto md:overflow-y-hidden max-h-[60vh] md:max-h-none"
            style={{
              scrollbarWidth: "none",
              msOverflowStyle: "none",
            }}
          >
            {loadingState.value.season.episodes.length === 0 ? (
              <div className="flex-shrink-0 w-full flex justify-center items-center">
                <p>{t("player.menus.episodes.emptyState")}</p>
              </div>
            ) : (
              loadingState.value.season.episodes.map((ep) => {
                const episodeProgress =
                  progress.items[meta?.tmdbId]?.episodes?.[ep.id];
                const percentage = episodeProgress
                  ? (episodeProgress.progress.watched /
                      episodeProgress.progress.duration) *
                    100
                  : 0;

                const isAired = hasAired(ep.air_date);
                const isActive = ep.id === meta?.episode?.tmdbId;
                let rightSide;
                if (episodeProgress) {
                  rightSide = (
                    <ProgressRing
                      className="h-[18px] w-[18px] text-white"
                      percentage={percentage > 90 ? 100 : percentage}
                    />
                  );
                }

                return (
                  <Fragment key={ep.id}>
                    {/* Compact layout for very small screens (xs only) */}
                    <div className="block sm:hidden w-full">
                      <Menu.Link
                        onClick={() => playEpisode(ep.id)}
                        active={ep.id === meta?.episode?.tmdbId}
                        clickable={hasAired(ep.air_date)}
                        rightSide={rightSide}
                      >
                        <Menu.LinkTitle>
                          <div
                            className={classNames(
                              "text-left flex items-center space-x-1 text-video-context-type-main",
                              isAired || isActive ? "" : "text-opacity-25",
                            )}
                          >
                            <span className="p-0.5 px-2 rounded inline bg-video-context-hoverColor bg-opacity-50">
                              E{ep.number}
                            </span>
                            <span className="line-clamp-1 break-all">
                              {ep.title}
                            </span>
                          </div>
                        </Menu.LinkTitle>
                      </Menu.Link>
                    </div>

                    {/* Card layout for medium and large screens */}
                    <div
                      onClick={() => playEpisode(ep.id)}
                      className={classNames(
                        "flex-shrink-0 md:w-64 w-full rounded-lg overflow-hidden transition-all duration-200 relative pb-1 cursor-pointer",
                        "hidden sm:flex md:inline-block" /* Hidden on xs, flex on sm, inline-block on md+ */,
                        isActive
                          ? "bg-video-context-hoverColor/50"
                          : "hover:bg-video-context-hoverColor/50",
                        !isAired ? "opacity-50" : "hover:scale-95",
                      )}
                    >
                      <div className="relative aspect-video bg-video-context-hoverColor md:w-full w-1/3 flex-shrink-0">
                        {/* Episode Thumbnail */}
                        {ep.still_path ? (
                          <img
                            src={`https://image.tmdb.org/t/p/w300${ep.still_path}`}
                            alt={ep.title}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center bg-black bg-opacity-50">
                            <Icon
                              icon={Icons.FILM}
                              className="text-video-context-type-main opacity-50 text-3xl"
                            />
                          </div>
                        )}

                        {/* Episode Number Badge */}
                        <div className="absolute top-2 left-2 bg-black bg-opacity-70 text-video-context-type-main text-sm px-2 py-1 rounded">
                          {t("player.menus.episodes.episodeBadge", {
                            episode: ep.number,
                          })}
                          {!isAired && (
                            <span className="ml-2 text-video-context-type-main/70">
                              (Unreleased)
                            </span>
                          )}
                        </div>
                      </div>

                      <div className="p-3 flex-1 flex flex-col justify-center">
                        <h3 className="font-bold text-white line-clamp-1">
                          {ep.title}
                        </h3>
                        {ep.overview && (
                          <p className="text-sm text-white mt-1.5 line-clamp-2 md:line-clamp-2">
                            {ep.overview}
                          </p>
                        )}
                      </div>

                      {/* Progress Indicator */}
                      {percentage > 0 && (
                        <div className="absolute bottom-0 left-0 right-0 h-1 bg-progress-background/25">
                          <div
                            className="h-full bg-progress-filled"
                            style={{
                              width: `${percentage > 98 ? 100 : percentage}%`,
                            }}
                          />
                        </div>
                      )}
                    </div>
                  </Fragment>
                );
              })
            )}
          </div>

          <div className="absolute right-0 top-1/2 transform -translate-y-1/2 z-10 px-10 hidden md:block">
            <button
              type="button"
              className="p-2 bg-black/80 hover:bg-video-context-hoverColor transition-colors rounded-full border border-video-context-border backdrop-blur-sm"
              onClick={() => handleScroll("right")}
            >
              <Icon icon={Icons.CHEVRON_RIGHT} className="text-white/80" />
            </button>
          </div>
        </div>
      </Menu.ScrollToActiveSection>
    );
  }

  return (
    <Menu.CardWithScrollable>
      <Menu.BackLink
        onClick={goBack}
        rightSide={
          <div className="text-right">
            <div>
              {loadingState?.value?.season.title ||
                t("player.menus.episodes.loadingTitle")}
            </div>
          </div>
        }
      >
        {t("player.menus.episodes.seasons")}
      </Menu.BackLink>
      {content}
    </Menu.CardWithScrollable>
  );
}

function EpisodesOverlay({
  id,
  onChange,
}: {
  id: string;
  onChange?: (meta: PlayerMeta) => void;
}) {
  const router = useOverlayRouter(id);
  const meta = usePlayerStore((s) => s.meta);
  const [selectedSeason, setSelectedSeason] = useState("");

  const lastActiveState = useRef(false);
  useEffect(() => {
    if (lastActiveState.current === router.isRouterActive) return;
    lastActiveState.current = router.isRouterActive;
    setSelectedSeason(meta?.season?.tmdbId ?? "");
  }, [meta, selectedSeason, setSelectedSeason, router.isRouterActive]);

  const setSeason = useCallback(
    (seasonId: string) => {
      setSelectedSeason(seasonId);
      router.navigate("/episodes");
    },
    [router],
  );

  return (
    <Overlay id={id}>
      <OverlayRouter id={id}>
        <OverlayPage id={id} path="/" width={343} height={431}>
          <SeasonsView setSeason={setSeason} selectedSeason={selectedSeason} />
        </OverlayPage>
        <OverlayPage id={id} path="/episodes" width={0} height={360} fullWidth>
          {selectedSeason.length > 0 ? (
            <EpisodesView
              selectedSeason={selectedSeason}
              id={id}
              goBack={() => router.navigate("/")}
              onChange={onChange}
            />
          ) : null}
        </OverlayPage>
      </OverlayRouter>
    </Overlay>
  );
}

interface EpisodesProps {
  onChange?: (meta: PlayerMeta) => void;
}

export function EpisodesRouter(props: EpisodesProps) {
  return <EpisodesOverlay onChange={props.onChange} id="episodes" />;
}

export function Episodes() {
  const { t } = useTranslation();
  const router = useOverlayRouter("episodes");
  const setHasOpenOverlay = usePlayerStore((s) => s.setHasOpenOverlay);
  const type = usePlayerStore((s) => s.meta?.type);

  useEffect(() => {
    setHasOpenOverlay(router.isRouterActive);
  }, [setHasOpenOverlay, router.isRouterActive]);
  if (type !== "show") return null;

  return (
    <OverlayAnchor id={router.id}>
      <VideoPlayerButton
        onClick={() => router.open("/episodes")}
        icon={Icons.EPISODES}
      >
        {t("player.menus.episodes.button")}
      </VideoPlayerButton>
    </OverlayAnchor>
  );
}
