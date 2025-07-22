import { App, Plugin, PluginSettingTab, Setting, Notice, TFile, normalizePath, TFolder, Modal } from "obsidian";
import { getDeviceCode, pollForToken, getTraktHistory, TraktToken, TraktHistoryItem } from "./trakt";
import { getTMDBMovie, getTMDBShow } from "./tmdb";
import { buildMarkdown } from "./markdown";
import { groupHistoryItems, getLastWatched, getWatchedCount, getLastEpisodeInfo } from "./utils";
import slugify from "slugify";

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
        await this.app.vault.adapter.mkdir(normalizePath(notePath.split("/").slice(0, -1).join("/")));
        let fileExisted = false;
        try {
          await this.app.vault.adapter.stat(notePath);
          fileExisted = true;
        } catch {}
        let updatedFile = false;
        if (fileExisted) {
          const oldContent = await this.app.vault.adapter.read(notePath);
          if (oldContent !== markdown) {
            await this.app.vault.adapter.write(notePath, markdown);
            updated++;
            updatedFile = true;
          } else {
            skipped++;
          }
        } else {
          await this.app.vault.adapter.write(notePath, markdown);
          created++;
        }
        processed++;
        progressNotice.setMessage(`Trakt Sync: ${processed}/${total} (${created} created, ${updated} updated, ${skipped} skipped)`);
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