import classNames from "classnames";
import { t } from "i18next";

import { Button } from "@/components/buttons/Button";
import { IconPatch } from "@/components/buttons/IconPatch";
import { Icon, Icons } from "@/components/Icon";
import { MediaBookmarkButton } from "@/components/media/MediaBookmark";

import { DetailsHeaderProps } from "./types";

export function DetailsHeader({
  data,
  onPlayClick,
  onTrailerClick,
  onShareClick,
  showProgress,
}: DetailsHeaderProps) {
  return (
    <>
      {/* Title and Genres Row */}
      <div className="pb-2">
        {data.logoUrl ? (
          <img
            src={data.logoUrl}
            alt={data.title}
            className="max-w-[12rem] md:max-w-[20rem] object-contain drop-shadow-lg bg-transparent"
            style={{ background: "none" }}
          />
        ) : (
          <h3 className="text-2xl font-bold text-white z-[999]">
            {data.title}
          </h3>
        )}
      </div>
      <div className="flex flex-col sm:flex-row justify-between items-start mb-6 w-full">
        <div className="flex items-center gap-4 w-full sm:w-auto">
          <Button
            onClick={onPlayClick}
            theme="purple"
            className={classNames(
              "flex-1 sm:flex-initial sm:w-auto",
              "gap-2 h-12 rounded-lg px-4 py-2 my-1 transition-transform hover:scale-105 duration-100",
              "text-md text-white flex items-center justify-center",
            )}
          >
            <Icon icon={Icons.PLAY} className="text-white" />
            <span className="text-white text-sm pr-1">
              {data.type === "movie"
                ? !data.releaseDate || new Date(data.releaseDate) > new Date()
                  ? t("media.unreleased")
                  : showProgress
                    ? t("details.resume")
                    : t("details.play")
                : showProgress
                  ? t("details.resume")
                  : t("details.play")}
            </span>
          </Button>
          <div className="flex items-center gap-1 flex-shrink-0">
            <button
              type="button"
              onClick={onTrailerClick}
              className="p-2 opacity-75 transition-opacity duration-300 hover:scale-110 hover:cursor-pointer hover:opacity-95"
              title={t("details.trailer")}
            >
              <IconPatch
                icon={Icons.FILM}
                className="transition-transform duration-300 hover:scale-110 hover:cursor-pointer"
              />
            </button>
            <MediaBookmarkButton
              media={{
                id: data.id?.toString() || "",
                title: data.title,
                year: data.releaseDate
                  ? new Date(data.releaseDate).getFullYear()
                  : undefined,
                poster: data.backdrop,
                type: data.type || "movie",
              }}
            />
            <button
              type="button"
              onClick={onShareClick}
              className="p-2 opacity-75 transition-opacity duration-300 hover:scale-110 hover:cursor-pointer hover:opacity-95"
              title="Share"
            >
              <IconPatch
                icon={Icons.IOS_SHARE}
                className="transition-transform duration-300 hover:scale-110 hover:cursor-pointer"
              />
            </button>
          </div>
        </div>

        {/* Genres on the right side of the button row for larger screens */}
        {data.genres && data.genres.length > 0 && (
          <div className="hidden sm:flex flex-wrap gap-2 justify-end items-center">
            {data.genres.map((genre, index) => (
              <span
                key={genre.id}
                className="text-[11px] px-2 py-0.5 rounded-full bg-white/20 text-white/80 transition-all duration-300 hover:scale-110 animate-[scaleIn_0.6s_ease-out_forwards]"
                style={{
                  animationDelay: `${((data.genres?.length ?? 0) - 1 - index) * 60}ms`,
                  transform: "scale(0)",
                  opacity: 0,
                }}
              >
                {genre.name}
              </span>
            ))}
          </div>
        )}
      </div>

      {/* Genres below for small screens */}
      {data.genres && data.genres.length > 0 && (
        <div className="flex sm:hidden flex-wrap gap-2 justify-start items-center mb-6 -mt-3">
          {data.genres.map((genre, index) => (
            <span
              key={genre.id}
              className="text-[11px] px-2 py-0.5 rounded-full bg-white/20 text-white/80 transition-all duration-300 hover:scale-110 animate-[scaleIn_0.6s_ease-out_forwards]"
              style={{
                animationDelay: `${((data.genres?.length ?? 0) - 1 - index) * 60}ms`,
                transform: "scale(0)",
                opacity: 0,
              }}
            >
              {genre.name}
            </span>
          ))}
        </div>
      )}
    </>
  );
}
