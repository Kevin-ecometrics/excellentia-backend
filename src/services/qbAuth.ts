import OAuthClient from 'intuit-oauth';
import pool from '../db/connection.ts';
import logger from './logger.ts';

interface TokenOverrides {
  access_token?: string;
  refresh_token?: string;
  realmId?: string;
  expires_in?: number;
  x_refresh_token_expires_in?: number;
  createdAt?: number;
}

const defaultTokens: TokenOverrides = {
  access_token: process.env.ACCESS_TOKEN ?? '',
  refresh_token: process.env.REFRESH_TOKEN ?? '',
  realmId: process.env.REALM_ID ?? '',
  expires_in: parseInt(process.env.EXPIRES_IN ?? '3600'),
  x_refresh_token_expires_in: parseInt(process.env.X_REFRESH_TOKEN_EXPIRES_IN ?? '8726400'),
};

let oauthClient: OAuthClient;

function createClient(tokenOverrides?: TokenOverrides): OAuthClient {
  const token = { ...defaultTokens, ...tokenOverrides };
  return new OAuthClient({
    clientId: process.env.CLIENT_ID ?? '',
    clientSecret: process.env.CLIENT_SECRET ?? '',
    environment: (process.env.ENVIRONMENT ?? 'sandbox') as 'sandbox' | 'production',
    redirectUri: process.env.REDIRECT_URI ?? `http://localhost:${process.env.PORT ?? '3000'}/api/qb/callback`,
    logging: true,
    token,
  });
}

oauthClient = createClient();

async function saveTokensToDb(tokens: {
  access_token: string;
  refresh_token: string;
  realm_id?: string;
  expires_in?: number;
  x_refresh_token_expires_in?: number;
  token_created_at?: number;
}): Promise<void> {
  try {
    const [existing] = await pool.query('SELECT id FROM qb_tokens ORDER BY id DESC LIMIT 1') as any[];
    if (existing.length > 0) {
      await pool.query(
        'UPDATE qb_tokens SET access_token = ?, refresh_token = ?, realm_id = ?, expires_in = ?, x_refresh_token_expires_in = ?, token_created_at = ?, updated_at = NOW() WHERE id = ?',
        [tokens.access_token, tokens.refresh_token, tokens.realm_id ?? null, tokens.expires_in ?? null, tokens.x_refresh_token_expires_in ?? null, tokens.token_created_at ?? null, existing[0].id]
      );
    } else {
      await pool.query(
        'INSERT INTO qb_tokens (access_token, refresh_token, realm_id, expires_in, x_refresh_token_expires_in, token_created_at) VALUES (?, ?, ?, ?, ?, ?)',
        [tokens.access_token, tokens.refresh_token, tokens.realm_id ?? null, tokens.expires_in ?? null, tokens.x_refresh_token_expires_in ?? null, tokens.token_created_at ?? null]
      );
    }
    logger.info('Tokens de QuickBooks guardados en MySQL');
  } catch (err) {
    logger.error('Error guardando tokens QBO en MySQL:', err);
  }
}

async function loadTokensFromDb(): Promise<boolean> {
  try {
    const [rows] = await pool.query(
      'SELECT * FROM qb_tokens ORDER BY id DESC LIMIT 1'
    ) as any[];
    if (rows.length === 0) return false;

    const row = rows[0];
    oauthClient = createClient({
      access_token: row.access_token,
      refresh_token: row.refresh_token,
      realmId: row.realm_id ?? defaultTokens.realmId,
      expires_in: row.expires_in ?? defaultTokens.expires_in,
      x_refresh_token_expires_in: row.x_refresh_token_expires_in ?? defaultTokens.x_refresh_token_expires_in,
      createdAt: row.token_created_at ?? undefined,
    });
    logger.info('Tokens de QuickBooks cargados desde MySQL');
    return true;
  } catch (err) {
    logger.error('Error cargando tokens QBO desde MySQL:', err);
    return false;
  }
}

function loadTokensFromEnv(): boolean {
  try {
    const token: TokenOverrides = {
      access_token: process.env.ACCESS_TOKEN ?? '',
      refresh_token: process.env.REFRESH_TOKEN ?? '',
      realmId: process.env.REALM_ID ?? '',
      expires_in: parseInt(process.env.EXPIRES_IN ?? '3600'),
      x_refresh_token_expires_in: parseInt(process.env.X_REFRESH_TOKEN_EXPIRES_IN ?? '8726400'),
    };
    if (!token.access_token) return false;
    oauthClient = createClient(token);
    logger.info('Tokens QBO cargados desde .env');
    return true;
  } catch (err) {
    logger.error('Error cargando tokens desde .env:', err);
    return false;
  }
}

