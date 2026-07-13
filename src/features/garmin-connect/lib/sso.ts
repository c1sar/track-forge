import { createHmac } from 'node:crypto';

import OAuth from 'oauth-1.0a';

import { GarminError } from './types';

// Login SSO móvil JSON de Garmin (estilo garth), con OAuth1 -> OAuth2.
// Implementado con fetch nativo para máxima compatibilidad con workerd.

const CLIENT_ID = 'GCM_ANDROID_DARK';
const DOMAIN = 'garmin.com';
const SSO_BASE = `https://sso.${DOMAIN}`;
const CONNECT_API = `https://connectapi.${DOMAIN}`;
const SERVICE_URL = `https://mobile.integration.${DOMAIN}/gcm/android`;
const OAUTH_CONSUMER_URL = 'https://thegarth.s3.amazonaws.com/oauth_consumer.json';

const SSO_SUCCESSFUL = 'SUCCESSFUL';
const SSO_MFA_REQUIRED = 'MFA_REQUIRED';

const SSO_PAGE_HEADERS = {
  'User-Agent':
    'Mozilla/5.0 (iPhone; CPU iPhone OS 18_7 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148',
  Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
  'Accept-Language': 'en-US,en;q=0.9',
  'Sec-Fetch-Mode': 'navigate',
  'Sec-Fetch-Dest': 'document',
} as const;

const OAUTH_USER_AGENT = {
  'User-Agent': 'com.garmin.android.apps.connectmobile',
} as const;

export interface LoginParams {
  clientId: string;
  locale: string;
  service: string;
}

export interface MfaSessionState {
  cookies: Record<string, string>;
  loginParams: LoginParams;
  mfaMethod: string;
}

export interface OAuth1Token {
  oauth_token: string;
  oauth_token_secret: string;
  mfa_token?: string;
}

export interface OAuth2Token {
  access_token: string;
  refresh_token: string;
  token_type: string;
  expires_in: number;
  refresh_token_expires_in: number;
  scope: string;
  jti: string;
  expires_at: number;
  refresh_token_expires_at: number;
}

export interface GarminAuthTokens {
  oauth1: OAuth1Token;
  oauth2: OAuth2Token;
}

interface SsoResponseStatus {
  type?: string;
  message?: string;
}

interface SsoLoginResponse {
  responseStatus?: SsoResponseStatus;
  serviceTicketId?: string;
  customerMfaInfo?: { mfaLastMethodUsed?: string };
}

interface OAuthConsumer {
  consumer_key: string;
  consumer_secret: string;
}

export type StartLoginResult =
  | { status: 'ok'; tokens: GarminAuthTokens }
  | { status: 'mfa'; state: MfaSessionState };

/** Cookie jar serializable para reanudar MFA entre peticiones HTTP. */
export class CookieJar {
  private readonly cookies = new Map<string, string>();

  static fromRecord(record: Record<string, string>): CookieJar {
    const jar = new CookieJar();
    for (const [name, value] of Object.entries(record)) {
      jar.cookies.set(name, value);
    }
    return jar;
  }

  toRecord(): Record<string, string> {
    return Object.fromEntries(this.cookies.entries());
  }

  ingest(response: Response): void {
    const setCookies =
      typeof response.headers.getSetCookie === 'function' ? response.headers.getSetCookie() : [];

    for (const raw of setCookies) {
      const [pair] = raw.split(';');
      if (!pair) {
        continue;
      }
      const separator = pair.indexOf('=');
      if (separator <= 0) {
        continue;
      }
      const name = pair.slice(0, separator).trim();
      const value = pair.slice(separator + 1).trim();
      if (name) {
        this.cookies.set(name, value);
      }
    }
  }

  headerValue(): string | undefined {
    if (this.cookies.size === 0) {
      return undefined;
    }
    return [...this.cookies.entries()].map(([name, value]) => `${name}=${value}`).join('; ');
  }
}

function buildLoginParams(): LoginParams {
  return { clientId: CLIENT_ID, locale: 'en-US', service: SERVICE_URL };
}

function toQueryString(params: Record<string, string>): string {
  return new URLSearchParams(params).toString();
}

async function readJson<T>(response: Response): Promise<T> {
  const text = await response.text();
  try {
    return JSON.parse(text) as T;
  } catch {
    throw new GarminError({
      phase: 'login',
      message: 'Garmin SSO devolvió una respuesta no JSON.',
      detail: `HTTP ${response.status} — ${text.slice(0, 300)}`,
      statusCode: response.status === 429 ? 429 : 502,
    });
  }
}

