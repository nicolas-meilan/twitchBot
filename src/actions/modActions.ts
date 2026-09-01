import { sendEventClip, sendEventTTS, sendEventLotteryWinner } from '../services/botEvents';
import { BASE_TAGS, Game, GAMES } from '../configuration/games';
import { getGameId, updateChannelInfo } from '../services/twitch/channel';
import { getBotTokens, getBroadcastTokens, refreshBroadcastTokens } from '../services/twitch/auth';
import { getClipInformation } from '../services/twitch/clip';
import lottery from '../services/Lottery';
import {
  ADD_MANUALLY_TO_PLAYERS_QUEUE_KEY,
  BAN_KEY,
  CHANGE_CHANNEL_INFORMATION_KEY,
  CHANGE_CHANNEL_INFORMATION_KEY_2,
  CHANNEL_INFO_ACTION_ERROR,
  CHANNEL_INFO_ACTION_GAME_NOT_AVAILABLE,
  CHANNEL_INFO_ACTION_SUCCESS,
  CLEAN_PLAYERS_QUEUE_KEY,
  CLIP_ACTION_ERROR,
  CLIP_ACTION_SUCCESS,
  COMMAND_DELIMITER,
  DELETE_PLAYER_FROM_QUEUE_KEY,
  MOST_POPULAR_CLIP_KEY,
  MOVE_PLAYER_FROM_QUEUE_KEY,
  PLAYERS_QUEUE_CLEAN_SUCCESS_MESSAGE,
  PLAYERS_QUEUE_OFF,
  PLAYERS_QUEUE_OFF_MESSAGE,
  PLAYERS_QUEUE_ON,
  PLAYERS_QUEUE_ON_MESSAGE,
  PLAYERS_QUEUE_SUCCESS_MESSAGE,
  STRING_PARAM,
  TTS_KEY,
  FULL_TTS_ON_KEY,
  FULL_TTS_OFF_KEY,
  FULL_TTS_DISABLED_MESSAGE,
  FULL_TTS_ENABLED_MESSAGE,
  TIMEOUT_KEY,
  TTS_MOD_SENDER,
  LOTTERY_START_COMMAND,
  LOTTERY_CLEAN_COMMAND,
  LOTTERY_REMOVE_COMMAND,
  LOTTERY_PAUSE_COMMAND,
  LOTTERY_RESUME_COMMAND,
  LOTTERY_START_SUCCESS,
  LOTTERY_CLEAN_SUCCESS,
  LOTTERY_REMOVE_SUCCESS,
  LOTTERY_REMOVE_FAIL,
  LOTTERY_PAUSED,
  LOTTERY_RESUMED,
  LOTTERY_NO_USERS,
  LOTTERY_START_WINNER,
  FRIDGE_KEY,
  FRIDGE_JOKE_MESSAGE,
  FRIDGE_JOKE_ERROR_MESSAGE,
} from '../configuration/chat';
import { ActionsType } from './type';
import gameQueue from '../services/GameQueue';
import { delay } from '../utils/system';
import { getUserIdByUsername } from '../services/twitch/user';
import { banUser } from '../services/twitch/mod';

const BROADCAST_USERNAME = process.env.BROADCAST_USERNAME || '';
const PLAYERS_QUEUE_PRIORITY_KEY = [
  'prioritario',
  'prioridad',
  'priority',
];

const LOTTERY_DELAY = 18000;
const LOTTERY_EVENT_USERS_LENGTH = 30;
const DEFAULT_TIMEOUT_SECONDS = 5 * 60;
const MAX_TIMEOUT_SECONDS = 14 * 24 * 60 * 60;

let aiFullTtsEnabled = false;

export const toggleAiFullTts = () => {
  aiFullTtsEnabled = !aiFullTtsEnabled;

  return aiFullTtsEnabled;
};

export const isAiFullTtsEnabled = () => aiFullTtsEnabled;

