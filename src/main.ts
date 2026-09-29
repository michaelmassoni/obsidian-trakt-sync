import { App, Plugin, PluginSettingTab, Setting, Notice, TFile, normalizePath, TFolder, Modal } from "obsidian";
import { getDeviceCode, pollForToken, getTraktHistory, TraktToken, TraktHistoryItem } from "./trakt";
import { getTMDBMovie, getTMDBShow } from "./tmdb";
import { buildMarkdown } from "./markdown";
import { groupHistoryItems, getLastWatched, getWatchedCount, getLastEpisodeInfo } from "./utils";
import slugify from "slugify";
import { request } from "obsidian";

interface TraktSyncSettings {
  traktClientId: string;
  traktClientSecret: string;
  tmdbApiKey: string;
  movieFolder: string;
  showFolder: string;
  includeReleaseDate: boolean;
  includeGenres: boolean;
  includeBackdrop: boolean;
  includeLastEpisodeWatched: boolean;
  includeLastWatched: boolean;
  includeWatchedCount: boolean;
  includeTraktId: boolean;
  includeTmdbId: boolean;
  propLastWatched: string;
  propWatchedCount: string;
  propLastEpisodeWatched: string;
  propReleaseDate: string;
  propGenres: string;
  propBackdrop: string;
  propTraktId: string;
  propTmdbId: string;
  tagFormat: "plain" | "hash";
}

const DEFAULT_SETTINGS: TraktSyncSettings = {
  traktClientId: "",
  traktClientSecret: "",
  tmdbApiKey: "",
  movieFolder: "Movies",
  showFolder: "Shows",
  includeReleaseDate: true,
  includeGenres: true,
  includeBackdrop: true,
  includeLastEpisodeWatched: true,
  includeLastWatched: true,
  includeWatchedCount: true,
  includeTraktId: true,
  includeTmdbId: true,
  propLastWatched: "last_watched",
  propWatchedCount: "watched_count",
  propLastEpisodeWatched: "last_episode_watched",
  propReleaseDate: "release_date",
  propGenres: "genres",
  propBackdrop: "backdrop",
  propTraktId: "trakt_id",
  propTmdbId: "tmdb_id",
  tagFormat: "plain",
};

// Helper to recursively create directories
async function ensureDir(adapter: any, dir: string) {
  const parts = dir.split('/');
  let current = '';
  for (const part of parts) {
    if (!part) continue;
    current += (current ? '/' : '') + part;
    try {
      await adapter.stat(current);
    } catch {
      await adapter.mkdir(current);
    }
  }
}

export default class TraktSyncPlugin extends Plugin {
  settings: TraktSyncSettings;
  traktToken: TraktToken | null = null;

  async onload() {
    await this.loadSettings();
    this.addSettingTab(new TraktSyncSettingTab(this.app, this));
    this.addCommand({
      id: "sync-trakt-history",
      name: "Sync Trakt watch history",
      callback: () => this.syncTraktHistory(),
    });
    this.addCommand({
      id: "add-watched-to-trakt",
      name: "Add watched movie/show to Trakt",
      callback: () => this.openAddWatchedModal(),
    });
  }

