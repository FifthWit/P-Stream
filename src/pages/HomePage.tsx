import { useEffect, useRef, useState } from "react";
import { Helmet } from "react-helmet-async";
import { useTranslation } from "react-i18next";
import { To, useNavigate } from "react-router-dom";

import { WideContainer } from "@/components/layout/WideContainer";
import { DetailsModal } from "@/components/overlays/DetailsModal";
import { useModal } from "@/components/overlays/Modal";
import { useDebounce } from "@/hooks/useDebounce";
import { useRandomTranslation } from "@/hooks/useRandomTranslation";
import { useSearchQuery } from "@/hooks/useSearchQuery";
import { FeaturedCarousel } from "@/pages/discover/components/FeaturedCarousel";
import type { FeaturedMedia } from "@/pages/discover/components/FeaturedCarousel";
import DiscoverContent from "@/pages/discover/discoverContent";
import { HomeLayout } from "@/pages/layouts/HomeLayout";
import { BookmarksCarousel } from "@/pages/parts/home/BookmarksCarousel";
import { BookmarksPart } from "@/pages/parts/home/BookmarksPart";
import { HeroPart } from "@/pages/parts/home/HeroPart";
import { WatchingCarousel } from "@/pages/parts/home/WatchingCarousel";
import { WatchingPart } from "@/pages/parts/home/WatchingPart";
import { SearchListPart } from "@/pages/parts/search/SearchListPart";
import { SearchLoadingPart } from "@/pages/parts/search/SearchLoadingPart";
import { conf } from "@/setup/config";
import { usePreferencesStore } from "@/stores/preferences";
import { MediaItem } from "@/utils/mediaTypes";

import { Button } from "./About";
import { AdsPart } from "./parts/home/AdsPart";

function useSearch(search: string) {
  const [searching, setSearching] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(false);

  const debouncedSearch = useDebounce<string>(search, 500);
  useEffect(() => {
    setSearching(search !== "");
    setLoading(search !== "");
    if (search !== "") {
      window.scrollTo(0, 0);
    }
  }, [search]);
  useEffect(() => {
    setLoading(false);
  }, [debouncedSearch]);

  return {
    loading,
    searching,
  };
}

// What the sigma?

