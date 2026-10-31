import crypto from 'crypto';
import logger from '../utils/logger';
import db from './index';
import { ensureUser, getUserByUsername } from './users';

const KEY = crypto.createHash('sha256').update(process.env.ENCRYPTION_KEY || '').digest();
const BOT_ACCOUNT = 'BOT_USER';

export type Tokens = {
  access_token: string;
  refresh_token: string;
};

export type TwitchIdentity = {
  user_id: string;
  login: string;
};

type StoredTokens = Tokens & {
  userId?: number;
};

type EncryptedTokens = {
  access_token: string;
  refresh_token: string;
  iv_access_token: string;
  iv_refresh_token: string;
};

const encrypt = (text: string, iv: Buffer) => {
  const cipher = crypto.createCipheriv('aes-256-cbc', KEY, iv);
  const encrypted = cipher.update(text, 'utf8', 'hex');
  return encrypted + cipher.final('hex');
};

const decrypt = (encryptedData: string, iv: string) => {
  const decipher = crypto.createDecipheriv('aes-256-cbc', KEY, Buffer.from(iv, 'hex'));
  const decrypted = decipher.update(encryptedData, 'hex', 'utf8');
  return decrypted + decipher.final('utf8');
};

const encryptTokens = ({ access_token, refresh_token }: Tokens): EncryptedTokens => {
  const iv = crypto.randomBytes(16);
  return {
    access_token: encrypt(access_token, iv),
    refresh_token: encrypt(refresh_token, iv),
    iv_access_token: iv.toString('hex'),
    iv_refresh_token: iv.toString('hex'),
  };
};

const decryptTokens = (row: EncryptedTokens): Tokens => ({
  access_token: decrypt(row.access_token, row.iv_access_token),
  refresh_token: decrypt(row.refresh_token, row.iv_refresh_token),
});

const get = <T>(query: string, params: unknown[] = []): Promise<T | undefined> => new Promise((resolve, reject) => {
  db.get<T>(query, params, (error, row) => {
    if (error) {
      reject(error);
      return;
    }

    resolve(row);
  });
});

const run = (query: string, params: unknown[] = []): Promise<void> => new Promise((resolve, reject) => {
  db.run(query, params, (error) => {
    if (error) {
      reject(error);
      return;
    }

    resolve();
  });
});

export const loadTokens = async (account: string): Promise<StoredTokens | undefined> => {
  if (account === BOT_ACCOUNT) {
    const row = await get<EncryptedTokens>('SELECT * FROM bot_tokens WHERE id = 1');
    return row && decryptTokens(row);
  }

  const user = await getUserByUsername(account);
  if (user) {
    const row = await get<EncryptedTokens>(
      'SELECT access_token, refresh_token, iv_access_token, iv_refresh_token FROM oauth_tokens WHERE user_id = ?',
      [user.id],
    );
    if (row) return { ...decryptTokens(row), userId: user.id };
  }

  return undefined;
};

export const saveTokens = async (
  account: string,
  tokens: Tokens,
  identity?: TwitchIdentity,
): Promise<void> => {
  const encrypted = encryptTokens(tokens);
  if (account === BOT_ACCOUNT) {
    await run(`
      INSERT INTO bot_tokens (
        id, access_token, refresh_token, iv_access_token, iv_refresh_token
      ) VALUES (1, ?, ?, ?, ?)
      ON CONFLICT(id) DO UPDATE SET
        access_token = excluded.access_token,
        refresh_token = excluded.refresh_token,
        iv_access_token = excluded.iv_access_token,
        iv_refresh_token = excluded.iv_refresh_token
    `, [encrypted.access_token, encrypted.refresh_token, encrypted.iv_access_token, encrypted.iv_refresh_token]);
    return;
  }

  if (!identity) throw new Error('Twitch identity is required to store user OAuth tokens.');
  const user = await ensureUser(identity.user_id, identity.login);
  await run(`
    INSERT INTO oauth_tokens (
      user_id, access_token, refresh_token, iv_access_token, iv_refresh_token
    ) VALUES (?, ?, ?, ?, ?)
    ON CONFLICT(user_id) DO UPDATE SET
      access_token = excluded.access_token,
      refresh_token = excluded.refresh_token,
      iv_access_token = excluded.iv_access_token,
      iv_refresh_token = excluded.iv_refresh_token
  `, [user.id, encrypted.access_token, encrypted.refresh_token, encrypted.iv_access_token, encrypted.iv_refresh_token]);
};

export const deleteTokens = async (account: string): Promise<void> => {
  try {
    if (account === BOT_ACCOUNT) {
      await run('DELETE FROM bot_tokens WHERE id = 1');
    } else {
      const user = await getUserByUsername(account);
      if (user) await run('DELETE FROM oauth_tokens WHERE user_id = ?', [user.id]);
    }

    logger.info(`Tokens for account ${account} have been deleted.`);
  } catch (error) {
    logger.error(`Error deleting tokens for account ${account}:`, error);
    throw error;
  }
};