  async syncTraktHistory() {
    try {
      if (!this.settings.traktClientId || !this.settings.traktClientSecret || !this.settings.tmdbApiKey) {
        new Notice("Please set your Trakt and TMDB API keys in the plugin settings.");
        return;
      }
      // 1. Authenticate with Trakt (device code flow)
      let token: TraktToken | null = await this.loadToken();
      if (!token || (token.expires_at && token.expires_at < Date.now() / 1000)) {
        const deviceCode = await getDeviceCode(this.settings.traktClientId);
        new TraktDeviceCodeModal(this.app, deviceCode.user_code, deviceCode.verification_url, deviceCode.expires_in).open();
        token = await pollForToken(
          this.settings.traktClientId,
          this.settings.traktClientSecret,
          deviceCode.device_code,
          deviceCode.interval
        );
        await this.saveToken(token);
      }
      this.traktToken = token;
      // 2. Fetch Trakt history
      let progressNotice = new Notice("Fetching Trakt history...");
      const history = await getTraktHistory(token.access_token, this.settings.traktClientId);
      // 3. Group and process items
      const grouped = groupHistoryItems(history);
      let processed = 0;
      let created = 0;
      let updated = 0;
      let skipped = 0;
      const total = Object.keys(grouped).length;
      for (const [key, items] of Object.entries(grouped)) {
        let mediaType: "movie" | "show" = key.startsWith("movie-") ? "movie" : "show";
        let title = "";
        let traktId: number | string = "";
        let tmdbId: number | string = "";
        let notePath = "";
        let tags: string[] = [];
        let lastWatchedStr = getLastWatched(items);
        let lastWatched: Date | string = lastWatchedStr ? new Date(lastWatchedStr) : '';
        let watchedCount = getWatchedCount(items, mediaType);
        let lastEpisodeInfo: string | undefined = undefined;
        let tmdbData: any = {};
        if (mediaType === "movie") {
          const movie = items[0].movie;
          title = movie.title;
          traktId = movie.ids.trakt;
          tmdbId = movie.ids.tmdb;
          tags = ["movie"];
          tmdbData = tmdbId ? await getTMDBMovie(this.settings.tmdbApiKey, Number(tmdbId)) : {};
          notePath = normalizePath(`${this.settings.movieFolder}/${slugify(`${String(title)} ${String(movie.year)}`)}.md`);
        } else {
          // show
          const show = items.find(i => i.show)?.show;
          title = show.title;
          traktId = show.ids.trakt;
          tmdbId = show.ids.tmdb;
          tags = ["show"];
          tmdbData = tmdbId ? await getTMDBShow(this.settings.tmdbApiKey, Number(tmdbId)) : {};
          notePath = normalizePath(`${this.settings.showFolder}/${slugify(`${String(title)} ${String(show.year)}`)}.md`);
          lastEpisodeInfo = getLastEpisodeInfo(items);
          // Check if completed
          let completed = false;
          if (tmdbData && tmdbData.seasons && lastEpisodeInfo) {
            const lastEp = items.filter(i => i.episode).sort((a, b) => b.watched_at.localeCompare(a.watched_at))[0]?.episode;
            const lastSeason = Math.max(...tmdbData.seasons.filter((s: any) => s.season_number > 0).map((s: any) => s.season_number));
            const lastSeasonObj = tmdbData.seasons.find((s: any) => s.season_number === lastSeason);
            if (lastSeasonObj && lastEp && lastEp.season === lastSeason && lastEp.number === lastSeasonObj.episode_count) {
              completed = true;
            }
          }
          if (completed) tags.push("completed");
        }
        // 4. Build markdown
        const genres = (tmdbData.genres || []).map((g: any) => g.name);
        const releaseDate = tmdbData.release_date || tmdbData.first_air_date || "";
        const backdrop = tmdbData.backdrop_path ? `https://image.tmdb.org/t/p/original${tmdbData.backdrop_path}` : "";
        // Format tags
        const tagPrefix = this.settings.tagFormat === "hash" ? "#" : "";
        const tagsFormatted = tags.map(t => tagPrefix + t);
        const markdown = buildMarkdown({
          title,
          mediaType,
          tags: tagsFormatted,
          lastWatched,
          watchedCount,
          lastEpisodeInfo: this.settings.includeLastEpisodeWatched ? lastEpisodeInfo : undefined,
          traktId: this.settings.includeTraktId ? traktId : undefined,
          tmdbId: this.settings.includeTmdbId ? tmdbId : undefined,
          releaseDate: this.settings.includeReleaseDate ? releaseDate : undefined,
          genres: this.settings.includeGenres ? genres : undefined,
          backdrop: this.settings.includeBackdrop ? backdrop : undefined,
          propLastWatched: this.settings.propLastWatched,
          propWatchedCount: this.settings.propWatchedCount,
          propLastEpisodeWatched: this.settings.propLastEpisodeWatched,
          propReleaseDate: this.settings.propReleaseDate,
          propGenres: this.settings.propGenres,
          propBackdrop: this.settings.propBackdrop,
          propTraktId: this.settings.propTraktId,
          propTmdbId: this.settings.propTmdbId,
        });
        // 5. Write note
        const folderPath = normalizePath(notePath.split("/").slice(0, -1).join("/"));
        console.log("[TraktSyncPlugin] Ensuring folder exists:", folderPath);
        await ensureDir(this.app.vault.adapter, folderPath);
        console.log("[TraktSyncPlugin] Writing file (no read, always overwrite):", notePath);
        await this.app.vault.adapter.write(notePath, markdown);
        created++;
        processed++;
        progressNotice.setMessage(`Trakt Sync: ${processed}/${total} (${created} written)`);
      }
      progressNotice.hide();
    } catch (e: any) {
      new Notice(`Trakt Sync error: ${e.message || e}`);
      console.error(e);
    }
  }

