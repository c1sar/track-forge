import { exchangeToken, type GarminAuthTokens } from './sso';
import { loadTokens, saveTokens } from './token-store';
import { GarminError } from './types';

const CONNECT_API = 'https://connectapi.garmin.com';
const REFRESH_MARGIN_SECONDS = 60;

interface SocialProfile {
  userName?: string;
  displayName?: string;
}

/**
 * Cliente autenticado contra connectapi.garmin.com. Refresca el token OAuth2
 * automáticamente cuando está a punto de expirar y lo repersiste cifrado.
 */
export class ConnectApiClient {
  private constructor(
    private readonly env: Env,
    private readonly userId: string,
    private tokens: GarminAuthTokens,
  ) {}

  static async forUser(env: Env, userId: string): Promise<ConnectApiClient | null> {
    const tokens = await loadTokens(env, userId);
    if (!tokens) {
      return null;
    }
    return new ConnectApiClient(env, userId, tokens);
  }

  static fromTokens(env: Env, userId: string, tokens: GarminAuthTokens): ConnectApiClient {
    return new ConnectApiClient(env, userId, tokens);
  }

  private async ensureFreshToken(): Promise<void> {
    const now = Math.floor(Date.now() / 1000);
    if (this.tokens.oauth2.expires_at - REFRESH_MARGIN_SECONDS > now) {
      return;
    }

    const oauth2 = await exchangeToken(this.tokens.oauth1);
    this.tokens = { ...this.tokens, oauth2 };
    await saveTokens(this.env, this.userId, this.tokens);
  }

  async get<T>(path: string, query?: Record<string, string>): Promise<T> {
    await this.ensureFreshToken();

    const url = new URL(`${CONNECT_API}${path}`);
    if (query) {
      for (const [key, value] of Object.entries(query)) {
        url.searchParams.set(key, value);
      }
    }

    const response = await fetch(url, {
      headers: {
        Authorization: `Bearer ${this.tokens.oauth2.access_token}`,
        'User-Agent': 'com.garmin.android.apps.connectmobile',
      },
    });

    const text = await response.text();
    if (!response.ok) {
      throw new GarminError({
        phase: 'fetch',
        message: `Error HTTP ${response.status} al consultar ${path}.`,
        detail: text.slice(0, 300),
        statusCode: 502,
      });
    }

    if (!text) {
      return null as T;
    }

    try {
      return JSON.parse(text) as T;
    } catch {
      throw new GarminError({
        phase: 'fetch',
        message: `Respuesta no JSON desde ${path}.`,
        detail: text.slice(0, 300),
        statusCode: 502,
      });
    }
  }

  async getDisplayName(): Promise<string> {
    const profile = await this.get<SocialProfile>('/userprofile-service/socialProfile');
    const displayName = profile.displayName ?? profile.userName;
    if (!displayName) {
      throw new GarminError({
        phase: 'fetch',
        message: 'No se pudo obtener el displayName del perfil Garmin.',
        statusCode: 502,
      });
    }
    return displayName;
  }
}
