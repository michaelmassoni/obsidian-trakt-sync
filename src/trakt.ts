// Use node-fetch to ensure Node.js HTTP requests (no CORS)
import fetch from 'node-fetch';

const TRAKT_API_BASE = "https://api.trakt.tv";

export interface TraktToken {
  access_token: string;
  token_type: string;
  expires_in: number;
  refresh_token?: string;
  scope?: string;
  created_at?: number;
  expires_at?: number;
}

export interface TraktDeviceCode {
  device_code: string;
  user_code: string;
  verification_url: string;
  expires_in: number;
  interval: number;
}

export interface TraktHistoryItem {
  type: string;
  movie?: any;
  show?: any;
  episode?: any;
  watched_at: string;
}

export async function getDeviceCode(clientId: string): Promise<TraktDeviceCode> {
  const res = await fetch(
    `${TRAKT_API_BASE}/oauth/device/code`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ client_id: clientId })
    }
  );
  if (!res.ok) throw new Error(`Trakt device code error: ${res.status}`);
  return await res.json();
}

export async function pollForToken(
  clientId: string,
  clientSecret: string,
  deviceCode: string,
  interval: number
): Promise<TraktToken> {
  while (true) {
    await new Promise((resolve) => setTimeout(resolve, interval * 1000));
    try {
      const res = await fetch(
        `${TRAKT_API_BASE}/oauth/device/token`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            code: deviceCode,
            client_id: clientId,
            client_secret: clientSecret,
          })
        }
      );
      if (res.ok) {
        const token = await res.json();
        token.expires_at = Date.now() / 1000 + token.expires_in;
        return token;
      } else if (res.status === 400) {
        // Authorization pending
        continue;
      } else {
        throw new Error(`Trakt token error: ${res.status}`);
      }
    } catch (e) {
      throw e;
    }
  }
}

export async function getTraktHistory(
  accessToken: string,
  clientId: string
): Promise<TraktHistoryItem[]> {
  let allItems: TraktHistoryItem[] = [];
  let page = 1;
  const perPage = 100;
  while (true) {
    const res = await fetch(
      `${TRAKT_API_BASE}/sync/history?limit=${perPage}&page=${page}`,
      {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'trakt-api-version': '2',
          'trakt-api-key': clientId,
          'Authorization': `Bearer ${accessToken}`,
        },
      }
    );
    if (!res.ok) throw new Error(`Trakt history error: ${res.status}`);
    const items = await res.json();
    if (!items.length) break;
    allItems = allItems.concat(items);
    if (items.length < perPage) break;
    page++;
  }
  return allItems;
} 