  async loadToken(): Promise<TraktToken | null> {
    const data = await this.loadData();
    return data?.traktToken || null;
  }

  async saveToken(token: TraktToken) {
    const data = await this.loadData();
    await this.saveData({ ...(data || {}), traktToken: token });
  }

  async loadSettings() {
    this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
  }

  async saveSettings() {
    await this.saveData(this.settings);
  }

  openAddWatchedModal() {
    new AddWatchedModal(this.app, this).open();
  }

  async addMovieToTrakt(item: any, watchedAt: string) {
    const token = this.traktToken || await this.loadToken();
    if (!token) throw new Error('Not authenticated with Trakt');
    const payload = {
      movies: [
        {
          ids: { tmdb: item.id },
          watched_at: watchedAt
        }
      ]
    };
    await request({
      url: "https://api.trakt.tv/sync/history",
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "trakt-api-version": "2",
        "trakt-api-key": this.settings.traktClientId,
        "Authorization": `Bearer ${token.access_token}`
      },
      body: JSON.stringify(payload)
    });
  }

  async addEpisodesToTrakt(item: any, episodes: any[]) {
    const token = this.traktToken || await this.loadToken();
    if (!token) throw new Error('Not authenticated with Trakt');
    const payload = {
        episodes: episodes.map(ep => ({
            ids: { tmdb: item.id },
            season: ep.season,
            number: ep.episode,
            watched_at: ep.watched_at
        }))
    };
    console.log('[TraktSyncPlugin] Trakt episode payload:', JSON.stringify(payload, null, 2));
    const response = await request({
        url: "https://api.trakt.tv/sync/history",
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            "trakt-api-version": "2",
            "trakt-api-key": this.settings.traktClientId,
            "Authorization": `Bearer ${token.access_token}`
        },
        body: JSON.stringify(payload)
    });
    console.log('[TraktSyncPlugin] Trakt API response:', response);
}
}

class TraktDeviceCodeModal extends Modal {
  code: string;
  url: string;
  expiresIn: number;

  constructor(app: App, code: string, url: string, expiresIn: number) {
    super(app);
    this.code = code;
    this.url = url;
    this.expiresIn = expiresIn;
  }

  onOpen() {
    const { contentEl } = this;
    contentEl.createEl("h2", { text: "Trakt Device Activation" });
    contentEl.createEl("p", { text: `Go to:` });
    const link = contentEl.createEl("a", { text: this.url, href: this.url });
    link.target = "_blank";
    contentEl.createEl("p", { text: `and enter this code:` });
    const codeBox = contentEl.createEl("input");
    codeBox.value = this.code;
    codeBox.readOnly = true;
    codeBox.style.width = "10em";
    codeBox.onclick = () => codeBox.select();

    new Setting(contentEl)
      .addButton(btn =>
        btn
          .setButtonText("Copy Code")
          .onClick(() => {
            navigator.clipboard.writeText(this.code);
          })
      )
      .addButton(btn =>
        btn
          .setButtonText("Close")
          .setCta()
          .onClick(() => this.close())
      );

    contentEl.createEl("p", { text: `Code expires in ${this.expiresIn} seconds.` });
  }

