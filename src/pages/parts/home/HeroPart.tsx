import { useCallback, useEffect, useRef, useState } from "react";
import Sticky from "react-sticky-el";
import { useWindowSize } from "react-use";

import { SearchBarInput } from "@/components/form/SearchBar";
import { Icon, Icons } from "@/components/Icon";
import { ThinContainer } from "@/components/layout/ThinContainer";
import { useSlashFocus } from "@/components/player/hooks/useSlashFocus";
import { HeroTitle } from "@/components/text/HeroTitle";
import { useIsTV } from "@/hooks/useIsTv";
import { useRandomTranslation } from "@/hooks/useRandomTranslation";
import { useSearchQuery } from "@/hooks/useSearchQuery";
import { conf } from "@/setup/config";
import { useBannerSize } from "@/stores/banner";

export interface HeroPartProps {
  setIsSticky: (val: boolean) => void;
  searchParams: ReturnType<typeof useSearchQuery>;
}

function getTimeOfDay(date: Date): "night" | "morning" | "day" | "420" | "69" {
  const month = date.getMonth() + 1;
  const day = date.getDate();
  if (month === 4 && day === 20) return "420";
  if (month === 6 && day === 9) return "69";
  const hour = date.getHours();
  if (hour < 5) return "night";
  if (hour < 12) return "morning";
  if (hour < 19) return "day";
  return "night";
}

function getCookie(name: string): string | null {
  const cookies = document.cookie.split(";");
  for (let i = 0; i < cookies.length; i += 1) {
    const cookie = cookies[i].trim();
    if (cookie.startsWith(`${name}=`)) {
      return cookie.substring(name.length + 1);
    }
  }
  return null;
}

function setCookie(name: string, value: string, expiryDays: number): void {
  const date = new Date();
  date.setTime(date.getTime() + expiryDays * 24 * 60 * 60 * 1000);
  const expires = `expires=${date.toUTCString()}`;
  document.cookie = `${name}=${value};${expires};path=/`;
}