function assertOkResponse(response: Response, bodyPreview?: string): void {
  if (response.ok) {
    return;
  }

  const preview = bodyPreview?.slice(0, 300) ?? '';
  const normalized = preview.toLowerCase();

  if (response.status === 429 || normalized.includes('rate limit') || normalized.includes('1015')) {
    throw new GarminError({
      phase: 'login',
      message:
        'Garmin/Cloudflare ha bloqueado temporalmente esta IP (rate limit). Espera 15-60 minutos.',
      detail: `HTTP ${response.status} — ${preview}`,
      statusCode: 429,
    });
  }

  throw new GarminError({
    phase: 'login',
    message: `Error HTTP ${response.status} en el flujo SSO de Garmin.`,
    detail: preview || response.statusText,
    statusCode: response.status >= 500 ? 502 : 401,
  });
}

function parseSsoStatus(payload: SsoLoginResponse): string {
  return payload.responseStatus?.type ?? 'UNKNOWN';
}

function parseSsoMessage(payload: SsoLoginResponse): string {
  return payload.responseStatus?.message ?? '';
}

async function ssoFetch(
  jar: CookieJar,
  path: string,
  init: RequestInit & { query?: Record<string, string> } = {},
): Promise<Response> {
  const url = new URL(path, SSO_BASE);
  if (init.query) {
    for (const [key, value] of Object.entries(init.query)) {
      url.searchParams.set(key, value);
    }
  }

  const cookieHeader = jar.headerValue();
  const headers = new Headers(init.headers);
  for (const [key, value] of Object.entries(SSO_PAGE_HEADERS)) {
    headers.set(key, value);
  }
  if (cookieHeader) {
    headers.set('Cookie', cookieHeader);
  }
  if (init.body) {
    headers.set('Content-Type', 'application/json');
  }

  const response = await fetch(url, { ...init, headers });
  jar.ingest(response);
  return response;
}

async function primeSsoSession(jar: CookieJar): Promise<void> {
  const response = await ssoFetch(jar, '/mobile/sso/en/sign-in', {
    method: 'GET',
    query: { clientId: CLIENT_ID },
    headers: { 'Sec-Fetch-Site': 'none' },
  });
  assertOkResponse(response, await response.text());
}

async function submitLogin(
  jar: CookieJar,
  email: string,
  password: string,
  loginParams: LoginParams,
): Promise<SsoLoginResponse> {
  const response = await ssoFetch(jar, '/mobile/api/login', {
    method: 'POST',
    query: loginParams as unknown as Record<string, string>,
    body: JSON.stringify({ username: email, password, rememberMe: false, captchaToken: '' }),
  });

  const payload = await readJson<SsoLoginResponse>(response);
  assertOkResponse(response, JSON.stringify(payload));
  return payload;
}

async function submitMfaCode(
  jar: CookieJar,
  loginParams: LoginParams,
  mfaMethod: string,
  mfaCode: string,
): Promise<SsoLoginResponse> {
  const response = await ssoFetch(jar, '/mobile/api/mfa/verifyCode', {
    method: 'POST',
    query: loginParams as unknown as Record<string, string>,
    body: JSON.stringify({
      mfaMethod,
      mfaVerificationCode: mfaCode,
      rememberMyBrowser: false,
      reconsentList: [],
      mfaSetup: false,
    }),
  });

  const payload = await readJson<SsoLoginResponse>(response);
  assertOkResponse(response, JSON.stringify(payload));

  if (parseSsoStatus(payload) !== SSO_SUCCESSFUL) {
    throw new GarminError({
      phase: 'login',
      message: 'Código MFA inválido o expirado. Solicita uno nuevo e inténtalo otra vez.',
      detail: `${parseSsoStatus(payload)}: ${parseSsoMessage(payload)}`,
      statusCode: 401,
    });
  }

  return payload;
}

let cachedConsumer: OAuthConsumer | null = null;

async function fetchOAuthConsumer(): Promise<OAuthConsumer> {
  if (cachedConsumer) {
    return cachedConsumer;
  }
  const response = await fetch(OAUTH_CONSUMER_URL);
  const text = await response.text();
  assertOkResponse(response, text);
  cachedConsumer = JSON.parse(text) as OAuthConsumer;
  return cachedConsumer;
}

function createOAuthClient(consumer: OAuthConsumer): OAuth {
  return new OAuth({
    consumer: { key: consumer.consumer_key, secret: consumer.consumer_secret },
    signature_method: 'HMAC-SHA1',
    hash_function(baseString, key) {
      return createHmac('sha1', key).update(baseString).digest('base64');
    },
  });
}

function parseQueryString(text: string): Record<string, string> {
  const params = new URLSearchParams(text);
  const result: Record<string, string> = {};
  for (const [key, value] of params.entries()) {
    result[key] = value;
  }
  return result;
}