  onClose() {
    this.contentEl.empty();
  }
}

class TraktSyncSettingTab extends PluginSettingTab {
  plugin: TraktSyncPlugin;

  constructor(app: App, plugin: TraktSyncPlugin) {
    super(app, plugin);
    this.plugin = plugin;
  }

  getAllFolders(): string[] {
    const folders: string[] = [];
    const walk = (folder: TFolder) => {
      folders.push(folder.path);
      for (const child of folder.children) {
        if (child instanceof TFolder) walk(child);
      }
    };
    walk(this.app.vault.getRoot());
    return folders;
  }

  async clearToken() {
    await this.plugin.saveToken({} as any);
    new Notice("Trakt token cleared.");
    this.display();
  }

  async getTokenStatus(): Promise<string> {
    const token = await this.plugin.loadToken();
    if (!token || !token.access_token) return "No token";
    if (token.expires_at && token.expires_at < Date.now() / 1000) return "Expired";
    return "Valid";
  }

  async display(): Promise<void> {
    const { containerEl } = this;
    containerEl.empty();

    // Folders at the top
    const folders = this.getAllFolders();
    new Setting(containerEl)
      .setName("Movies folder")
      .setDesc("Choose where movie entries should be saved.")
      .addDropdown((dropdown) => {
        folders.forEach((folder) => dropdown.addOption(folder, folder));
        dropdown.setValue(this.plugin.settings.movieFolder);
        dropdown.onChange(async (value) => {
          this.plugin.settings.movieFolder = value;
          await this.plugin.saveSettings();
        });
      });
    new Setting(containerEl)
      .setName("Shows folder")
      .setDesc("Choose where show entries should be saved.")
      .addDropdown((dropdown) => {
        folders.forEach((folder) => dropdown.addOption(folder, folder));
        dropdown.setValue(this.plugin.settings.showFolder);
        dropdown.onChange(async (value) => {
          this.plugin.settings.showFolder = value;
          await this.plugin.saveSettings();
        });
      });

    // API section
    new Setting(containerEl).setName("API").setHeading();
    new Setting(containerEl)
      .setName("Trakt client ID")
      .addText((text) =>
        text
          .setPlaceholder("Enter your Trakt client ID")
          .setValue(this.plugin.settings.traktClientId)
          .onChange(async (value) => {
            this.plugin.settings.traktClientId = value;
            await this.plugin.saveSettings();
          })
      );
    new Setting(containerEl)
      .setName("Trakt client secret")
      .addText((text) =>
        text
          .setPlaceholder("Enter your Trakt client secret")
          .setValue(this.plugin.settings.traktClientSecret)
          .onChange(async (value) => {
            this.plugin.settings.traktClientSecret = value;
            await this.plugin.saveSettings();
          })
      );
    new Setting(containerEl)
      .setName("TMDB API key")
      .addText((text) =>
        text
          .setPlaceholder("Enter your TMDB API key")
          .setValue(this.plugin.settings.tmdbApiKey)
          .onChange(async (value) => {
            this.plugin.settings.tmdbApiKey = value;
            await this.plugin.saveSettings();
          })
      );

    // YAML customisation section (merged with toggles)
    new Setting(containerEl).setName("YAML customisation").setHeading();
    // Tag format
    new Setting(containerEl)
      .setName("Tag format")
      .setDesc("Choose how tags are formatted in frontmatter.")
      .addDropdown((dropdown) =>
        dropdown
          .addOption("plain", "plain (movie)")
          .addOption("hash", "hash (#movie)")
          .setValue(this.plugin.settings.tagFormat)
          .onChange(async (value) => {
            this.plugin.settings.tagFormat = value as "plain" | "hash";
            await this.plugin.saveSettings();
          })
      );
    // Property: release date
    new Setting(containerEl)
      .setName("Release date")
      .addToggle((toggle) =>
        toggle.setValue(this.plugin.settings.includeReleaseDate).onChange(async (value) => {
          this.plugin.settings.includeReleaseDate = value;
          await this.plugin.saveSettings();
          this.display();
        })
      )
      .addText((text) =>
        text
          .setValue(this.plugin.settings.propReleaseDate)
          .setDisabled(!this.plugin.settings.includeReleaseDate)
          .onChange(async (value) => {
            this.plugin.settings.propReleaseDate = value;
            await this.plugin.saveSettings();
          })
      );
    // Property: genres
    new Setting(containerEl)
      .setName("Genres")
      .addToggle((toggle) =>
        toggle.setValue(this.plugin.settings.includeGenres).onChange(async (value) => {
          this.plugin.settings.includeGenres = value;
          await this.plugin.saveSettings();
          this.display();
        })
      )
      .addText((text) =>
        text
          .setValue(this.plugin.settings.propGenres)
          .setDisabled(!this.plugin.settings.includeGenres)
          .onChange(async (value) => {
            this.plugin.settings.propGenres = value;
            await this.plugin.saveSettings();
          })
      );
    // Property: backdrop
    new Setting(containerEl)
      .setName("Backdrop")
      .addToggle((toggle) =>
        toggle.setValue(this.plugin.settings.includeBackdrop).onChange(async (value) => {
          this.plugin.settings.includeBackdrop = value;
          await this.plugin.saveSettings();
          this.display();
        })
      )
      .addText((text) =>
        text
          .setValue(this.plugin.settings.propBackdrop)
          .setDisabled(!this.plugin.settings.includeBackdrop)
          .onChange(async (value) => {
            this.plugin.settings.propBackdrop = value;
            await this.plugin.saveSettings();
          })
      );
    // Property: last episode watched
    new Setting(containerEl)
      .setName("Last episode watched")
      .addToggle((toggle) =>
        toggle.setValue(this.plugin.settings.includeLastEpisodeWatched).onChange(async (value) => {
          this.plugin.settings.includeLastEpisodeWatched = value;
          await this.plugin.saveSettings();
          this.display();
        })
      )
      .addText((text) =>
        text
          .setValue(this.plugin.settings.propLastEpisodeWatched)
          .setDisabled(!this.plugin.settings.includeLastEpisodeWatched)
          .onChange(async (value) => {
            this.plugin.settings.propLastEpisodeWatched = value;
            await this.plugin.saveSettings();
          })
      );
    // Property: last watched
    new Setting(containerEl)
      .setName("Last watched")
      .addToggle((toggle) =>
        toggle.setValue(this.plugin.settings.includeLastWatched).onChange(async (value) => {
          this.plugin.settings.includeLastWatched = value;
          await this.plugin.saveSettings();
          this.display();
        })
      )
      .addText((text) =>
        text
          .setValue(this.plugin.settings.propLastWatched)
          .setDisabled(this.plugin.settings.includeLastWatched === false)
          .onChange(async (value) => {
            this.plugin.settings.propLastWatched = value;
            await this.plugin.saveSettings();
          })
      );
    // Property: watched count
    new Setting(containerEl)
      .setName("Watched count")
      .addToggle((toggle) =>
        toggle.setValue(this.plugin.settings.includeWatchedCount).onChange(async (value) => {
          this.plugin.settings.includeWatchedCount = value;
          await this.plugin.saveSettings();
          this.display();
        })
      )
      .addText((text) =>
        text
          .setValue(this.plugin.settings.propWatchedCount)
          .setDisabled(this.plugin.settings.includeWatchedCount === false)
          .onChange(async (value) => {
            this.plugin.settings.propWatchedCount = value;
            await this.plugin.saveSettings();
          })
      );
    // Property: trakt_id
    new Setting(containerEl)
      .setName("Trakt ID")
      .addToggle((toggle) =>
        toggle.setValue(this.plugin.settings.includeTraktId).onChange(async (value) => {
          this.plugin.settings.includeTraktId = value;
          await this.plugin.saveSettings();
          this.display();
        })
      )
      .addText((text) =>
        text
          .setValue(this.plugin.settings.propTraktId)
          .setDisabled(!this.plugin.settings.includeTraktId)
          .onChange(async (value) => {
            this.plugin.settings.propTraktId = value;
            await this.plugin.saveSettings();
          })
      );
    // Property: tmdb_id
    new Setting(containerEl)
      .setName("TMDB ID")
      .addToggle((toggle) =>
        toggle.setValue(this.plugin.settings.includeTmdbId).onChange(async (value) => {
          this.plugin.settings.includeTmdbId = value;
          await this.plugin.saveSettings();
          this.display();
        })
      )
      .addText((text) =>
        text
          .setValue(this.plugin.settings.propTmdbId)
          .setDisabled(!this.plugin.settings.includeTmdbId)
          .onChange(async (value) => {
            this.plugin.settings.propTmdbId = value;
            await this.plugin.saveSettings();
          })
      );

    // Advanced section
    new Setting(containerEl).setName("Advanced").setHeading();
    const status = await this.getTokenStatus();
    containerEl.createEl("p", { text: `Trakt token status: ${status}` });
    new Setting(containerEl)
      .setName("Clear Trakt token")
      .setDesc("Remove the saved Trakt token and re-authenticate on next sync.")
      .addButton((btn) =>
        btn.setButtonText("Clear token").onClick(() => this.clearToken())
      );
    // Reset to defaults button
    new Setting(containerEl)
      .setName("Reset to defaults")
      .setDesc("Restore all plugin settings to their default values.")
      .addButton((btn) =>
        btn.setButtonText("Reset").setWarning().onClick(async () => {
          this.plugin.settings = Object.assign({}, DEFAULT_SETTINGS);
          await this.plugin.saveSettings();
          new Notice("Trakt Sync settings reset to defaults.");
          this.display();
        })
      );
  }
}

