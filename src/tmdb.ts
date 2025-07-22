import axios from "axios";

const TMDB_BASE_URL = "https://api.themoviedb.org/3";

export interface TMDBMovie {
  id: number;
  title: string;
  release_date?: string;
  genres?: { id: number; name: string }[];
  backdrop_path?: string;
  // Add more fields as needed
}

export interface TMDBShow {
  id: number;
  name: string;
  first_air_date?: string;
  genres?: { id: number; name: string }[];
  backdrop_path?: string;
  seasons?: any[];
  // Add more fields as needed
}

export async function getTMDBMovie(apiKey: string, tmdbId: number): Promise<TMDBMovie> {
  const res = await axios.get(`${TMDB_BASE_URL}/movie/${tmdbId}`, {
    params: { api_key: apiKey },
  });
  return res.data;
}

export async function getTMDBShow(apiKey: string, tmdbId: number): Promise<TMDBShow> {
  const res = await axios.get(`${TMDB_BASE_URL}/tv/${tmdbId}`, {
    params: { api_key: apiKey },
  });
  return res.data;
} 