async function getOauth1Token(ticket: string, jar: CookieJar): Promise<OAuth1Token> {
  const consumer = await fetchOAuthConsumer();
  const oauth = createOAuthClient(consumer);

  const url = `${CONNECT_API}/oauth-service/oauth/preauthorized?${toQueryString({
    ticket,
    'login-url': SERVICE_URL,
    'accepts-mfa-tokens': 'true',
  })}`;

  const authHeader = oauth.toHeader(oauth.authorize({ url, method: 'GET' }));
  const headers = new Headers({ ...OAUTH_USER_AGENT, ...authHeader });
  const cookieHeader = jar.headerValue();
  if (cookieHeader) {
    headers.set('Cookie', cookieHeader);
  }

  const response = await fetch(url, { headers });
  const text = await response.text();
  assertOkResponse(response, text);

  const parsed = parseQueryString(text);
  if (!parsed.oauth_token || !parsed.oauth_token_secret) {
    throw new GarminError({
      phase: 'login',
      message: 'No se pudo obtener el token OAuth1 de Garmin.',
      detail: text.slice(0, 300),
      statusCode: 502,
    });
  }

  return parsed as unknown as OAuth1Token;
}

function withExpirations(token: OAuth2Token): OAuth2Token {
  const now = Math.floor(Date.now() / 1000);
  return {
    ...token,
    expires_at: now + token.expires_in,
    refresh_token_expires_at: now + token.refresh_token_expires_in,
  };
}

export async function exchangeToken(oauth1: OAuth1Token): Promise<OAuth2Token> {
  const consumer = await fetchOAuthConsumer();
  const oauth = createOAuthClient(consumer);

  const baseUrl = `${CONNECT_API}/oauth-service/oauth/exchange/user/2.0`;
  const authData = oauth.authorize(
    { url: baseUrl, method: 'POST', data: null },
    { key: oauth1.oauth_token, secret: oauth1.oauth_token_secret },
  );

  const query = new URLSearchParams(
    Object.fromEntries(Object.entries(authData).map(([key, value]) => [key, String(value)])),
  );

  const response = await fetch(`${baseUrl}?${query.toString()}`, {
    method: 'POST',
    headers: { ...OAUTH_USER_AGENT, 'Content-Type': 'application/x-www-form-urlencoded' },
  });

  const payload = await readJson<OAuth2Token>(response);
  assertOkResponse(response, JSON.stringify(payload));
  return withExpirations(payload);
}

async function completeLogin(jar: CookieJar, ticket: string): Promise<GarminAuthTokens> {
  try {
    await ssoFetch(jar, '/portal/sso/embed', {
      method: 'GET',
      headers: { 'Sec-Fetch-Site': 'same-origin' },
    });
  } catch {
    // Paso best-effort para fijar cookies de balanceo; ignorar fallos.
  }

  const oauth1 = await getOauth1Token(ticket, jar);
  const oauth2 = await exchangeToken(oauth1);
  return { oauth1, oauth2 };
}

function mapLoginFailure(payload: SsoLoginResponse): never {
  const status = parseSsoStatus(payload);
  const message = parseSsoMessage(payload);
  const normalized = message.toLowerCase();

  if (
    normalized.includes('invalid') ||
    normalized.includes('credential') ||
    normalized.includes('password')
  ) {
    throw new GarminError({
      phase: 'login',
      message: 'Credenciales de Garmin inválidas o sesión rechazada.',
      detail: `${status}: ${message}`,
      statusCode: 401,
    });
  }

  throw new GarminError({
    phase: 'login',
    message: `Fallo durante el login SSO: ${status}`,
    detail: message,
    statusCode: 502,
  });
}

/** Paso 1: credenciales. Devuelve tokens o estado MFA serializable. */
export async function startLogin(email: string, password: string): Promise<StartLoginResult> {
  const jar = new CookieJar();
  const loginParams = buildLoginParams();

  await primeSsoSession(jar);
  const payload = await submitLogin(jar, email, password, loginParams);
  const status = parseSsoStatus(payload);

  if (status === SSO_SUCCESSFUL) {
    const ticket = payload.serviceTicketId;
    if (!ticket) {
      throw new GarminError({
        phase: 'login',
        message: 'Garmin no devolvió serviceTicketId tras login exitoso.',
        statusCode: 502,
      });
    }
    return { status: 'ok', tokens: await completeLogin(jar, ticket) };
  }

  if (status === SSO_MFA_REQUIRED) {
    const mfaMethod = payload.customerMfaInfo?.mfaLastMethodUsed?.trim() || 'email';
    return { status: 'mfa', state: { cookies: jar.toRecord(), loginParams, mfaMethod } };
  }

  return mapLoginFailure(payload);
}

/** Paso 2: verifica el código MFA y devuelve tokens OAuth. */
export async function resumeLoginWithMfa(
  state: MfaSessionState,
  mfaCode: string,
): Promise<GarminAuthTokens> {
  const jar = CookieJar.fromRecord(state.cookies);
  const payload = await submitMfaCode(jar, state.loginParams, state.mfaMethod, mfaCode);

  const ticket = payload.serviceTicketId;
  if (!ticket) {
    throw new GarminError({
      phase: 'login',
      message: 'Garmin no devolvió serviceTicketId tras verificar MFA.',
      statusCode: 502,
    });
  }

  return completeLogin(jar, ticket);
}