class AddWatchedModal extends Modal {
  plugin: TraktSyncPlugin;
  searchInput: HTMLInputElement;
  resultsContainer: HTMLElement;
  results: any[] = [];
  constructor(app: App, plugin: TraktSyncPlugin) {
    super(app);
    this.plugin = plugin;
  }
  onOpen() {
    const { contentEl } = this;
    contentEl.empty();
    contentEl.createEl("h2", { text: "Search TMDB for Movie/Show" });
    this.searchInput = contentEl.createEl("input", { type: "text", placeholder: "Type a movie or show name..." });
    this.resultsContainer = contentEl.createEl("div");
    this.searchInput.addEventListener("input", async () => {
      const query = this.searchInput.value.trim();
      if (query.length < 2) {
        this.resultsContainer.empty();
        return;
      }
      this.resultsContainer.setText("Searching...");
      const tmdbKey = this.plugin.settings.tmdbApiKey;
      const url = `https://api.themoviedb.org/3/search/multi?api_key=${tmdbKey}&query=${encodeURIComponent(query)}`;
      try {
        const resp = await request({ url, method: "GET" });
        const data = JSON.parse(resp);
        this.results = (data.results || []).filter((r: any) => r.media_type === "movie" || r.media_type === "tv");
        this.renderResults();
      } catch (e) {
        this.resultsContainer.setText("Error searching TMDB");
      }
    });
  }
  renderResults() {
    console.log('[TraktSyncPlugin] TMDB search results:', this.results.map(item => ({ title: item.title || item.name, id: item.id, media_type: item.media_type })));
    this.resultsContainer.empty();
    if (!this.results.length) {
      this.resultsContainer.setText("No results");
      return;
    }
    this.results.forEach((item) => {
      const row = this.resultsContainer.createEl("div", { cls: "tmdb-search-result" });
      row.createEl("span", { text: `${item.media_type === "movie" ? "🎬" : "📺"} ${item.title || item.name} (${(item.release_date || item.first_air_date || "").split("-")[0]})` });
      row.addEventListener("click", () => this.handleSelect(item));
    });
  }
  async handleSelect(item: any) {
    console.log('[TraktSyncPlugin] handleSelect:', { name: item.title || item.name, id: item.id, media_type: item.media_type });
    if (item.media_type === "movie") {
      this.promptForMovieDate(item);
    } else if (item.media_type === "tv") {
      await this.promptForShowEpisodes(item);
    }
  }
  async promptForMovieDate(item: any) {
    this.contentEl.empty();
    this.contentEl.createEl("h2", { text: `Add Movie: ${item.title}` });
    const dateInput = this.contentEl.createEl("input", { type: "datetime-local" });
    // Default to now
    const now = new Date();
    dateInput.value = now.toISOString().slice(0, 16);
    const submitBtn = this.contentEl.createEl("button", { text: "Add to Trakt" });
    submitBtn.addEventListener("click", async () => {
      const watchedAt = new Date(dateInput.value).toISOString();
      await this.plugin.addMovieToTrakt(item, watchedAt);
      new Notice(`Added ${item.title} to Trakt!`);
      this.close();
    });
  }

