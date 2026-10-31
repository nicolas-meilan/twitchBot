import fs from 'fs';
import path from 'path';
import db from './index';
import { ensureUser as ensureTwitchUser } from './users';
import {
  BOT_MESSAGES_CONFIG,
  BROADCASTER_MESSAGES_CONFIG,
  MODS_ACTIONS_CONFIG,
  USERS_ACTIONS_CONFIG,
  VIP_ACTIONS_CONFIG,
} from '../configuration/chat';
import logger from '../utils/logger';

export type ChatCommand = {
  id: number;
  userId: number;
  twitchId: string;
  username: string;
  aliases: string[];
  value: string;
  description: string;
};

type AliasRow = {
  alias: string;
  command_value_id: number;
  user_id: number;
  twitch_id: string;
  username: string;
  value: string;
  description: string;
};

type SeedCommand = {
  aliases: string[];
  value: string;
  description: string;
};

export class ChatCommandError extends Error {}

const commandByUserAndAlias = new Map<string, ChatCommand>();
let initialization: Promise<void> | undefined;
let mutationQueue = Promise.resolve();

const reservedAliases = new Set([
  ...USERS_ACTIONS_CONFIG,
  ...VIP_ACTIONS_CONFIG,
  ...MODS_ACTIONS_CONFIG,
  ...BOT_MESSAGES_CONFIG,
  ...BROADCASTER_MESSAGES_CONFIG,
].map((alias) => alias.trim().toLowerCase().replace(/^!/, '')));

const getConfiguredOwner = () => {
  const twitchId = process.env.BROADCAST_ACCOUNT_ID?.trim() || '';
  const username = process.env.BROADCAST_USERNAME?.trim().toLowerCase() || '';
  if (!twitchId || !username) {
    throw new Error('BROADCAST_ACCOUNT_ID and BROADCAST_USERNAME must be configured for chat commands.');
  }
  return { twitchId, username };
};

const cacheKey = (twitchId: string, alias: string): string => `${twitchId}:${alias}`;

const normalizeAlias = (alias: string): string => {
  const normalized = alias.trim().toLowerCase().replace(/^!/, '');
  if (!/^[a-z0-9]+$/.test(normalized)) {
    throw new ChatCommandError(`El alias "${alias}" no es válido.`);
  }
  return normalized;
};

const commandAlias = (alias: string): string | undefined => {
  const formatted = alias.trim().toLowerCase();
  if (!formatted.startsWith('!')) return undefined;
  const normalized = formatted.slice(1);
  return /^[a-z0-9]+$/.test(normalized) ? normalized : undefined;
};

const run = (query: string, params: unknown[] = []): Promise<{ lastID: number; changes: number }> => new Promise((resolve, reject) => {
  db.run(query, params, function (error) {
    if (error) {
      reject(error);
      return;
    }
    resolve({ lastID: this.lastID, changes: this.changes });
  });
});

const all = <T>(query: string, params: unknown[] = []): Promise<T[]> => new Promise((resolve, reject) => {
  db.all<T>(query, params, (error, rows) => {
    if (error) {
      reject(error);
      return;
    }
    resolve(rows);
  });
});

