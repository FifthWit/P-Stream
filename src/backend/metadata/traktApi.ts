import { MWMediaType } from "./types/mw";

export interface TraktLatestResponse {
  tmdb_ids: number[];
  count: number;
}

export interface TraktReleaseResponse {
  tmdb_id: number;
  title: string;
  year?: number;
  type: "movie" | "episode";
  season?: number;
  episode?: number;
  quality?: string;
  source?: string;
  group?: string;
  theatrical_release_date?: string;
  digital_release_date?: string;
}

export type TraktContentType = "movie" | "episode";

export const TRAKT_BASE_URL = "https://fed-airdate.pstream.org";

export async function getLatestReleases(): Promise<TraktLatestResponse> {
  const response = await fetch(`${TRAKT_BASE_URL}/latest`);
  if (!response.ok) {
    throw new Error(`Failed to fetch latest releases: ${response.statusText}`);
  }
  return response.json();
}

export async function getLatest4KReleases(): Promise<TraktLatestResponse> {
  const response = await fetch(`${TRAKT_BASE_URL}/latest4k`);
  if (!response.ok) {
    throw new Error(
      `Failed to fetch latest 4K releases: ${response.statusText}`,
    );
  }
  return response.json();
}

export async function getReleaseDetails(
  id: string,
  season?: number,
  episode?: number,
): Promise<TraktReleaseResponse> {
  let url = `${TRAKT_BASE_URL}/release/${id}`;
  if (season !== undefined && episode !== undefined) {
    url += `/${season}/${episode}`;
  }

  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Failed to fetch release details: ${response.statusText}`);
  }
  return response.json();
}

export async function getAppleTVReleases(): Promise<TraktLatestResponse> {
  const response = await fetch(`${TRAKT_BASE_URL}/appletv`);
  if (!response.ok) {
    throw new Error(
      `Failed to fetch Apple TV releases: ${response.statusText}`,
    );
  }
  return response.json();
}

export function convertToMediaType(type: TraktContentType): MWMediaType {
  return type === "movie" ? MWMediaType.MOVIE : MWMediaType.SERIES;
}

export function convertFromMediaType(type: MWMediaType): TraktContentType {
  return type === MWMediaType.MOVIE ? "movie" : "episode";
}
