import slugify from "slugify";

export function buildMarkdown({
  title,
  mediaType,
  tags,
  lastWatched,
  watchedCount,
  lastEpisodeInfo,
  traktId,
  tmdbId,
  releaseDate,
  genres,
  backdrop,
  propLastWatched = "last_watched",
  propWatchedCount = "watched_count",
  propLastEpisodeWatched = "last_episode_watched",
  propReleaseDate = "release_date",
  propGenres = "genres",
  propBackdrop = "backdrop",
  propTraktId = "trakt_id",
  propTmdbId = "tmdb_id",
}: {
  title: string;
  mediaType: "movie" | "show";
  tags: string[];
  lastWatched: string | Date;
  watchedCount: number;
  lastEpisodeInfo?: string;
  traktId?: string | number;
  tmdbId?: string | number;
  releaseDate?: string;
  genres?: string[];
  backdrop?: string;
  propLastWatched?: string;
  propWatchedCount?: string;
  propLastEpisodeWatched?: string;
  propReleaseDate?: string;
  propGenres?: string;
  propBackdrop?: string;
  propTraktId?: string;
  propTmdbId?: string;
}): string {
  const tagsStr = `[${tags.map((t) => `"${t}"`).join(", ")}]`;
  // Ensure lastWatched is formatted as YYYY-MM-DD
  let lastWatchedStr = '';
  if (lastWatched instanceof Date) {
    lastWatchedStr = lastWatched.toISOString().split('T')[0];
  } else if (typeof lastWatched === 'string') {
    lastWatchedStr = lastWatched.split('T')[0];
  }
  let content = `---\n`;
  content += `title: \"${title}\"\n`;
  content += `type: ${mediaType}\n`;
  content += `tags: ${tagsStr}\n`;
  content += `${propLastWatched}: ${lastWatchedStr}\n`;
  content += `${propWatchedCount}: ${watchedCount}\n`;
  if (mediaType === "show" && lastEpisodeInfo) {
    content += `${propLastEpisodeWatched}: \"${lastEpisodeInfo}\"\n`;
  }
  if (releaseDate !== undefined) content += `${propReleaseDate}: ${releaseDate}\n`;
  if (genres !== undefined) content += `${propGenres}: [${(genres ?? []).map((g) => `\"${g}\"`).join(", ")}]\n`;
  if (backdrop !== undefined) content += `${propBackdrop}: ${backdrop}\n`;
  if (traktId !== undefined) content += `${propTraktId}: ${traktId}\n`;
  if (tmdbId !== undefined) content += `${propTmdbId}: ${tmdbId}\n`;
  content += `last_updated: ${new Date().toISOString()}\n---\n\n`;
  return content;
} 