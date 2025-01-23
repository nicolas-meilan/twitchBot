import logger from '../utils/logger';
import db from './index';
import crypto from 'crypto';

const KEY = crypto.createHash('sha256').update(process.env.ENCRYPTION_KEY || '').digest();

export type Tokens = {
  access_token: string;
  refresh_token: string;
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

export const saveTokens = (account: string, { access_token, refresh_token }: Tokens) => {
  const IV = crypto.randomBytes(16);
  const encryptedAccessToken = encrypt(access_token, IV);
  const encryptedRefreshToken = encrypt(refresh_token, IV);

  const stmt = db.prepare(`
    INSERT INTO oauth_tokens (account, access_token, refresh_token, iv_access_token, iv_refresh_token) 
    VALUES (?, ?, ?, ?, ?)
    ON CONFLICT(account) DO UPDATE SET 
      access_token = excluded.access_token,
      refresh_token = excluded.refresh_token,
      iv_access_token = excluded.iv_access_token,
      iv_refresh_token = excluded.iv_refresh_token
  `);

  stmt.run(
    account,
    encryptedAccessToken,
    encryptedRefreshToken,
    IV.toString('hex'),
    IV.toString('hex'),
  );
  stmt.finalize();
};

export const loadTokens = (account: string) => new Promise<Tokens | undefined>((resolve, reject) => {
  db.get<EncryptedTokens>(
    'SELECT access_token, refresh_token, iv_access_token, iv_refresh_token FROM oauth_tokens WHERE account = ?',
    [account],
    (err, row) => {
      if (err) {
        reject(err);
        return;
      }

      if (!row) {
        resolve(undefined);
        return;
      }

      const decryptedAccessToken = decrypt(row.access_token, row.iv_access_token);
      const decryptedRefreshToken = decrypt(row.refresh_token, row.iv_refresh_token);

      resolve({
        access_token: decryptedAccessToken,
        refresh_token: decryptedRefreshToken,
      });
    }
  );
});

export const deleteTokens = (account: string) => {
  const stmt = db.prepare(`
    DELETE FROM oauth_tokens WHERE account = ?
  `);

  stmt.run(account, (err) => {
    if (err) {
      logger.error("Error deleting tokens:", err);
    } else {
      logger.info(`Tokens for account ${account} have been deleted.`);
    }
  });

  stmt.finalize();
};