const ensureSchema = async (): Promise<void> => {
  await run(`
    CREATE TABLE IF NOT EXISTS "user" (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      twitch_id TEXT NOT NULL UNIQUE,
      username TEXT NOT NULL COLLATE NOCASE UNIQUE
    )
  `);
  await run(`
    CREATE TABLE IF NOT EXISTS chat_command_value (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      value TEXT NOT NULL,
      description TEXT NOT NULL
    )
  `);
  await run(`
    CREATE TABLE IF NOT EXISTS chat_command_alias (
      user_id INTEGER NOT NULL,
      alias TEXT NOT NULL,
      chat_command_value_id INTEGER NOT NULL,
      CHECK (alias = lower(alias) AND length(alias) > 0 AND alias NOT GLOB '*[^a-z0-9]*'),
      PRIMARY KEY (user_id, alias),
      FOREIGN KEY (user_id) REFERENCES "user"(id) ON DELETE CASCADE,
      FOREIGN KEY (chat_command_value_id) REFERENCES chat_command_value(id) ON DELETE CASCADE
    )
  `);
  await run(`
    CREATE TABLE IF NOT EXISTS chat_command_alias_exclusion (
      user_id INTEGER NOT NULL,
      alias TEXT NOT NULL,
      CHECK (alias = lower(alias) AND length(alias) > 0 AND alias NOT GLOB '*[^a-z0-9]*'),
      PRIMARY KEY (user_id, alias),
      FOREIGN KEY (user_id) REFERENCES "user"(id) ON DELETE CASCADE
    )
  `);
  await run('CREATE INDEX IF NOT EXISTS idx_chat_command_alias_value ON chat_command_alias(chat_command_value_id)');
};

const ensureUser = async (twitchId: string, username: string): Promise<number> => (
  (await ensureTwitchUser(twitchId, username)).id
);

const getUserId = async (twitchId: string): Promise<number> => {
  const rows = await all<{ id: number }>('SELECT id FROM "user" WHERE twitch_id = ?', [twitchId]);
  if (!rows[0]) throw new Error(`Twitch user ${twitchId} is not registered for chat commands.`);
  return rows[0].id;
};

const ensureConfiguredOwner = async (): Promise<void> => {
  const { twitchId, username } = getConfiguredOwner();
  await ensureUser(twitchId, username);
};

const loadSeedCommands = (): SeedCommand[] => {
  const seedPath = path.resolve(__dirname, '../../data/chat-commands.json');
  const parsed: unknown = JSON.parse(fs.readFileSync(seedPath, 'utf8'));
  if (!Array.isArray(parsed)) throw new Error('Chat command seed file must contain an array.');

  return parsed.map((entry: unknown) => {
    if (!entry || typeof entry !== 'object') throw new Error('Invalid chat command in seed file.');
    const command = entry as Partial<SeedCommand>;
    if (
      !Array.isArray(command.aliases)
      || command.aliases.some((alias) => typeof alias !== 'string')
      || typeof command.value !== 'string'
      || typeof command.description !== 'string'
      || !command.value.trim()
      || !command.description.trim()
    ) {
      throw new Error('Seeded chat commands require aliases, a value, and a description.');
    }

    return {
      aliases: command.aliases.map(normalizeAlias),
      value: command.value,
      description: command.description,
    };
  });
};

const seedCommandsForOwner = async (): Promise<void> => {
  const { twitchId } = getConfiguredOwner();
  const userId = await getUserId(twitchId);
  for (const command of loadSeedCommands()) {
    const placeholders = command.aliases.map(() => '?').join(', ');
    const excludedAliases = await all<{ alias: string }>(`
      SELECT alias FROM chat_command_alias_exclusion
      WHERE user_id = ? AND alias IN (${placeholders})
    `, [userId, ...command.aliases]);
    const excluded = new Set(excludedAliases.map(({ alias }) => alias));
    const seedAliases = command.aliases.filter((alias) => !excluded.has(alias));
    if (seedAliases.length === 0) continue;

    const seedPlaceholders = seedAliases.map(() => '?').join(', ');
    const existing = await all<{ alias: string; chat_command_value_id: number }>(`
      SELECT alias, chat_command_value_id
      FROM chat_command_alias
      WHERE user_id = ? AND alias IN (${seedPlaceholders})
    `, [userId, ...seedAliases]);

    if (existing.length === 0) {
      const { lastID } = await run(
        'INSERT INTO chat_command_value (value, description) VALUES (?, ?)',
        [command.value, command.description],
      );
      for (const alias of seedAliases) {
        await run(
          'INSERT INTO chat_command_alias (user_id, alias, chat_command_value_id) VALUES (?, ?, ?)',
          [userId, alias, lastID],
        );
      }
      continue;
    }

    const valueIds = new Set(existing.map(({ chat_command_value_id }) => chat_command_value_id));
    if (valueIds.size !== 1) {
      logger.warn(`Skipping conflicting seeded command aliases: ${command.aliases.join(', ')}`);
      continue;
    }

    const valueId = existing[0].chat_command_value_id;
    for (const alias of seedAliases) {
      if (!existing.some((entry) => entry.alias === alias)) {
        await run(
          'INSERT INTO chat_command_alias (user_id, alias, chat_command_value_id) VALUES (?, ?, ?)',
          [userId, alias, valueId],
        );
      }
    }
  }
};