type TimeoutAction = { duration: number } | { permanent: true };

const parseTimeoutDuration = (duration?: string): TimeoutAction | null => {
  if (!duration) return { duration: DEFAULT_TIMEOUT_SECONDS };
  if (['permanente', 'permanent', 'perm'].includes(duration.trim().toLowerCase())) return { permanent: true };

  const match = duration.trim().toLowerCase().match(/^(\d+)(s|m|h|d)?$/);
  if (!match) return null;

  const amount = Number(match[1]);
  const multiplier = ({ s: 1, m: 60, h: 60 * 60, d: 24 * 60 * 60 } as Record<string, number>)[match[2] || 's'];
  const seconds = amount * multiplier;

  if (seconds <= 0) return null;
  return seconds > MAX_TIMEOUT_SECONDS ? { permanent: true } : { duration: seconds };
};

const changeGameCategory: ActionsType = async ({ chat, value }) => {
  if (!value) {
    chat.say(BROADCAST_USERNAME, CHANNEL_INFO_ACTION_ERROR);
    return;
  }

  const token = await getBroadcastTokens({ avoidLogin: true });
  if (!token || !token.access_token) {
    chat.say(BROADCAST_USERNAME, CHANNEL_INFO_ACTION_ERROR);
    return;
  }

  const [gameNamePart, gameTitle, gameTags] = value.split(COMMAND_DELIMITER);
  const gameName = gameNamePart.trim();
  let gameData: Game | undefined = GAMES[value] || Object.entries(GAMES)
    .find(([key]) => key.toLowerCase() === gameName.toLowerCase())?.[1];

  if (!gameData) {
    try {
      const game = await getGameId(token.access_token, gameName, async () => {
        const newToken = await refreshBroadcastTokens(token.refresh_token);
        return await getGameId(newToken.access_token, gameName);
      });

      if (!game) {
        chat.say(BROADCAST_USERNAME, CHANNEL_INFO_ACTION_GAME_NOT_AVAILABLE);
        return;
      }

      gameData = Object.values(GAMES).find(({ gameId }) => game.id === gameId);

      if (!gameData) {
        const extraTags = gameTags?.trim()
          ? gameTags?.split(' ')
            .filter((currentTag) => currentTag)
            .map((currentTag) => currentTag.trim())
          : [gameName.split(' ').join('')];

        gameData = {
          title: (gameTitle || game.name).trim(),
          gameId: game.id,
          tags: [...BASE_TAGS, ...extraTags],
        };
      }
    } catch {
      chat.say(BROADCAST_USERNAME, CHANNEL_INFO_ACTION_GAME_NOT_AVAILABLE);
      return;
    }
  }

  if (gameData && gameTitle?.trim()) {
    gameData = {
      ...gameData,
      title: gameTitle.trim(),
    };
  }

  try {
    await updateChannelInfo(token.access_token, gameData, async () => {
      const newToken = await refreshBroadcastTokens(token.refresh_token);
      updateChannelInfo(newToken.access_token, gameData);
    });

    chat.say(BROADCAST_USERNAME, CHANNEL_INFO_ACTION_SUCCESS);
  } catch {
    chat.say(BROADCAST_USERNAME, CHANNEL_INFO_ACTION_ERROR);
  }
};
const MOD_ACTIONS: {
  [command: string]: ActionsType;
} = {
  [BAN_KEY]: async ({ chat, value }) => {
    const username = value?.trim();
    if (!username) {
      chat.say(BROADCAST_USERNAME, 'Necesito el usuario al que querés banear.');
      return;
    }

    try {
      const token = await getBotTokens({ avoidLogin: true });
      const userId = token ? await getUserIdByUsername(token.access_token, username) : null;
      if (!token || !userId) {
        chat.say(BROADCAST_USERNAME, `No encontré al usuario ${username}.`);
        return;
      }

      await banUser(token.access_token, userId, { permanent: true });
      chat.say(BROADCAST_USERNAME, `@${username} fue baneado permanentemente.`);
    } catch {
      chat.say(BROADCAST_USERNAME, `No pude banear a @${username}.`);
    }
  },
  [TIMEOUT_KEY]: async ({ chat, value }) => {
    const [username, duration] = value?.trim().split(/\s+/, 2) || [];
    if (!username) {
      chat.say(BROADCAST_USERNAME, 'Necesito el usuario al que querés silenciar.');
      return;
    }

    const durationSeconds = parseTimeoutDuration(duration);
    if (!durationSeconds) {
      chat.say(BROADCAST_USERNAME, 'La duración debe ser válida, por ejemplo 30s, 5m o 1h.');
      return;
    }

    try {
      const token = await getBotTokens({ avoidLogin: true });
      const userId = token ? await getUserIdByUsername(token.access_token, username) : null;
      if (!token || !userId) {
        chat.say(BROADCAST_USERNAME, `No encontré al usuario ${username}.`);
        return;
      }

      await banUser(token.access_token, userId, durationSeconds);
      chat.say(BROADCAST_USERNAME, 'permanent' in durationSeconds
        ? `@${username} fue baneado permanentemente.`
        : `@${username} fue silenciado por ${durationSeconds.duration / 60} minuto(s).`);
    } catch {
      chat.say(BROADCAST_USERNAME, `No pude silenciar a @${username}.`);
    }
  },
  [TTS_KEY]: ({ value, username, ttsUser }) => {
    if (!value) return;

    sendEventTTS(value, ttsUser || username || TTS_MOD_SENDER);
  },
  [FULL_TTS_ON_KEY]: ({ chat }) => {
    if(isAiFullTtsEnabled()) return;

    toggleAiFullTts();
    chat.say(BROADCAST_USERNAME, FULL_TTS_ENABLED_MESSAGE);
  },
  [FULL_TTS_OFF_KEY]: ({ chat }) => {
    if(!isAiFullTtsEnabled()) return;

    toggleAiFullTts();
    chat.say(BROADCAST_USERNAME, FULL_TTS_DISABLED_MESSAGE);
  },
  [ADD_MANUALLY_TO_PLAYERS_QUEUE_KEY]: async ({ chat, value }) =>  {
    if (!value) return;

    const [username, extraValue] = value.split(' ');
    const withPriority = PLAYERS_QUEUE_PRIORITY_KEY.includes(extraValue?.trim()?.toLowerCase());

    gameQueue.joinQueueManually(username.trim(), withPriority);
    const list = gameQueue.getOrderedQueue();
    chat.say(BROADCAST_USERNAME, PLAYERS_QUEUE_SUCCESS_MESSAGE.replace(STRING_PARAM, list));
  },
  [MOVE_PLAYER_FROM_QUEUE_KEY]: async ({ chat, value }) =>  {
    if (!value) return;

    gameQueue.moveToEndFromQueue(value);
    const list = gameQueue.getOrderedQueue();
    chat.say(BROADCAST_USERNAME, PLAYERS_QUEUE_SUCCESS_MESSAGE.replace(STRING_PARAM, list));
  },
  [DELETE_PLAYER_FROM_QUEUE_KEY]: async ({ chat, value }) =>  {
    if (!value) return;

    gameQueue.removeFromQueue(value);
    const list = gameQueue.getOrderedQueue();
    chat.say(BROADCAST_USERNAME, PLAYERS_QUEUE_SUCCESS_MESSAGE.replace(STRING_PARAM, list));
  },
  [CLEAN_PLAYERS_QUEUE_KEY]: async ({ chat }) =>  {
    gameQueue.deleteQueue();
    chat.say(BROADCAST_USERNAME, PLAYERS_QUEUE_CLEAN_SUCCESS_MESSAGE);
  },
  [PLAYERS_QUEUE_ON]: async ({ chat }) =>  {
    gameQueue.resumeJoin();
    chat.say(BROADCAST_USERNAME, PLAYERS_QUEUE_ON_MESSAGE);
  },
  [PLAYERS_QUEUE_OFF]: async ({ chat }) =>  {
    gameQueue.stopJoin();
    chat.say(BROADCAST_USERNAME, PLAYERS_QUEUE_OFF_MESSAGE);
  },
  [MOST_POPULAR_CLIP_KEY]: async ({ chat }) =>  {
    try {
      const token = await getBroadcastTokens({ avoidLogin: true });
      if (!token || !token.access_token) return;

      const clip = await getClipInformation(
        token.access_token,
        '',
        async () => {
          const newToken = await refreshBroadcastTokens(token.refresh_token);
          return await getClipInformation(newToken.access_token);
        },
      );

      if (!clip) throw new Error(CLIP_ACTION_ERROR);

      chat.say(
        BROADCAST_USERNAME,
        CLIP_ACTION_SUCCESS.replace(STRING_PARAM, clip.url),
      );

      sendEventClip(clip.embed_url, clip.duration);
    } catch {
      chat.say(BROADCAST_USERNAME, CLIP_ACTION_ERROR);
    }
  },
  [CHANGE_CHANNEL_INFORMATION_KEY]: changeGameCategory,
  [CHANGE_CHANNEL_INFORMATION_KEY_2]: changeGameCategory,
  [LOTTERY_START_COMMAND]: async ({ chat }) => {
    const winner = lottery.start(() => {
      chat.say(BROADCAST_USERNAME, LOTTERY_PAUSED);
    });

    if (!winner) {
      chat.say(BROADCAST_USERNAME, LOTTERY_NO_USERS);
      return;
    }

    chat.say(BROADCAST_USERNAME, LOTTERY_START_SUCCESS);
    const allUsers = lottery.getList();
    const firstUsers = allUsers.slice(0, LOTTERY_EVENT_USERS_LENGTH);
    if (!firstUsers.includes(winner)) {
      firstUsers.push(winner);
    }
    sendEventLotteryWinner(winner, firstUsers);
    await delay(LOTTERY_DELAY);

    chat.say(BROADCAST_USERNAME, LOTTERY_START_WINNER.replace('__PARAM__', winner));
  },
  [LOTTERY_CLEAN_COMMAND]: ({ chat }) => {
    lottery.clean();
    chat.say(BROADCAST_USERNAME, LOTTERY_CLEAN_SUCCESS);
  },
  [LOTTERY_REMOVE_COMMAND]: ({ chat, value }) => {
    if (!value) return;
    const removed = lottery.remove(value);
    if (removed) {
      chat.say(BROADCAST_USERNAME, LOTTERY_REMOVE_SUCCESS.replace('__PARAM__', value));
    } else {
      chat.say(BROADCAST_USERNAME, LOTTERY_REMOVE_FAIL.replace('__PARAM__', value));
    }
  },
  [LOTTERY_PAUSE_COMMAND]: ({ chat }) => {
    lottery.pause();
    chat.say(BROADCAST_USERNAME, LOTTERY_PAUSED);
  },
  [LOTTERY_RESUME_COMMAND]: ({ chat }) => {
    lottery.resume();
    chat.say(BROADCAST_USERNAME, LOTTERY_RESUMED);
  },
  [FRIDGE_KEY]: ({ chat, value }) => {
    const rawName = (value || '').trim();
    const cleanName = rawName.replace(/^@/, '').trim();

    if (!cleanName) {
      chat.say(BROADCAST_USERNAME, FRIDGE_JOKE_ERROR_MESSAGE);
      return;
    }

    chat.say(BROADCAST_USERNAME, FRIDGE_JOKE_MESSAGE.replace(STRING_PARAM, cleanName));
  },
};

export default MOD_ACTIONS;
