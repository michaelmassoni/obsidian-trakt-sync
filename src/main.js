"use strict";
var __extends = (this && this.__extends) || (function () {
    var extendStatics = function (d, b) {
        extendStatics = Object.setPrototypeOf ||
            ({ __proto__: [] } instanceof Array && function (d, b) { d.__proto__ = b; }) ||
            function (d, b) { for (var p in b) if (Object.prototype.hasOwnProperty.call(b, p)) d[p] = b[p]; };
        return extendStatics(d, b);
    };
    return function (d, b) {
        if (typeof b !== "function" && b !== null)
            throw new TypeError("Class extends value " + String(b) + " is not a constructor or null");
        extendStatics(d, b);
        function __() { this.constructor = d; }
        d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
    };
})();
var __assign = (this && this.__assign) || function () {
    __assign = Object.assign || function(t) {
        for (var s, i = 1, n = arguments.length; i < n; i++) {
            s = arguments[i];
            for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p))
                t[p] = s[p];
        }
        return t;
    };
    return __assign.apply(this, arguments);
};
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __generator = (this && this.__generator) || function (thisArg, body) {
    var _ = { label: 0, sent: function() { if (t[0] & 1) throw t[1]; return t[1]; }, trys: [], ops: [] }, f, y, t, g = Object.create((typeof Iterator === "function" ? Iterator : Object).prototype);
    return g.next = verb(0), g["throw"] = verb(1), g["return"] = verb(2), typeof Symbol === "function" && (g[Symbol.iterator] = function() { return this; }), g;
    function verb(n) { return function (v) { return step([n, v]); }; }
    function step(op) {
        if (f) throw new TypeError("Generator is already executing.");
        while (g && (g = 0, op[0] && (_ = 0)), _) try {
            if (f = 1, y && (t = op[0] & 2 ? y["return"] : op[0] ? y["throw"] || ((t = y["return"]) && t.call(y), 0) : y.next) && !(t = t.call(y, op[1])).done) return t;
            if (y = 0, t) op = [op[0] & 2, t.value];
            switch (op[0]) {
                case 0: case 1: t = op; break;
                case 4: _.label++; return { value: op[1], done: false };
                case 5: _.label++; y = op[1]; op = [0]; continue;
                case 7: op = _.ops.pop(); _.trys.pop(); continue;
                default:
                    if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) { _ = 0; continue; }
                    if (op[0] === 3 && (!t || (op[1] > t[0] && op[1] < t[3]))) { _.label = op[1]; break; }
                    if (op[0] === 6 && _.label < t[1]) { _.label = t[1]; t = op; break; }
                    if (t && _.label < t[2]) { _.label = t[2]; _.ops.push(op); break; }
                    if (t[2]) _.ops.pop();
                    _.trys.pop(); continue;
            }
            op = body.call(thisArg, _);
        } catch (e) { op = [6, e]; y = 0; } finally { f = t = 0; }
        if (op[0] & 5) throw op[1]; return { value: op[0] ? op[1] : void 0, done: true };
    }
};
Object.defineProperty(exports, "__esModule", { value: true });
var obsidian_1 = require("obsidian");
var trakt_1 = require("./trakt");
var tmdb_1 = require("./tmdb");
var markdown_1 = require("./markdown");
var utils_1 = require("./utils");
var slugify_1 = require("slugify");
var DEFAULT_SETTINGS = {
    traktClientId: "",
    traktClientSecret: "",
    tmdbApiKey: "",
    movieFolder: "Movies",
    showFolder: "Shows",
    includeReleaseDate: true,
    includeGenres: true,
    includeBackdrop: true,
    includeLastEpisodeWatched: true,
    propLastWatched: "last_watched",
    propWatchedCount: "watched_count",
    propLastEpisodeWatched: "last_episode_watched",
    propReleaseDate: "release_date",
    propGenres: "genres",
    propBackdrop: "backdrop",
    tagFormat: "plain",
};
var TraktSyncPlugin = /** @class */ (function (_super) {
    __extends(TraktSyncPlugin, _super);
    function TraktSyncPlugin() {
        var _this = _super !== null && _super.apply(this, arguments) || this;
        _this.traktToken = null;
        return _this;
    }
    TraktSyncPlugin.prototype.onload = function () {
        return __awaiter(this, void 0, void 0, function () {
            var _this = this;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, this.loadSettings()];
                    case 1:
                        _a.sent();
                        this.addSettingTab(new TraktSyncSettingTab(this.app, this));
                        this.addCommand({
                            id: "sync-trakt-history",
                            name: "Sync Trakt History",
                            callback: function () { return _this.syncTraktHistory(); },
                        });
                        return [2 /*return*/];
                }
            });
        });
    };
    TraktSyncPlugin.prototype.syncTraktHistory = function () {
        return __awaiter(this, void 0, void 0, function () {
            var token, deviceCode, history_1, grouped, processed, total, _loop_1, this_1, _i, _a, _b, key, items, e_1;
            var _c, _d;
            return __generator(this, function (_e) {
                switch (_e.label) {
                    case 0:
                        _e.trys.push([0, 11, , 12]);
                        if (!this.settings.traktClientId || !this.settings.traktClientSecret || !this.settings.tmdbApiKey) {
                            new obsidian_1.Notice("Please set your Trakt and TMDB API keys in the plugin settings.");
                            return [2 /*return*/];
                        }
                        return [4 /*yield*/, this.loadToken()];
                    case 1:
                        token = _e.sent();
                        if (!(!token || (token.expires_at && token.expires_at < Date.now() / 1000))) return [3 /*break*/, 5];
                        return [4 /*yield*/, (0, trakt_1.getDeviceCode)(this.settings.traktClientId)];
                    case 2:
                        deviceCode = _e.sent();
                        new obsidian_1.Notice("Trakt: Go to ".concat(deviceCode.verification_url, " and enter code: ").concat(deviceCode.user_code));
                        return [4 /*yield*/, (0, trakt_1.pollForToken)(this.settings.traktClientId, this.settings.traktClientSecret, deviceCode.device_code, deviceCode.interval)];
                    case 3:
                        token = _e.sent();
                        return [4 /*yield*/, this.saveToken(token)];
                    case 4:
                        _e.sent();
                        _e.label = 5;
                    case 5:
                        this.traktToken = token;
                        // 2. Fetch Trakt history
                        new obsidian_1.Notice("Fetching Trakt history...");
                        return [4 /*yield*/, (0, trakt_1.getTraktHistory)(token.access_token, this.settings.traktClientId)];
                    case 6:
                        history_1 = _e.sent();
                        grouped = (0, utils_1.groupHistoryItems)(history_1);
                        processed = 0;
                        total = Object.keys(grouped).length;
                        _loop_1 = function (key, items) {
                            var mediaType, title, traktId, tmdbId, notePath, tags, lastWatched, watchedCount, lastEpisodeInfo, tmdbData, movie, _f, show, _g, completed, lastEp, lastSeason_1, lastSeasonObj, genres, releaseDate, backdrop, tagPrefix, tagsFormatted, markdown;
                            return __generator(this, function (_h) {
                                switch (_h.label) {
                                    case 0:
                                        mediaType = key.startsWith("movie-") ? "movie" : "show";
                                        title = "";
                                        traktId = "";
                                        tmdbId = "";
                                        notePath = "";
                                        tags = [];
                                        lastWatched = (0, utils_1.getLastWatched)(items);
                                        watchedCount = (0, utils_1.getWatchedCount)(items, mediaType);
                                        lastEpisodeInfo = undefined;
                                        tmdbData = {};
                                        if (!(mediaType === "movie")) return [3 /*break*/, 4];
                                        movie = items[0].movie;
                                        title = movie.title;
                                        traktId = movie.ids.trakt;
                                        tmdbId = movie.ids.tmdb;
                                        tags = ["movie"];
                                        if (!tmdbId) return [3 /*break*/, 2];
                                        return [4 /*yield*/, (0, tmdb_1.getTMDBMovie)(this_1.settings.tmdbApiKey, Number(tmdbId))];
                                    case 1:
                                        _f = _h.sent();
                                        return [3 /*break*/, 3];
                                    case 2:
                                        _f = {};
                                        _h.label = 3;
                                    case 3:
                                        tmdbData = _f;
                                        notePath = (0, obsidian_1.normalizePath)("".concat(this_1.settings.movieFolder, "/").concat((0, slugify_1.default)("".concat(String(title), " ").concat(String(movie.year))), ".md"));
                                        return [3 /*break*/, 8];
                                    case 4:
                                        show = (_c = items.find(function (i) { return i.show; })) === null || _c === void 0 ? void 0 : _c.show;
                                        title = show.title;
                                        traktId = show.ids.trakt;
                                        tmdbId = show.ids.tmdb;
                                        tags = ["show"];
                                        if (!tmdbId) return [3 /*break*/, 6];
                                        return [4 /*yield*/, (0, tmdb_1.getTMDBShow)(this_1.settings.tmdbApiKey, Number(tmdbId))];
                                    case 5:
                                        _g = _h.sent();
                                        return [3 /*break*/, 7];
                                    case 6:
                                        _g = {};
                                        _h.label = 7;
                                    case 7:
                                        tmdbData = _g;
                                        notePath = (0, obsidian_1.normalizePath)("".concat(this_1.settings.showFolder, "/").concat((0, slugify_1.default)("".concat(String(title), " ").concat(String(show.year))), ".md"));
                                        lastEpisodeInfo = (0, utils_1.getLastEpisodeInfo)(items);
                                        completed = false;
                                        if (tmdbData && tmdbData.seasons && lastEpisodeInfo) {
                                            lastEp = (_d = items.filter(function (i) { return i.episode; }).sort(function (a, b) { return b.watched_at.localeCompare(a.watched_at); })[0]) === null || _d === void 0 ? void 0 : _d.episode;
                                            lastSeason_1 = Math.max.apply(Math, tmdbData.seasons.filter(function (s) { return s.season_number > 0; }).map(function (s) { return s.season_number; }));
                                            lastSeasonObj = tmdbData.seasons.find(function (s) { return s.season_number === lastSeason_1; });
                                            if (lastSeasonObj && lastEp && lastEp.season === lastSeason_1 && lastEp.number === lastSeasonObj.episode_count) {
                                                completed = true;
                                            }
                                        }
                                        if (completed)
                                            tags.push("completed");
                                        _h.label = 8;
                                    case 8:
                                        genres = (tmdbData.genres || []).map(function (g) { return g.name; });
                                        releaseDate = tmdbData.release_date || tmdbData.first_air_date || "";
                                        backdrop = tmdbData.backdrop_path ? "https://image.tmdb.org/t/p/original".concat(tmdbData.backdrop_path) : "";
                                        tagPrefix = this_1.settings.tagFormat === "hash" ? "#" : "";
                                        tagsFormatted = tags.map(function (t) { return tagPrefix + t; });
                                        markdown = (0, markdown_1.buildMarkdown)({
                                            title: title,
                                            mediaType: mediaType,
                                            tags: tagsFormatted,
                                            lastWatched: lastWatched,
                                            watchedCount: watchedCount,
                                            lastEpisodeInfo: this_1.settings.includeLastEpisodeWatched ? lastEpisodeInfo : undefined,
                                            schemaVersion: "1.0",
                                            traktId: traktId,
                                            tmdbId: tmdbId,
                                            releaseDate: this_1.settings.includeReleaseDate ? releaseDate : undefined,
                                            genres: this_1.settings.includeGenres ? genres : undefined,
                                            backdrop: this_1.settings.includeBackdrop ? backdrop : undefined,
                                            propLastWatched: this_1.settings.propLastWatched,
                                            propWatchedCount: this_1.settings.propWatchedCount,
                                            propLastEpisodeWatched: this_1.settings.propLastEpisodeWatched,
                                            propReleaseDate: this_1.settings.propReleaseDate,
                                            propGenres: this_1.settings.propGenres,
                                            propBackdrop: this_1.settings.propBackdrop,
                                        });
                                        // 5. Write note
                                        return [4 /*yield*/, this_1.app.vault.adapter.mkdir((0, obsidian_1.normalizePath)(notePath.split("/").slice(0, -1).join("/")))];
                                    case 9:
                                        // 5. Write note
                                        _h.sent();
                                        return [4 /*yield*/, this_1.app.vault.adapter.write(notePath, markdown)];
                                    case 10:
                                        _h.sent();
                                        processed++;
                                        new obsidian_1.Notice("Trakt Sync: ".concat(title, " (").concat(processed, "/").concat(total, ")"));
                                        return [2 /*return*/];
                                }
                            });
                        };
                        this_1 = this;
                        _i = 0, _a = Object.entries(grouped);
                        _e.label = 7;
                    case 7:
                        if (!(_i < _a.length)) return [3 /*break*/, 10];
                        _b = _a[_i], key = _b[0], items = _b[1];
                        return [5 /*yield**/, _loop_1(key, items)];
                    case 8:
                        _e.sent();
                        _e.label = 9;
                    case 9:
                        _i++;
                        return [3 /*break*/, 7];
                    case 10:
                        new obsidian_1.Notice("Trakt Sync complete! Processed ".concat(processed, " items."));
                        return [3 /*break*/, 12];
                    case 11:
                        e_1 = _e.sent();
                        new obsidian_1.Notice("Trakt Sync error: ".concat(e_1.message || e_1));
                        console.error(e_1);
                        return [3 /*break*/, 12];
                    case 12: return [2 /*return*/];
                }
            });
        });
    };
    TraktSyncPlugin.prototype.loadToken = function () {
        return __awaiter(this, void 0, void 0, function () {
            var data;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, this.loadData()];
                    case 1:
                        data = _a.sent();
                        return [2 /*return*/, (data === null || data === void 0 ? void 0 : data.traktToken) || null];
                }
            });
        });
    };
    TraktSyncPlugin.prototype.saveToken = function (token) {
        return __awaiter(this, void 0, void 0, function () {
            var data;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, this.loadData()];
                    case 1:
                        data = _a.sent();
                        return [4 /*yield*/, this.saveData(__assign(__assign({}, (data || {})), { traktToken: token }))];
                    case 2:
                        _a.sent();
                        return [2 /*return*/];
                }
            });
        });
    };
    TraktSyncPlugin.prototype.loadSettings = function () {
        return __awaiter(this, void 0, void 0, function () {
            var _a, _b, _c, _d;
            return __generator(this, function (_e) {
                switch (_e.label) {
                    case 0:
                        _a = this;
                        _c = (_b = Object).assign;
                        _d = [{}, DEFAULT_SETTINGS];
                        return [4 /*yield*/, this.loadData()];
                    case 1:
                        _a.settings = _c.apply(_b, _d.concat([_e.sent()]));
                        return [2 /*return*/];
                }
            });
        });
    };
    TraktSyncPlugin.prototype.saveSettings = function () {
        return __awaiter(this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, this.saveData(this.settings)];
                    case 1:
                        _a.sent();
                        return [2 /*return*/];
                }
            });
        });
    };
    return TraktSyncPlugin;
}(obsidian_1.Plugin));
exports.default = TraktSyncPlugin;
var TraktSyncSettingTab = /** @class */ (function (_super) {
    __extends(TraktSyncSettingTab, _super);
    function TraktSyncSettingTab(app, plugin) {
        var _this = _super.call(this, app, plugin) || this;
        _this.plugin = plugin;
        return _this;
    }
    TraktSyncSettingTab.prototype.clearToken = function () {
        return __awaiter(this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, this.plugin.saveToken({})];
                    case 1:
                        _a.sent();
                        new obsidian_1.Notice("Trakt token cleared.");
                        this.display();
                        return [2 /*return*/];
                }
            });
        });
    };
    TraktSyncSettingTab.prototype.getTokenStatus = function () {
        return __awaiter(this, void 0, void 0, function () {
            var token;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, this.plugin.loadToken()];
                    case 1:
                        token = _a.sent();
                        if (!token || !token.access_token)
                            return [2 /*return*/, "No token"];
                        if (token.expires_at && token.expires_at < Date.now() / 1000)
                            return [2 /*return*/, "Expired"];
                        return [2 /*return*/, "Valid"];
                }
            });
        });
    };
    TraktSyncSettingTab.prototype.display = function () {
        return __awaiter(this, void 0, void 0, function () {
            var containerEl, status;
            var _this = this;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        containerEl = this.containerEl;
                        containerEl.empty();
                        containerEl.createEl("h2", { text: "Trakt Sync Settings" });
                        new obsidian_1.Setting(containerEl)
                            .setName("Trakt Client ID")
                            .setDesc("Your Trakt API client ID.")
                            .addText(function (text) {
                            return text
                                .setPlaceholder("Enter your Trakt client ID")
                                .setValue(_this.plugin.settings.traktClientId)
                                .onChange(function (value) { return __awaiter(_this, void 0, void 0, function () {
                                return __generator(this, function (_a) {
                                    switch (_a.label) {
                                        case 0:
                                            this.plugin.settings.traktClientId = value;
                                            return [4 /*yield*/, this.plugin.saveSettings()];
                                        case 1:
                                            _a.sent();
                                            return [2 /*return*/];
                                    }
                                });
                            }); });
                        });
                        new obsidian_1.Setting(containerEl)
                            .setName("Trakt Client Secret")
                            .setDesc("Your Trakt API client secret.")
                            .addText(function (text) {
                            return text
                                .setPlaceholder("Enter your Trakt client secret")
                                .setValue(_this.plugin.settings.traktClientSecret)
                                .onChange(function (value) { return __awaiter(_this, void 0, void 0, function () {
                                return __generator(this, function (_a) {
                                    switch (_a.label) {
                                        case 0:
                                            this.plugin.settings.traktClientSecret = value;
                                            return [4 /*yield*/, this.plugin.saveSettings()];
                                        case 1:
                                            _a.sent();
                                            return [2 /*return*/];
                                    }
                                });
                            }); });
                        });
                        new obsidian_1.Setting(containerEl)
                            .setName("TMDB API Key")
                            .setDesc("Your TMDB API key.")
                            .addText(function (text) {
                            return text
                                .setPlaceholder("Enter your TMDB API key")
                                .setValue(_this.plugin.settings.tmdbApiKey)
                                .onChange(function (value) { return __awaiter(_this, void 0, void 0, function () {
                                return __generator(this, function (_a) {
                                    switch (_a.label) {
                                        case 0:
                                            this.plugin.settings.tmdbApiKey = value;
                                            return [4 /*yield*/, this.plugin.saveSettings()];
                                        case 1:
                                            _a.sent();
                                            return [2 /*return*/];
                                    }
                                });
                            }); });
                        });
                        new obsidian_1.Setting(containerEl)
                            .setName("Movie Folder")
                            .setDesc("Folder to save movie notes.")
                            .addText(function (text) {
                            return text
                                .setPlaceholder("Movies")
                                .setValue(_this.plugin.settings.movieFolder)
                                .onChange(function (value) { return __awaiter(_this, void 0, void 0, function () {
                                return __generator(this, function (_a) {
                                    switch (_a.label) {
                                        case 0:
                                            this.plugin.settings.movieFolder = value;
                                            return [4 /*yield*/, this.plugin.saveSettings()];
                                        case 1:
                                            _a.sent();
                                            return [2 /*return*/];
                                    }
                                });
                            }); });
                        });
                        new obsidian_1.Setting(containerEl)
                            .setName("Show Folder")
                            .setDesc("Folder to save show notes.")
                            .addText(function (text) {
                            return text
                                .setPlaceholder("Shows")
                                .setValue(_this.plugin.settings.showFolder)
                                .onChange(function (value) { return __awaiter(_this, void 0, void 0, function () {
                                return __generator(this, function (_a) {
                                    switch (_a.label) {
                                        case 0:
                                            this.plugin.settings.showFolder = value;
                                            return [4 /*yield*/, this.plugin.saveSettings()];
                                        case 1:
                                            _a.sent();
                                            return [2 /*return*/];
                                    }
                                });
                            }); });
                        });
                        new obsidian_1.Setting(containerEl)
                            .setName("Include Release Date")
                            .setDesc("Include release date in frontmatter.")
                            .addToggle(function (toggle) {
                            return toggle.setValue(_this.plugin.settings.includeReleaseDate).onChange(function (value) { return __awaiter(_this, void 0, void 0, function () {
                                return __generator(this, function (_a) {
                                    switch (_a.label) {
                                        case 0:
                                            this.plugin.settings.includeReleaseDate = value;
                                            return [4 /*yield*/, this.plugin.saveSettings()];
                                        case 1:
                                            _a.sent();
                                            return [2 /*return*/];
                                    }
                                });
                            }); });
                        });
                        new obsidian_1.Setting(containerEl)
                            .setName("Include Genres")
                            .setDesc("Include genres in frontmatter.")
                            .addToggle(function (toggle) {
                            return toggle.setValue(_this.plugin.settings.includeGenres).onChange(function (value) { return __awaiter(_this, void 0, void 0, function () {
                                return __generator(this, function (_a) {
                                    switch (_a.label) {
                                        case 0:
                                            this.plugin.settings.includeGenres = value;
                                            return [4 /*yield*/, this.plugin.saveSettings()];
                                        case 1:
                                            _a.sent();
                                            return [2 /*return*/];
                                    }
                                });
                            }); });
                        });
                        new obsidian_1.Setting(containerEl)
                            .setName("Include Backdrop")
                            .setDesc("Include backdrop image URL in frontmatter.")
                            .addToggle(function (toggle) {
                            return toggle.setValue(_this.plugin.settings.includeBackdrop).onChange(function (value) { return __awaiter(_this, void 0, void 0, function () {
                                return __generator(this, function (_a) {
                                    switch (_a.label) {
                                        case 0:
                                            this.plugin.settings.includeBackdrop = value;
                                            return [4 /*yield*/, this.plugin.saveSettings()];
                                        case 1:
                                            _a.sent();
                                            return [2 /*return*/];
                                    }
                                });
                            }); });
                        });
                        new obsidian_1.Setting(containerEl)
                            .setName("Include Last Episode Watched")
                            .setDesc("Include last_episode_watched in show notes.")
                            .addToggle(function (toggle) {
                            return toggle.setValue(_this.plugin.settings.includeLastEpisodeWatched).onChange(function (value) { return __awaiter(_this, void 0, void 0, function () {
                                return __generator(this, function (_a) {
                                    switch (_a.label) {
                                        case 0:
                                            this.plugin.settings.includeLastEpisodeWatched = value;
                                            return [4 /*yield*/, this.plugin.saveSettings()];
                                        case 1:
                                            _a.sent();
                                            return [2 /*return*/];
                                    }
                                });
                            }); });
                        });
                        new obsidian_1.Setting(containerEl)
                            .setName("Tag Format")
                            .setDesc("Choose how tags are formatted in frontmatter.")
                            .addDropdown(function (dropdown) {
                            return dropdown
                                .addOption("plain", "plain (movie)")
                                .addOption("hash", "hash (#movie)")
                                .setValue(_this.plugin.settings.tagFormat)
                                .onChange(function (value) { return __awaiter(_this, void 0, void 0, function () {
                                return __generator(this, function (_a) {
                                    switch (_a.label) {
                                        case 0:
                                            this.plugin.settings.tagFormat = value;
                                            return [4 /*yield*/, this.plugin.saveSettings()];
                                        case 1:
                                            _a.sent();
                                            return [2 /*return*/];
                                    }
                                });
                            }); });
                        });
                        // Custom property names
                        new obsidian_1.Setting(containerEl)
                            .setName("Property: Last Watched")
                            .setDesc("YAML property name for last watched date.")
                            .addText(function (text) {
                            return text.setValue(_this.plugin.settings.propLastWatched).onChange(function (value) { return __awaiter(_this, void 0, void 0, function () {
                                return __generator(this, function (_a) {
                                    switch (_a.label) {
                                        case 0:
                                            this.plugin.settings.propLastWatched = value;
                                            return [4 /*yield*/, this.plugin.saveSettings()];
                                        case 1:
                                            _a.sent();
                                            return [2 /*return*/];
                                    }
                                });
                            }); });
                        });
                        new obsidian_1.Setting(containerEl)
                            .setName("Property: Watched Count")
                            .setDesc("YAML property name for watched count.")
                            .addText(function (text) {
                            return text.setValue(_this.plugin.settings.propWatchedCount).onChange(function (value) { return __awaiter(_this, void 0, void 0, function () {
                                return __generator(this, function (_a) {
                                    switch (_a.label) {
                                        case 0:
                                            this.plugin.settings.propWatchedCount = value;
                                            return [4 /*yield*/, this.plugin.saveSettings()];
                                        case 1:
                                            _a.sent();
                                            return [2 /*return*/];
                                    }
                                });
                            }); });
                        });
                        new obsidian_1.Setting(containerEl)
                            .setName("Property: Last Episode Watched")
                            .setDesc("YAML property name for last episode watched (shows only).")
                            .addText(function (text) {
                            return text.setValue(_this.plugin.settings.propLastEpisodeWatched).onChange(function (value) { return __awaiter(_this, void 0, void 0, function () {
                                return __generator(this, function (_a) {
                                    switch (_a.label) {
                                        case 0:
                                            this.plugin.settings.propLastEpisodeWatched = value;
                                            return [4 /*yield*/, this.plugin.saveSettings()];
                                        case 1:
                                            _a.sent();
                                            return [2 /*return*/];
                                    }
                                });
                            }); });
                        });
                        new obsidian_1.Setting(containerEl)
                            .setName("Property: Release Date")
                            .setDesc("YAML property name for release date.")
                            .addText(function (text) {
                            return text.setValue(_this.plugin.settings.propReleaseDate).onChange(function (value) { return __awaiter(_this, void 0, void 0, function () {
                                return __generator(this, function (_a) {
                                    switch (_a.label) {
                                        case 0:
                                            this.plugin.settings.propReleaseDate = value;
                                            return [4 /*yield*/, this.plugin.saveSettings()];
                                        case 1:
                                            _a.sent();
                                            return [2 /*return*/];
                                    }
                                });
                            }); });
                        });
                        new obsidian_1.Setting(containerEl)
                            .setName("Property: Genres")
                            .setDesc("YAML property name for genres.")
                            .addText(function (text) {
                            return text.setValue(_this.plugin.settings.propGenres).onChange(function (value) { return __awaiter(_this, void 0, void 0, function () {
                                return __generator(this, function (_a) {
                                    switch (_a.label) {
                                        case 0:
                                            this.plugin.settings.propGenres = value;
                                            return [4 /*yield*/, this.plugin.saveSettings()];
                                        case 1:
                                            _a.sent();
                                            return [2 /*return*/];
                                    }
                                });
                            }); });
                        });
                        new obsidian_1.Setting(containerEl)
                            .setName("Property: Backdrop")
                            .setDesc("YAML property name for backdrop image URL.")
                            .addText(function (text) {
                            return text.setValue(_this.plugin.settings.propBackdrop).onChange(function (value) { return __awaiter(_this, void 0, void 0, function () {
                                return __generator(this, function (_a) {
                                    switch (_a.label) {
                                        case 0:
                                            this.plugin.settings.propBackdrop = value;
                                            return [4 /*yield*/, this.plugin.saveSettings()];
                                        case 1:
                                            _a.sent();
                                            return [2 /*return*/];
                                    }
                                });
                            }); });
                        });
                        return [4 /*yield*/, this.getTokenStatus()];
                    case 1:
                        status = _a.sent();
                        containerEl.createEl("p", { text: "Trakt Token Status: ".concat(status) });
                        new obsidian_1.Setting(containerEl)
                            .setName("Clear Trakt Token")
                            .setDesc("Remove the saved Trakt token and re-authenticate on next sync.")
                            .addButton(function (btn) {
                            return btn.setButtonText("Clear Token").onClick(function () { return _this.clearToken(); });
                        });
                        return [2 /*return*/];
                }
            });
        });
    };
    return TraktSyncSettingTab;
}(obsidian_1.PluginSettingTab));