const refreshCommandCache = async (): Promise<void> => {
  const rows = await all<AliasRow>(`
    SELECT aliases.user_id, users.twitch_id, users.username, aliases.alias,
      aliases.chat_command_value_id AS command_value_id,
      values_table.value, values_table.description
    FROM chat_command_alias AS aliases
    JOIN chat_command_value AS values_table
      ON values_table.id = aliases.chat_command_value_id
    JOIN "user" AS users ON users.id = aliases.user_id
    ORDER BY aliases.alias
  `);
  const commandsById = new Map<string, ChatCommand>();

  for (const row of rows) {
    if (reservedAliases.has(row.alias)) continue;
    const key = `${row.twitch_id}:${row.command_value_id}`;
    const command = commandsById.get(key) || {
      id: row.command_value_id,
      userId: row.user_id,
      twitchId: row.twitch_id,
      username: row.username,
      aliases: [],
      value: row.value,
      description: row.description,
    };
    command.aliases.push(row.alias);
    commandsById.set(key, command);
  }

  commandByUserAndAlias.clear();
  for (const command of commandsById.values()) {
    command.aliases.forEach((alias) => commandByUserAndAlias.set(cacheKey(command.twitchId, alias), command));
  }
};

const initialize = async (): Promise<void> => {
  await run('BEGIN IMMEDIATE');
  try {
    await ensureSchema();
    await ensureConfiguredOwner();
    await seedCommandsForOwner();
    await run('COMMIT');
  } catch (error) {
    await run('ROLLBACK');
    throw error;
  }
  await refreshCommandCache();
};

export const initializeChatCommands = (): Promise<void> => {
  initialization ||= initialize();
  return initialization;
};

export const getChatCommand = (twitchId: string, alias: string): ChatCommand | undefined => {
  const normalizedAlias = commandAlias(alias);
  return normalizedAlias
    ? commandByUserAndAlias.get(cacheKey(twitchId, normalizedAlias))
    : undefined;
};

export const getChatCommandAliases = (twitchId: string): string[] => (
  [...new Set(
    [...commandByUserAndAlias.values()]
      .filter((command) => command.twitchId === twitchId)
      .flatMap((command) => command.aliases),
  )].map((alias) => `!${alias}`)
);

export const getChatCommands = (twitchId: string): ChatCommand[] => (
  [...new Map(
    [...commandByUserAndAlias.values()]
      .filter((command) => command.twitchId === twitchId)
      .map((command) => [command.id, command]),
  ).values()]
);

const withMutationLock = <T>(operation: () => Promise<T>): Promise<T> => {
  const result = mutationQueue.then(operation);
  mutationQueue = result.then(() => undefined, () => undefined);
  return result;
};

