"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.groupHistoryItems = groupHistoryItems;
exports.getLastWatched = getLastWatched;
exports.getWatchedCount = getWatchedCount;
exports.getLastEpisodeInfo = getLastEpisodeInfo;
function groupHistoryItems(items) {
    var grouped = {};
    for (var _i = 0, items_1 = items; _i < items_1.length; _i++) {
        var item = items_1[_i];
        if (item.type === "movie" && item.movie) {
            var id = item.movie.ids.trakt;
            grouped["movie-".concat(id)] = grouped["movie-".concat(id)] || [];
            grouped["movie-".concat(id)].push(item);
        }
        else if (item.type === "show" && item.show) {
            var id = item.show.ids.trakt;
            grouped["show-".concat(id)] = grouped["show-".concat(id)] || [];
            grouped["show-".concat(id)].push(item);
        }
        else if (item.type === "episode" && item.show) {
            var id = item.show.ids.trakt;
            grouped["show-".concat(id)] = grouped["show-".concat(id)] || [];
            grouped["show-".concat(id)].push(item);
        }
    }
    return grouped;
}
function getLastWatched(items) {
    return items.map(function (i) { return i.watched_at; }).sort().reverse()[0];
}
function getWatchedCount(items, type) {
    if (type === "movie") {
        return items.length;
    }
    else {
        // For shows, count unique episodes
        var seen = new Set();
        for (var _i = 0, items_2 = items; _i < items_2.length; _i++) {
            var i = items_2[_i];
            if (i.episode) {
                seen.add("".concat(i.episode.season, "-").concat(i.episode.number));
            }
        }
        return seen.size;
    }
}
function getLastEpisodeInfo(items) {
    var episodes = items.filter(function (i) { return i.episode; });
    if (!episodes.length)
        return undefined;
    var latest = episodes.sort(function (a, b) { return b.watched_at.localeCompare(a.watched_at); })[0];
    var ep = latest.episode;
    return "S".concat(String(ep.season).padStart(2, "0"), "E").concat(String(ep.number).padStart(2, "0"), " - ").concat(ep.title);
}