async function refreshToken(): Promise<void> {
  try {
    const authResponse = await oauthClient.refresh();
    const token = authResponse.getToken();

    oauthClient = createClient({
      access_token: token.access_token ?? '',
      refresh_token: token.refresh_token ?? '',
      realmId: defaultTokens.realmId,
      expires_in: token.expires_in,
      x_refresh_token_expires_in: token.x_refresh_token_expires_in,
      createdAt: token.createdAt ?? Date.now(),
    });

    await saveTokensToDb({
      access_token: token.access_token ?? '',
      refresh_token: token.refresh_token ?? '',
      realm_id: defaultTokens.realmId,
      expires_in: token.expires_in,
      x_refresh_token_expires_in: token.x_refresh_token_expires_in,
      token_created_at: token.createdAt ?? Date.now(),
    });

    logger.info('Token de QuickBooks refrescado y guardado');
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    logger.error('Failed to refresh token:', err);
    throw new Error(`Failed to refresh token: ${message}`);
  }
}

async function makeQboApiCall(endpoint: string, retried = false): Promise<any> {
  if (!oauthClient.isAccessTokenValid()) {
    await refreshToken();
  }
  try {
    const response = await oauthClient.makeApiCall({ url: endpoint });
    return response.json;
  } catch (err: any) {
    const status = err.code;
    logger.error('Error en llamada QBO API', {
      endpoint,
      status: err.code,
      description: err.description,
      intuitTid: err.intuitTid,
    });

    if ((status === '401' || status === '403') && !retried) {
      logger.info('Token expirado, forzando refresh y reintentando llamada...');
      try {
        await refreshToken();
        return makeQboApiCall(endpoint, true);
      } catch (refreshErr) {
        logger.warn('Refresh falló, intentando con tokens de .env...');
        const loaded = loadTokensFromEnv();
        if (!loaded) throw refreshErr;
        return makeQboApiCall(endpoint, true);
      }
    }

    throw err;
  }
}

async function makeQboBatch(batchItems: any[], retried = false): Promise<any> {
  if (!oauthClient.isAccessTokenValid()) {
    await refreshToken();
  }
  try {
    const response = await oauthClient.makeApiCall({
      url: `/v3/company/${defaultTokens.realmId}/batch`,
      method: 'POST',
      body: { BatchItemRequest: batchItems },
    });
    return response.json;
  } catch (err: any) {
    logger.error('Error en llamada QBO Batch', {
      status: err.code,
      description: err.description,
      intuitTid: err.intuitTid,
    });

    if ((err.code === '401' || err.code === '403') && !retried) {
      logger.info('Token expirado, forzando refresh y reintentando batch...');
      await refreshToken();
      return makeQboBatch(batchItems, true);
    }

    throw err;
  }
}

function getAuthUri(): string {
  return oauthClient.authorizeUri({ scope: [OAuthClient.scopes.Accounting, OAuthClient.scopes.OpenId], state: 'excellentia' });
}

async function handleCallback(reqUrl: string): Promise<{ access_token: string; refresh_token: string; realmId: string }> {
  const authResponse = await oauthClient.createToken(reqUrl);
  const token = authResponse.getToken();
  const realmId = (authResponse as any).realmId ?? defaultTokens.realmId;

  await saveTokensToDb({
    access_token: token.access_token ?? '',
    refresh_token: token.refresh_token ?? '',
    realm_id: realmId,
    expires_in: token.expires_in,
    x_refresh_token_expires_in: token.x_refresh_token_expires_in,
    token_created_at: token.createdAt ?? Date.now(),
  });

  oauthClient = createClient({
    access_token: token.access_token ?? '',
    refresh_token: token.refresh_token ?? '',
    realmId,
    expires_in: token.expires_in,
    x_refresh_token_expires_in: token.x_refresh_token_expires_in,
    createdAt: token.createdAt ?? Date.now(),
  });

  logger.info('OAuth callback completado — tokens guardados en MySQL');
  return { access_token: token.access_token ?? '', refresh_token: token.refresh_token ?? '', realmId };
}

export { oauthClient, refreshToken, makeQboApiCall, makeQboBatch, getAuthUri, handleCallback, loadTokensFromDb, loadTokensFromEnv, saveTokensToDb };