export function HeroPart({ setIsSticky, searchParams }: HeroPartProps) {
  const { t: randomT } = useRandomTranslation();
  const [search, setSearch, setSearchUnFocus] = searchParams;
  const [, setShowBg] = useState(false);
  const [isAdDismissed, setIsAdDismissed] = useState(() => {
    return getCookie("adDismissed") === "true";
  });
  const bannerSize = useBannerSize();
  const stickStateChanged = useCallback(
    (isFixed: boolean) => {
      setShowBg(isFixed);
      setIsSticky(isFixed);
    },
    [setShowBg, setIsSticky],
  );
  const { width: windowWidth, height: windowHeight } = useWindowSize();

  const { isTV } = useIsTV();

  // Detect if running as a PWA on iOS
  const isIOSPWA =
    /iPad|iPhone|iPod/i.test(navigator.userAgent) &&
    window.matchMedia("(display-mode: standalone)").matches;

  const topSpacing = isIOSPWA ? 60 : 16;
  const [stickyOffset, setStickyOffset] = useState(topSpacing);

  const isLandscape = windowHeight < windowWidth && isIOSPWA;
  const adjustedOffset = isLandscape
    ? -40 // landscape
    : 0; // portrait

  const dismissAd = useCallback(() => {
    setIsAdDismissed(true);
    setCookie("adDismissed", "true", 2); // Expires after 2 days
  }, []);

  useEffect(() => {
    if (windowWidth > 1280) {
      // On large screens the bar goes inline with the nav elements
      setStickyOffset(topSpacing);
    } else {
      // On smaller screens the bar goes below the nav elements
      setStickyOffset(topSpacing + 60 + adjustedOffset);
    }
  }, [adjustedOffset, topSpacing, windowWidth]);

  const time = getTimeOfDay(new Date());
  const title = randomT(`home.titles.${time}`);
  const placeholder = randomT(`home.search.placeholder`);
  const inputRef = useRef<HTMLInputElement>(null);
  useSlashFocus(inputRef);

  return (
    <ThinContainer>
      <div className="mt-44 space-y-16 text-center">
        <div className="relative z-10 mb-16">
          {isTV && search.length > 0 ? null : (
            <HeroTitle className="mx-auto max-w-md">{title}</HeroTitle>
          )}
        </div>
        <div className="relative h-20 z-30">
          <Sticky
            topOffset={stickyOffset * -1 + bannerSize}
            stickyStyle={{
              paddingTop: `${stickyOffset + bannerSize}px`,
            }}
            onFixedToggle={stickStateChanged}
          >
            <SearchBarInput
              ref={inputRef}
              onChange={setSearch}
              value={search}
              onUnFocus={setSearchUnFocus}
              placeholder={placeholder ?? ""}
            />
          </Sticky>
        </div>
      </div>

      {/* Optional ad */}
      {conf().SHOW_AD && !isAdDismissed ? (
        <div className="-mb-10 md:-mb-20 w-fit max-w-[32rem] mx-auto relative group pb-4">
          {(() => {
            const adContentUrl = conf().AD_CONTENT_URL;

            // VITE_AD_CONTENT_URL=default message (null will be nothing),referal link,image link, card message
            // Ensure adContentUrl is an array. If not, render nothing for ads.
            if (!Array.isArray(adContentUrl)) {
              return null;
            }

            const ad1LinkIsValid =
              typeof adContentUrl[1] === "string" && adContentUrl[1].length > 0;
            const ad1ImageIsProvided = typeof adContentUrl[2] === "string";
            const showAd1 =
              adContentUrl.length >= 2 && ad1LinkIsValid && ad1ImageIsProvided;

            const ad2LinkIsValid =
              typeof adContentUrl[3] === "string" && adContentUrl[3].length > 0;
            const ad2ImageIsProvided = typeof adContentUrl[4] === "string";
            const showAd2 =
              adContentUrl.length >= 5 && ad2LinkIsValid && ad2ImageIsProvided;

            return (
              <>
                <div className="flex flex-col md:flex-row md:space-x-4 space-y-4 md:space-y-0 justify-center w-full items-center md:items-start">
                  {showAd1 ? (
                    <div className="hover:scale-[1.02] max-w-[16rem] bg-opacity-10 bg-buttons-purple backdrop-blur-sm rounded-xl border-2 border-buttons-purple border-opacity-30 transition-all duration-300 hover:border-opacity-70 hover:shadow-lg hover:shadow-buttons-purple/20 md:flex-1 relative group">
                      <button
                        onClick={dismissAd}
                        type="button"
                        className="absolute z-50 -top-2 -right-2 w-6 h-6 bg-mediaCard-hoverBackground rounded-full flex items-center justify-center md:opacity-0 group-hover:opacity-100 transition-opacity duration-300"
                        aria-label="Dismiss ad"
                      >
                        <Icon
                          className="text-xs font-semibold text-type-secondary"
                          icon={Icons.X}
                        />
                      </button>
                      <a href={adContentUrl[1]} className="block">
                        <div className="overflow-hidden rounded-t-xl">
                          <img
                            src={adContentUrl[2]}
                            alt="ad banner"
                            className="w-full h-auto transition-transform duration-300"
                          />
                        </div>
                        <p className="text-xs text-type-dimmed text-center py-2 transition-colors duration-300 group-hover:text-type-secondary">
                          <span>{adContentUrl[3]}</span>
                        </p>
                      </a>
                    </div>
                  ) : null}
                  {showAd2 ? (
                    <div className="hover:scale-[1.02] max-w-[16rem] bg-opacity-10 bg-buttons-purple backdrop-blur-sm rounded-xl border-2 border-buttons-purple border-opacity-30 transition-all duration-300 hover:border-opacity-70 hover:shadow-lg hover:shadow-buttons-purple/20 md:flex-1 relative group">
                      <button
                        onClick={dismissAd}
                        type="button"
                        className="absolute z-50 -top-2 -right-2 w-6 h-6 bg-mediaCard-hoverBackground rounded-full flex items-center justify-center md:opacity-0 group-hover:opacity-100 transition-opacity duration-300"
                        aria-label="Dismiss ad"
                      >
                        <Icon
                          className="text-xs font-semibold text-type-secondary"
                          icon={Icons.X}
                        />
                      </button>
                      <a href={adContentUrl[4]} className="block">
                        <div className="overflow-hidden rounded-t-xl">
                          <img
                            src={adContentUrl[5]}
                            alt="ad banner"
                            className="w-full h-auto transition-transform duration-300"
                          />
                        </div>
                        <p className="text-xs text-type-dimmed text-center py-2 transition-colors duration-300 group-hover:text-type-secondary">
                          <span>{adContentUrl[6]}</span>
                        </p>
                      </a>
                    </div>
                  ) : null}
                </div>
                {adContentUrl[0] !== "null" && (
                  <div>
                    <p className="text-xs text-type-dimmed text-center pt-2 mx-4">
                      <a
                        href="https://discord.gg/mcjnJK98Gd"
                        target="_blank"
                        rel="noreferrer"
                      >
                        {adContentUrl[0]}
                      </a>
                    </p>
                  </div>
                )}
              </>
            );
          })()}
        </div>
      ) : null}
      {/* End of ad */}
    </ThinContainer>
  );
}