export const addChatCommand = (
  twitchId: string,
  username: string,
  rawAliases: string[],
  value: string,
  description: string,
): Promise<ChatCommand> => withMutationLock(async () => {
  if (!initialization) throw new Error('Chat commands have not been initialized.');
  await initialization;

  const aliases = rawAliases.map(normalizeAlias);
  const normalizedValue = value.trim();
  const normalizedDescription = description.trim();
  if (aliases.length === 0 || new Set(aliases).size !== aliases.length) {
    throw new ChatCommandError('Proporcioná alias de comando únicos.');
  }
  if (!normalizedValue) throw new ChatCommandError('El texto de respuesta no puede estar vacío.');
  if (!normalizedDescription) throw new ChatCommandError('La descripción no puede estar vacía.');

  const reservedAlias = aliases.find((alias) => reservedAliases.has(alias));
  if (reservedAlias) throw new ChatCommandError(`${reservedAlias} está reservado para un comando integrado.`);

  const existingAlias = aliases.find((alias) => commandByUserAndAlias.has(cacheKey(twitchId, alias)));
  if (existingAlias) throw new ChatCommandError(`${existingAlias} ya pertenece a un comando.`);

  await run('BEGIN IMMEDIATE');
  let command: ChatCommand;
  try {
    const userId = await ensureUser(twitchId, username);
    for (const alias of aliases) {
      await run(
        'DELETE FROM chat_command_alias_exclusion WHERE user_id = ? AND alias = ?',
        [userId, alias],
      );
    }
    const { lastID } = await run(
      'INSERT INTO chat_command_value (value, description) VALUES (?, ?)',
      [normalizedValue, normalizedDescription],
    );
    for (const alias of aliases) {
      await run(
        'INSERT INTO chat_command_alias (user_id, alias, chat_command_value_id) VALUES (?, ?, ?)',
        [userId, alias, lastID],
      );
    }
    await run('COMMIT');
    command = {
      id: lastID,
      userId,
      twitchId,
      username: username.trim().toLowerCase(),
      aliases,
      value: normalizedValue,
      description: normalizedDescription,
    };
  } catch (error) {
    await run('ROLLBACK');
    throw error;
  }

  aliases.forEach((alias) => commandByUserAndAlias.set(cacheKey(twitchId, alias), command));
  return command;
});

export type RemoveChatCommandResult = {
  alias: string;
  valueDeleted: boolean;
};

export const removeChatCommand = (
  twitchId: string,
  rawAlias: string,
): Promise<RemoveChatCommandResult | undefined> => withMutationLock(async () => {
  if (!initialization) throw new Error('Chat commands have not been initialized.');
  await initialization;

  const alias = normalizeAlias(rawAlias);
  if (reservedAliases.has(alias)) {
    throw new ChatCommandError(`${alias} es un comando integrado y no se puede eliminar.`);
  }

  const userId = await getUserId(twitchId);
  await run('BEGIN IMMEDIATE');

  try {
    const existing = await all<{ chat_command_value_id: number }>(
      'SELECT chat_command_value_id FROM chat_command_alias WHERE user_id = ? AND alias = ?',
      [userId, alias],
    );
    if (!existing[0]) {
      await run('COMMIT');
      return undefined;
    }

    const valueId = existing[0].chat_command_value_id;
    const seededAliases = new Set(loadSeedCommands().flatMap(({ aliases }) => aliases));
    if (seededAliases.has(alias)) {
      await run(
        'INSERT OR IGNORE INTO chat_command_alias_exclusion (user_id, alias) VALUES (?, ?)',
        [userId, alias],
      );
    }

    await run(
      'DELETE FROM chat_command_alias WHERE user_id = ? AND alias = ?',
      [userId, alias],
    );
    const valueDeletion = await run(`
      DELETE FROM chat_command_value
      WHERE id = ? AND NOT EXISTS (
        SELECT 1 FROM chat_command_alias WHERE chat_command_value_id = ?
      )
    `, [valueId, valueId]);
    await run('COMMIT');

    const cachedCommand = commandByUserAndAlias.get(cacheKey(twitchId, alias));
    if (cachedCommand) {
      cachedCommand.aliases = cachedCommand.aliases.filter((cachedAlias) => cachedAlias !== alias);
      commandByUserAndAlias.delete(cacheKey(twitchId, alias));
    }

    return { alias, valueDeleted: valueDeletion.changes > 0 };
  } catch (error) {
    await run('ROLLBACK');
    throw error;
  }
});

export const getConfiguredChatCommandOwnerTwitchId = (): string => getConfiguredOwner().twitchId;
