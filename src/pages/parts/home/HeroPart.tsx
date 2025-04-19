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
            <HeroTitle>P-Stream Beta</HeroTitle>
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
        <div className="-mb-10 md:-mb-20 w-fit max-w-[16rem] mx-auto relative group pb-4">
          <button
            onClick={dismissAd}
            type="button"
            className="absolute -top-2 -right-2 w-6 h-6 bg-mediaCard-hoverBackground rounded-full flex items-center justify-center md:opacity-0 group-hover:opacity-100 transition-opacity duration-300"
            aria-label="Dismiss ad"
          >
            <Icon
              className="text-xs font-semibold text-type-secondary"
              icon={Icons.X}
            />
          </button>
          {conf().AD_CONTENT_URL.length !== 0 ? (
            <div>
              <a href={conf().AD_CONTENT_URL[0]}>
                <img src={conf().AD_CONTENT_URL[1]} alt="ad banner" />
              </a>
            </div>
          ) : null}
          <p className="text-xs text-type-dimmed text-center pt-2 mx-4">
            <a
              href="https://discord.gg/mcjnJK98Gd"
              target="_blank"
              rel="noreferrer"
            >
              Your ad here (づ ᴗ _ᴗ)づ♡
            </a>
          </p>
        </div>
      ) : null}
      {/* End of ad */}
    </ThinContainer>
  );
}