export function HomePage() {
  const { t } = useTranslation();
  const { t: randomT } = useRandomTranslation();
  const emptyText = randomT(`home.search.empty`);
  const navigate = useNavigate();
  const [showBg, setShowBg] = useState<boolean>(false);
  const searchParams = useSearchQuery();
  const [search] = searchParams;
  const s = useSearch(search);
  const [showBookmarks, setShowBookmarks] = useState(false);
  const [showWatching, setShowWatching] = useState(false);
  const [detailsData, setDetailsData] = useState<any>();
  const detailsModal = useModal("details");
  const enableDiscover = usePreferencesStore((state) => state.enableDiscover);
  const enableFeatured = usePreferencesStore((state) => state.enableFeatured);
  const carouselRefs = useRef<{ [key: string]: HTMLDivElement | null }>({});
  const enableCarouselView = usePreferencesStore(
    (state) => state.enableCarouselView,
  );
  const isMobile = window.innerWidth < 768;

  const handleClick = (path: To) => {
    window.scrollTo(0, 0);
    navigate(path);
  };

  const handleShowDetails = async (media: MediaItem | FeaturedMedia) => {
    setDetailsData({
      id: Number(media.id),
      type: media.type === "movie" ? "movie" : "show",
    });
    detailsModal.show();
  };

  // const { loggedIn } = useAuth(); // Adjust padding for popup show button based on logged in state

  return (
    <HomeLayout showBg={showBg}>
      {/* <a
        onClick={() => modal.show()}
        className={` text-white tabbable rounded-full z-50 fixed top-5 ${
          loggedIn
            ? "right-[7.5rem] lg:right-[12.5rem] lg:text-2xl"
            : "right-[7.5rem] text-xl lg:text-lg"
        }`}
        style={{ animation: "pulse 1s infinite" }}
      >
        <IconPill icon={Icons.WARNING}>
          <span className="font-bold select-none">READ</span>
        </IconPill>
      </a> */}
      <div className="mb-2">
        <Helmet>
          <style type="text/css">{`
            html, body {
              scrollbar-gutter: stable;
            }
          `}</style>
          <title>{t("global.name")}</title>
        </Helmet>

        {/* Popup 
        <FancyModal
          id="notice"
          title="We're changing our backend server!"
          oneTime
        >
          <div>
            <p>
              On <strong>January 8th</strong>, the backend server will change
              from:
            </p>
            <p>
              <strong>server.vidbinge.com</strong> →{" "}
              <strong>server.fifthwit.tech</strong>
            </p>
            <br />
            <p>
              You will need to <strong>migrate your account </strong> to the new
              server or choose to continue using the old server by updating your
              settings.
            </p>
            <br />
            <p>
              <strong>What You Need to Know:</strong>
            </p>
            <ul>
              <li>
                1. <strong>Migrating Your Account:</strong> Your data (e.g.,
                bookmarks) will not be automatically transferred. You&apos;ll
                need to migrate your account from the settings page. Or from
                below.
              </li>
              <li>
                2. <strong>Staying on the Old Server:</strong> If you don&apos;t
                want to change to the new server, your data will remain safe on{" "}
                <strong>server.vidbinge.com</strong>. You can change the Backend
                URL in your settings to &quot;https://server.vidbinge.com&quot;.
              </li>
            </ul>
            <br />
            <p>
              <strong>Steps to Move Your Data:</strong>
            </p>
            <ol>
              <li>
                1. Log into your account on <strong>server.vidbinge.com</strong>
                .
              </li>
              <li>
                (If you already are logged in, press here:{" "}
                <a href="/migration" className="text-type-link">
                  Migrate my data.
                </a>
                )
              </li>
              <li>
                2. Go to the <strong>Settings</strong> page.
              </li>
              <li>
                3. Scroll down to{" "}
                <strong>Connections &gt; Custom Server</strong>.
              </li>
              <li>
                3. Press the &quot;Migrate my data to a new server.&quot;
                button.
              </li>
              <li>
                4. Enter the new server url:{" "}
                <strong>https://server.fifthwit.tech</strong> and press
                &quot;Migrate&quot;.
              </li>
              <li>5. Login to your account with the same passphrase!</li>
            </ol>
            <br />
            <p>
              Thank you for your understanding and support during this
              transition! If you have questions or need help, feel free to reach
              out on the{" "}
              <a
                href="https://discord.com/invite/7z6znYgrTG"
                target="_blank"
                rel="noopener noreferrer"
                className="text-type-link"
              >
                P-Stream Discord
              </a>
              !
            </p>
          </div>
        </FancyModal>
        */}
        {enableFeatured ? (
          <FeaturedCarousel
            forcedCategory="editorpicks"
            onShowDetails={handleShowDetails}
            searching={s.searching}
            shorter
          >
            <HeroPart
              searchParams={searchParams}
              setIsSticky={setShowBg}
              isInFeatured
            />
          </FeaturedCarousel>
        ) : (
          <HeroPart
            searchParams={searchParams}
            setIsSticky={setShowBg}
            showTitle
          />
        )}
        {conf().SHOW_AD ? <AdsPart /> : null}
      </div>
      <WideContainer ultraWide={enableCarouselView}>
        {s.loading ? (
          <SearchLoadingPart />
        ) : s.searching ? (
          enableCarouselView ? (
            <WideContainer>
              <SearchListPart
                searchQuery={search}
                onShowDetails={handleShowDetails}
              />
            </WideContainer>
          ) : (
            <SearchListPart
              searchQuery={search}
              onShowDetails={handleShowDetails}
            />
          )
        ) : (
          <div className="flex flex-col gap-8">
            {enableCarouselView ? (
              <>
                <WatchingCarousel
                  isMobile={isMobile}
                  carouselRefs={carouselRefs}
                  onShowDetails={handleShowDetails}
                />
                <BookmarksCarousel
                  isMobile={isMobile}
                  carouselRefs={carouselRefs}
                  onShowDetails={handleShowDetails}
                />
              </>
            ) : (
              <>
                <WatchingPart
                  onItemsChange={setShowWatching}
                  onShowDetails={handleShowDetails}
                />
                <BookmarksPart
                  onItemsChange={setShowBookmarks}
                  onShowDetails={handleShowDetails}
                />
              </>
            )}
          </div>
        )}
        {!(showBookmarks || showWatching) && !enableDiscover ? (
          <div className="flex flex-col translate-y-[-30px] items-center justify-center pt-20">
            <p className="text-[18.5px] pb-3">{emptyText}</p>
          </div>
        ) : null}
        {enableDiscover &&
          (enableFeatured ? (
            <div className="pb-4" />
          ) : showBookmarks || showWatching ? (
            <div className="pb-10" />
          ) : (
            <div className="pb-20" />
          ))}
        {/* there... perfect. */}
        {enableDiscover && !search ? (
          <DiscoverContent />
        ) : (
          <div className="flex flex-col justify-center items-center h-40 space-y-4">
            <div className="flex flex-col items-center justify-center">
              {!search && (
                <Button
                  className="px-py p-[0.35em] mt-3 rounded-xl text-type-dimmed box-content text-[18px] bg-largeCard-background justify-center items-center"
                  onClick={() => handleClick("/discover")}
                >
                  {t("home.search.discover")}
                </Button>
              )}
            </div>
          </div>
        )}
      </WideContainer>

      {detailsData && <DetailsModal id="details" data={detailsData} />}
    </HomeLayout>
  );
}
