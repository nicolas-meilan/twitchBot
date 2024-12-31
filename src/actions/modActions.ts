import tmi from 'tmi.js';

import { sendEventClip, sendEventTTS } from '../services/botEvents';
import { BASE_TAGS, Game, GAMES } from '../configuration/games';
import { getGameId, updateChannelInfo } from '../services/twitch/channel';
import getTokens, { refreshTokens } from '../services/twitch/auth';
import { createClip, getClipInformation } from '../services/twitch/clip';
import Stream from '../Stream';
import {
  CHANGE_CHANNEL_INFORMATION_KEY,
  CHANNEL_INFO_ACTION_ERROR,
  CHANNEL_INFO_ACTION_GAME_NOT_AVAILABLE,
  CHANNEL_INFO_ACTION_SUCCESS,
  CLIP_ACTION_ERROR,
  CLIP_ACTION_SUCCESS,
  CLIP_ACTION_SUCCESS_EDIT_AVAILABLE,
  COMMAND_DELIMITER,
  CREATE_CLIP_KEY,
  MOST_POPULAR_CLIP_KEY,
  STRING_PARAM,
  TTS_KEY,
  TTS_MOD_SENDER,
} from '../configuration/chat';

type ModActionsType = (params: {
  chat: tmi.Client
  value?: string;
  username?: string;
}) => void | Promise<void>;

const ACCOUNT_CHAT_USERNAME = process.env.ACCOUNT_CHAT_USERNAME || '';

const MOD_ACTIONS: {
  [command: string]: ModActionsType;
} = {
  [TTS_KEY]: ({ value, username }) => {
    if (!value) return;

    sendEventTTS(value, username || TTS_MOD_SENDER);
  },
  [MOST_POPULAR_CLIP_KEY]: async ({ chat }) =>  {
    try {
      const token = await getTokens({ avoidLogin: true });
      if (!token || !token.access_token) return;

      const clip = await getClipInformation(
        token.access_token,
        '',
        async () => {
          const newToken = await refreshTokens(token.refresh_token);
          return await getClipInformation(newToken.access_token);
        },
      );

      if (!clip) throw new Error(CLIP_ACTION_ERROR);

      chat.say(
        ACCOUNT_CHAT_USERNAME,
        CLIP_ACTION_SUCCESS.replace(STRING_PARAM, clip.url),
      );

      sendEventClip(clip.embed_url, clip.duration);
    } catch {
      chat.say(ACCOUNT_CHAT_USERNAME, CLIP_ACTION_ERROR);
    }
  },
  [CREATE_CLIP_KEY]: async ({ chat }) => {
    try {
      if (!Stream.shared.isOnline) throw new Error('offline');

      const token = await getTokens({ avoidLogin: true });
      if (!token || !token.access_token) return;

      const clip = await createClip(
        token.access_token,
        false,
        async () => {
          const newToken = await refreshTokens(token.refresh_token);
          return await createClip(newToken.access_token);
        },
      );

      if (!clip) throw new Error(CLIP_ACTION_ERROR);

      const message = clip.edit_url
        ? CLIP_ACTION_SUCCESS_EDIT_AVAILABLE
          .replace(`${STRING_PARAM}1`, clip.url)
          .replace(`${STRING_PARAM}2`, clip.edit_url || '')
        : CLIP_ACTION_SUCCESS
          .replace(STRING_PARAM, clip.url);

      chat.say(ACCOUNT_CHAT_USERNAME, message);

      sendEventClip(clip.embed_url, clip.duration);
    } catch {
      chat.say(ACCOUNT_CHAT_USERNAME, CLIP_ACTION_ERROR);
    }
  },
  [CHANGE_CHANNEL_INFORMATION_KEY]: async ({ chat, value }) => {
    if (!value) return;

    const token = await getTokens({ avoidLogin: true });
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
          const newToken = await refreshTokens(token.refresh_token);
          return await getGameId(newToken.access_token, gameName.trim());
        });

        if (!game) {
          chat.say(ACCOUNT_CHAT_USERNAME, CHANNEL_INFO_ACTION_GAME_NOT_AVAILABLE);
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
        chat.say(ACCOUNT_CHAT_USERNAME, CHANNEL_INFO_ACTION_GAME_NOT_AVAILABLE);
        return;
      }
    }

    try {
      await updateChannelInfo(token.access_token, gameData, async () => {
        const newToken = await refreshTokens(token.refresh_token);
        updateChannelInfo(newToken.access_token, gameData);
      });

      chat.say(ACCOUNT_CHAT_USERNAME, CHANNEL_INFO_ACTION_SUCCESS);
    } catch {
      chat.say(ACCOUNT_CHAT_USERNAME, CHANNEL_INFO_ACTION_ERROR);
    }
  },
};

export default MOD_ACTIONS;
