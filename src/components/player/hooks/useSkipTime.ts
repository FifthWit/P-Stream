import { useEffect, useState } from "react";

import { usePlayerMeta } from "@/components/player/hooks/usePlayerMeta";
import { conf } from "@/setup/config";

// Thanks Nemo, Custom, and Roomba for this API
const BASE_URL = "https://web-production-13a39.up.railway.app";
const MAX_RETRIES = 3;

export function useSkipTime() {
  const { playerMeta: meta } = usePlayerMeta();
  const [skiptime, setSkiptime] = useState<number | null>(null);

  useEffect(() => {
    const fetchSkipTime = async (retries = 0): Promise<void> => {
      if (!meta?.tmdbId || meta.type === "movie") return;
      if (!conf().ALLOW_FEBBOX_KEY) return;

      try {
        const apiUrl = `${BASE_URL}/${meta.tmdbId}/${meta.season?.number}/${meta.episode?.number}`;
        const response = await fetch(apiUrl);

        if (!response.ok) {
          if (response.status === 500 && retries < MAX_RETRIES) {
            return fetchSkipTime(retries + 1);
          }
          throw new Error("API request failed");
        }

        const data = await response.json();

        const skipTime = data.introSkipTime
          ? parseInt(data.introSkipTime.replace("s", ""), 10)
          : null;

        // eslint-disable-next-line no-console
        console.log("Skip time:", skipTime);
        setSkiptime(skipTime);
      } catch (error) {
        console.error("Error fetching skip time:", error);
        setSkiptime(null);
      }
    };

    fetchSkipTime();
  }, [meta?.tmdbId, meta?.type, meta?.season?.number, meta?.episode?.number]);

  return skiptime;
}
