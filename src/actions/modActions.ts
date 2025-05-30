import { sendEventClip, sendEventTTS } from '../services/botEvents';
import { BASE_TAGS, Game, GAMES } from '../configuration/games';
import { getGameId, updateChannelInfo } from '../services/twitch/channel';
import { getBroadcastTokens, refreshBroadcastTokens } from '../services/twitch/auth';
import { getClipInformation } from '../services/twitch/clip';
import {
  ADD_MANUALLY_TO_PLAYERS_QUEUE_KEY,
  CHANGE_CHANNEL_INFORMATION_KEY,
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
  PLAYERS_QUEUE_SUCCESS_MESSAGE,
  STRING_PARAM,
  TTS_KEY,
  TTS_MOD_SENDER,
} from '../configuration/chat';
import { ActionsType } from './type';
import gameQueue from '../services/GameQueue';

const BROADCAST_USERNAME = process.env.BROADCAST_USERNAME || '';
const PLAYERS_QUEUE_PRIORITY_KEY = [
  'prioritario',
  'prioridad',
  'priority',
];

const MOD_ACTIONS: {
  [command: string]: ActionsType;
} = {
  [TTS_KEY]: ({ value, username }) => {
    if (!value) return;

    sendEventTTS(value, username || TTS_MOD_SENDER);
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
  [CHANGE_CHANNEL_INFORMATION_KEY]: async ({ chat, value }) => {
    if (!value) return;

    const token = await getBroadcastTokens({ avoidLogin: true });
    if (!token || !token.access_token) return;

    let gameData: Game | undefined = GAMES[value];

    if (!gameData) {
      try {
        const [
          gameName,
          gameTitle,
          gameTags,
        ] = value.split(COMMAND_DELIMITER);

        const game = await getGameId(token.access_token, gameName.trim(), async () => {
          const newToken = await refreshBroadcastTokens(token.refresh_token);
          return await getGameId(newToken.access_token, gameName.trim());
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

    try {
      await updateChannelInfo(token.access_token, gameData, async () => {
        const newToken = await refreshBroadcastTokens(token.refresh_token);
        updateChannelInfo(newToken.access_token, gameData);
      });

      chat.say(BROADCAST_USERNAME, CHANNEL_INFO_ACTION_SUCCESS);
    } catch {
      chat.say(BROADCAST_USERNAME, CHANNEL_INFO_ACTION_ERROR);
    }
  },
};

export default MOD_ACTIONS;