  async promptForShowEpisodes(item: any) {
    console.log('[TraktSyncPlugin] promptForShowEpisodes:', { name: item.name, id: item.id });
    // Fetch Trakt show data
    let traktShow: any = null;
    let traktIds: any = null;
    try {
      const resp = await request({
        url: `https://api.trakt.tv/search/tmdb/${item.id}?type=show`,
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          "trakt-api-version": "2",
          "trakt-api-key": this.plugin.settings.traktClientId
        }
      });
      const data = JSON.parse(resp);
      if (data && data.length > 0 && data[0].show && data[0].show.ids) {
        traktShow = data[0].show;
        traktIds = data[0].show.ids;
      }
    } catch (e) {
      console.log('[TraktSyncPlugin] Error fetching Trakt show:', e);
    }
    if (!traktShow || !traktIds || !traktIds.trakt) {
      new Notice('Could not find this show on Trakt. Aborting.');
      return;
    }
    // Show confirmation UI
    this.contentEl.empty();
    this.contentEl.createEl("h2", { text: `Add Show: ${(traktShow as any).title}` });
    if ((traktShow as any).year) this.contentEl.createEl("div", { text: `Year: ${(traktShow as any).year}` });
    if ((traktShow as any).images && (traktShow as any).images.poster && (traktShow as any).images.poster.full) {
      const img = this.contentEl.createEl("img");
      img.src = (traktShow as any).images.poster.full;
      img.style.maxWidth = "100px";
    }
    this.contentEl.createEl("a", { text: "View on Trakt", href: `https://trakt.tv/shows/${(traktShow as any).ids.slug || (traktShow as any).ids.trakt}` , attr: { target: "_blank" } });
    this.contentEl.createEl("hr");
    // Fetch seasons/episodes from Trakt
    let seasons = [];
    try {
      const resp = await request({
        url: `https://api.trakt.tv/shows/${traktIds.trakt}/seasons?extended=episodes` ,
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          "trakt-api-version": "2",
          "trakt-api-key": this.plugin.settings.traktClientId
        }
      });
      seasons = JSON.parse(resp);
    } catch (e) {
      new Notice('Could not fetch seasons/episodes from Trakt.');
      return;
    }
    // Build UI
    const dateInput = this.contentEl.createEl("input", { type: "datetime-local" });
    // Default to now
    const now = new Date();
    dateInput.value = now.toISOString().slice(0, 16);
    // Build allEpisodes from Trakt data
    const allEpisodes: { season: number, episode: number, ids: any, title: string }[] = [];
    seasons.forEach((season: any) => {
      if (season.number === 0) return; // skip specials
      (season.episodes || []).forEach((ep: any) => {
        allEpisodes.push({ season: season.number, episode: ep.number, ids: ep.ids, title: ep.title });
      });
    });
    // Checkbox state
    const checkedEpisodes = new Set<string>();
    // Entire show checkbox
    const showCheckbox = this.contentEl.createEl("input", { type: "checkbox" });
    showCheckbox.id = "show-checkbox";
    this.contentEl.createEl("label", { text: "Mark entire show as watched", attr: { for: "show-checkbox" } });
    showCheckbox.addEventListener("change", () => {
      if (showCheckbox.checked) {
        allEpisodes.forEach(ep => checkedEpisodes.add(`${ep.season}-${ep.episode}`));
        this.contentEl.querySelectorAll(".season-checkbox, .episode-checkbox").forEach((cb: any) => cb.checked = true);
      } else {
        checkedEpisodes.clear();
        this.contentEl.querySelectorAll(".season-checkbox, .episode-checkbox").forEach((cb: any) => cb.checked = false);
      }
    });
    this.contentEl.createEl("br");
    // Per-season and per-episode checkboxes
    seasons.forEach((season: any) => {
      if (season.number === 0) return; // skip specials
      const seasonDiv = this.contentEl.createEl("div", { cls: "season-block" });
      const seasonCheckbox = seasonDiv.createEl("input", { type: "checkbox", cls: "season-checkbox" });
      seasonCheckbox.id = `season-${season.number}`;
      seasonDiv.createEl("label", { text: `Season ${season.number}`, attr: { for: `season-${season.number}` } });
      seasonCheckbox.addEventListener("change", () => {
        (season.episodes || []).forEach((ep: any) => {
          const key = `${season.number}-${ep.number}`;
          const epCb = this.contentEl.querySelector(`#ep-${key}`) as HTMLInputElement;
          if (seasonCheckbox.checked) {
            checkedEpisodes.add(key);
            if (epCb) epCb.checked = true;
          } else {
            checkedEpisodes.delete(key);
            if (epCb) epCb.checked = false;
          }
        });
      });
      // Episodes
      const epList = seasonDiv.createEl("div", { cls: "episode-list" });
      (season.episodes || []).forEach((ep: any) => {
        const key = `${season.number}-${ep.number}`;
        const epCb = epList.createEl("input", { type: "checkbox", cls: "episode-checkbox" });
        epCb.id = `ep-${key}`;
        epCb.addEventListener("change", () => {
          if (epCb.checked) {
            checkedEpisodes.add(key);
          } else {
            checkedEpisodes.delete(key);
            // Uncheck season if any episode is unchecked
            seasonCheckbox.checked = (season.episodes || []).every((ep2: any) => checkedEpisodes.has(`${season.number}-${ep2.number}`));
            showCheckbox.checked = allEpisodes.every(ep2 => checkedEpisodes.has(`${ep2.season}-${ep2.episode}`));
          }
        });
        epList.createEl("label", { text: `E${ep.number}: ${ep.title}` });
      });
    });
    this.contentEl.createEl("br");
    const submitBtn = this.contentEl.createEl("button", { text: "Add to Trakt" });
    submitBtn.addEventListener("click", async () => {
      if (checkedEpisodes.size === 0) {
        new Notice("Please select at least one episode.");
        return;
      }
      const watchedAt = new Date(dateInput.value).toISOString();
      // Build payload for Trakt using all IDs
      const episodesPayload = Array.from(checkedEpisodes).map(key => {
        const [season, episode] = key.split("-").map(Number);
        return { ids: (traktShow as any).ids, season, number: episode, watched_at: watchedAt };
      });
      await this.plugin.addEpisodesToTrakt(traktShow, episodesPayload);
      new Notice(`Added ${checkedEpisodes.size} episode(s) to Trakt!`);
      this.close();
    });
  }
}

if (document) {
    const style = document.createElement('style');
    style.textContent = `
    .tmdb-search-result {
        padding: 6px 10px;
        cursor: pointer;
        border-bottom: 1px solid #ddd;
    }
    .tmdb-search-result:hover {
        background: #e0e0e0;
    }
    `;
    document.head.appendChild(style);
} 