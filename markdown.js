"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.buildMarkdown = buildMarkdown;
function buildMarkdown(_a) {
    var title = _a.title, mediaType = _a.mediaType, tags = _a.tags, lastWatched = _a.lastWatched, watchedCount = _a.watchedCount, lastEpisodeInfo = _a.lastEpisodeInfo, schemaVersion = _a.schemaVersion, traktId = _a.traktId, tmdbId = _a.tmdbId, releaseDate = _a.releaseDate, genres = _a.genres, backdrop = _a.backdrop, _b = _a.propLastWatched, propLastWatched = _b === void 0 ? "last_watched" : _b, _c = _a.propWatchedCount, propWatchedCount = _c === void 0 ? "watched_count" : _c, _d = _a.propLastEpisodeWatched, propLastEpisodeWatched = _d === void 0 ? "last_episode_watched" : _d, _e = _a.propReleaseDate, propReleaseDate = _e === void 0 ? "release_date" : _e, _f = _a.propGenres, propGenres = _f === void 0 ? "genres" : _f, _g = _a.propBackdrop, propBackdrop = _g === void 0 ? "backdrop" : _g;
    var tagsStr = "[".concat(tags.map(function (t) { return "\"".concat(t, "\""); }).join(", "), "]");
    var content = "---\ntitle: \"".concat(title, "\"\ntype: ").concat(mediaType, "\ntags: ").concat(tagsStr, "\n").concat(propLastWatched, ": ").concat(lastWatched, "\n").concat(propWatchedCount, ": ").concat(watchedCount, "\n");
    if (mediaType === "show" && lastEpisodeInfo) {
        content += "".concat(propLastEpisodeWatched, ": \"").concat(lastEpisodeInfo, "\"\n");
    }
    content += "schema_version: \"".concat(schemaVersion, "\"\ntrakt_id: ").concat(traktId, "\ntmdb_id: ").concat(tmdbId, "\n");
    if (releaseDate !== undefined)
        content += "".concat(propReleaseDate, ": ").concat(releaseDate, "\n");
    if (genres !== undefined)
        content += "".concat(propGenres, ": [").concat((genres !== null && genres !== void 0 ? genres : []).map(function (g) { return "\"".concat(g, "\""); }).join(", "), "]\n");
    if (backdrop !== undefined)
        content += "".concat(propBackdrop, ": ").concat(backdrop, "\n");
    content += "last_updated: ".concat(new Date().toISOString(), "\n---\n\n");
    return content;
}
