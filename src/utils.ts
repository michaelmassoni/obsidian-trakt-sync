import { TraktHistoryItem } from "./trakt";

export interface GroupedHistory {
  [key: string]: TraktHistoryItem[];
}

export function groupHistoryItems(items: TraktHistoryItem[]): GroupedHistory {
  const grouped: GroupedHistory = {};
  for (const item of items) {
    if (item.type === "movie" && item.movie) {
      const id = item.movie.ids.trakt;
      grouped[`movie-${id}`] = grouped[`movie-${id}`] || [];
      grouped[`movie-${id}`].push(item);
    } else if (item.type === "show" && item.show) {
      const id = item.show.ids.trakt;
      grouped[`show-${id}`] = grouped[`show-${id}`] || [];
      grouped[`show-${id}`].push(item);
    } else if (item.type === "episode" && item.show) {
      const id = item.show.ids.trakt;
      grouped[`show-${id}`] = grouped[`show-${id}`] || [];
      grouped[`show-${id}`].push(item);
    }
  }
  return grouped;
}

export function getLastWatched(items: TraktHistoryItem[]): string {
  const lastWatched = items.map(i => i.watched_at).sort().reverse()[0];
  return lastWatched ? lastWatched.split('T')[0] : '';
}

export function getWatchedCount(items: TraktHistoryItem[], type: "movie" | "show"): number {
  if (type === "movie") {
    return items.length;
  } else {
    // For shows, count unique episodes
    const seen = new Set<string>();
    for (const i of items) {
      if (i.episode) {
        seen.add(`${i.episode.season}-${i.episode.number}`);
      }
    }
    return seen.size;
  }
}

export function getLastEpisodeInfo(items: TraktHistoryItem[]): string | undefined {
  const episodes = items.filter(i => i.episode);
  if (!episodes.length) return undefined;
  const latest = episodes.sort((a, b) => b.watched_at.localeCompare(a.watched_at))[0];
  const ep = latest.episode;
  return `S${String(ep.season).padStart(2, "0")}E${String(ep.number).padStart(2, "0")} - ${ep.title}`;
} 