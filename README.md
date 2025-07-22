# Trakt Sync for Obsidian

An Obsidian plugin that provides automated syncing of your Trakt watch history (movies and shows) to your vault, enriched with TMDB metadata and customisable YAML frontmatter.

## Features

- Syncs watched movies and shows from your Trakt account
- Enriches notes with TMDB metadata (release date, genres, backdrop, etc.)
- Highly customisable YAML frontmatter (toggle and rename properties, including IDs)
- Secure Trakt device code authentication (with modal for code entry)

## Installation

1. Download the latest release from the [Releases page](https://github.com/michaelmassoni/obsidian-trakt-sync/releases).
2. Extract the contents into your vault’s plugins folder (e.g., `.obsidian/plugins/trakt-sync`).
3. Enable the plugin in Obsidian's Community Plugins settings.

## Setup

1. Open the plugin settings.
2. Enter your Trakt API Client ID and Client Secret ([get them here](https://trakt.tv/oauth/applications)).
3. Enter your TMDB API Key ([get it here](https://www.themoviedb.org/settings/api)).
4. Choose your movies and shows folders.
5. Customise YAML frontmatter and tags as desired.

## Usage

- Use the command palette and run **Sync Trakt History**.
- On first run, you’ll be prompted to visit a trakt.tv URL and enter a code to authorise the plugin with Trakt.
- The plugin will fetch your watch history, enrich it with TMDB data, and create or update notes in your vault.
- You can reset all settings to defaults from the settings page.

## Troubleshooting

- Ensure your API keys are correct and have the necessary permissions.
- If you have issues with authentication, use the “Clear Trakt token” button in settings.
- For large libraries, syncing may take a few minutes.

## License

GNU General Public License v3.0

This plugin is free software: you can redistribute it and/or modify it under the terms of the GNU General Public License as published by the Free Software Foundation, either version 3 of the License, or (at your option) any later version. See the LICENSE file for details. 