import classNames from "classnames";
import { useCallback } from "react";
import { useTranslation } from "react-i18next";

import { Menu } from "@/components/player/internals/ContextMenu";
import { useOverlayRouter } from "@/hooks/useOverlayRouter";
import { usePlayerStore } from "@/stores/player/store";

function ButtonList(props: {
  options: number[];
  selected: number;
  onClick: (v: any) => void;
}) {
  return (
    <div className="flex items-center bg-video-context-light/10 p-1 rounded-lg">
      {props.options.map((option) => {
        return (
          <button
            type="button"
            className={classNames(
              "w-full px-2 py-1 rounded-md tabbable",
              props.selected === option
                ? "bg-video-context-light/20 text-white"
                : null,
            )}
            onClick={() => props.onClick(option)}
            key={option}
          >
            {option}x
          </button>
        );
      })}
    </div>
  );
}

export function PlaybackSettingsView({ id }: { id: string }) {
  const { t } = useTranslation();
  const router = useOverlayRouter(id);
  const playbackRate = usePlayerStore((s) => s.mediaPlaying.playbackRate);
  const display = usePlayerStore((s) => s.display);

  const setPlaybackRate = useCallback(
    (v: number) => {
      display?.setPlaybackRate(v);
    },
    [display],
  );

  const options = [0.25, 0.5, 1, 1.5, 2];

  return (
    <>
      <Menu.BackLink onClick={() => router.navigate("/")}>
        {t("player.menus.playback.title")}
      </Menu.BackLink>
      <Menu.Section>
        <div className="space-y-4 mt-3">
          <Menu.FieldTitle>
            {t("player.menus.playback.speedLabel")}
          </Menu.FieldTitle>
          <ButtonList
            options={options}
            selected={playbackRate}
            onClick={setPlaybackRate}
          />
        </div>
      </Menu.Section>
    </>
  );
}
