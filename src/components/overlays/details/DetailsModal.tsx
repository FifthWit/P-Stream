import classNames from "classnames";
import { useEffect, useState } from "react";
import { Helmet } from "react-helmet-async";

import {
  getMediaBackdrop,
  getMediaDetails,
  getMediaLogo,
} from "@/backend/metadata/tmdb";
import {
  TMDBContentTypes,
  TMDBMovieData,
  TMDBShowData,
} from "@/backend/metadata/types/tmdb";
import { IconPatch } from "@/components/buttons/IconPatch";
import { Icons } from "@/components/Icon";
import { Flare } from "@/components/utils/Flare";

import { useModal } from "../Modal";
import { OverlayPortal } from "../OverlayDisplay";
import { DetailsContent } from "./DetailsContent";
import { DetailsSkeleton } from "./DetailsSkeleton";
import { DetailsModalProps } from "./types";

export function DetailsModal({ id, data, minimal }: DetailsModalProps) {
  const modal = useModal(id);
  const [detailsData, setDetailsData] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    const fetchDetails = async () => {
      if (!data?.id || !data?.type) return;

      setIsLoading(true);
      try {
        const type =
          data.type === "movie" ? TMDBContentTypes.MOVIE : TMDBContentTypes.TV;
        const details = await getMediaDetails(data.id.toString(), type);
        const backdropUrl = getMediaBackdrop(details.backdrop_path);
        const logoUrl = await getMediaLogo(data.id.toString(), type);
        if (type === TMDBContentTypes.MOVIE) {
          const movieDetails = details as TMDBMovieData;
          setDetailsData({
            title: movieDetails.title,
            overview: movieDetails.overview,
            backdrop: backdropUrl,
            runtime: movieDetails.runtime,
            genres: movieDetails.genres,
            language: movieDetails.original_language,
            voteAverage: movieDetails.vote_average,
            voteCount: movieDetails.vote_count,
            releaseDate: movieDetails.release_date,
            rating: movieDetails.release_dates?.results?.find(
              (r) => r.iso_3166_1 === "US",
            )?.release_dates?.[0]?.certification,
            type: "movie",
            id: movieDetails.id,
            imdbId: movieDetails.external_ids?.imdb_id,
            logoUrl,
          });
        } else {
          const showDetails = details as TMDBShowData & {
            episodes: Array<{
              id: number;
              name: string;
              episode_number: number;
              overview: string;
              still_path: string | null;
              air_date: string;
              season_number: number;
            }>;
          };
          setDetailsData({
            title: showDetails.name,
            overview: showDetails.overview,
            backdrop: backdropUrl,
            episodes: showDetails.number_of_episodes,
            seasons: showDetails.number_of_seasons,
            genres: showDetails.genres,
            language: showDetails.original_language,
            voteAverage: showDetails.vote_average,
            voteCount: showDetails.vote_count,
            releaseDate: showDetails.first_air_date,
            rating: showDetails.content_ratings?.results?.find(
              (r) => r.iso_3166_1 === "US",
            )?.rating,
            type: "show",
            id: showDetails.id,
            imdbId: showDetails.external_ids?.imdb_id,
            seasonData: {
              seasons: showDetails.seasons,
              episodes: showDetails.episodes,
            },
            logoUrl,
          });
        }
      } catch (err) {
        console.error("Failed to fetch media details:", err);
      } finally {
        setIsLoading(false);
      }
    };

    if (modal.isShown && data?.id) {
      fetchDetails();
    }
  }, [modal.isShown, data]);

  useEffect(() => {
    if (modal.isShown && !data?.id && !isLoading) {
      modal.hide();
    }
  }, [modal, data, isLoading]);

  return (
    <OverlayPortal darken close={modal.hide} show={modal.isShown}>
      <Helmet>
        <html data-no-scroll />
      </Helmet>
      <div className="flex absolute inset-0 items-center justify-center">
        <Flare.Base
          className={classNames(
            "group -m-[0.705em] rounded-3xl bg-background-main transition-colors duration-300 focus:relative focus:z-10",
            "max-h-[900px] max-w-[1200px]",
            "bg-mediaCard-hoverBackground bg-opacity-60 backdrop-filter backdrop-blur-lg shadow-lg overflow-hidden",
            minimal
              ? "h-[90%] md:h-[70%] lg:h-fit w-[90%] md:w-[70%] lg:w-[50%]"
              : "h-[90%] w-[90%] md:w-[70%] lg:w-[60%]",
          )}
        >
          <div className="transition-transform duration-300 h-full">
            <Flare.Light
              flareSize={300}
              cssColorVar="--colors-mediaCard-hoverAccent"
              backgroundClass="bg-mediaCard-hoverBackground duration-100"
              className="rounded-3xl bg-background-main group-hover:opacity-100"
            />
            <Flare.Child className="pointer-events-auto relative h-full overflow-y-auto scrollbar-none select-text">
              <div className="absolute right-4 top-4 z-10">
                <button
                  type="button"
                  className="text-s font-semibold text-type-secondary hover:text-white transition-transform hover:scale-95 select-none"
                  onClick={modal.hide}
                >
                  <IconPatch icon={Icons.X} />
                </button>
              </div>
              <div className="pt-12 select-text">
                {isLoading || !detailsData ? (
                  <DetailsSkeleton />
                ) : (
                  <DetailsContent data={detailsData} minimal={minimal} />
                )}
              </div>
            </Flare.Child>
          </div>
        </Flare.Base>
      </div>
    </OverlayPortal>
  );
}
