import { useState } from "react";

import { Icons } from "@/components/Icon";
import { DetailsModal } from "@/components/overlays/details/DetailsModal";
import { useModal } from "@/components/overlays/Modal";
import { usePlayerStore } from "@/stores/player/store";

import { VideoPlayerButton } from "./Button";

export function InfoButton() {
  const meta = usePlayerStore((s) => s.meta);
  const modal = useModal("player-details");
  const [detailsData, setDetailsData] = useState<{
    id: number;
    type: "movie" | "show";
  } | null>(null);

  const handleClick = async () => {
    if (!meta?.tmdbId) return;

    setDetailsData({
      id: Number(meta.tmdbId),
      type: meta.type === "movie" ? "movie" : "show",
    });
    modal.show();
  };

  return (
    <>
      <VideoPlayerButton
        icon={Icons.CIRCLE_QUESTION}
        iconSizeClass="text-base"
        className="p-2 !-mr-2"
        onClick={handleClick}
      />
      {detailsData && (
        <DetailsModal id="player-details" data={detailsData} minimal />
      )}
    </>
  );
}
