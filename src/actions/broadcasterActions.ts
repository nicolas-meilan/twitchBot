import tmi from 'tmi.js';

import { sendEventStartStream } from '../services/botEvents';
import getTokens, { refreshTokens } from '../services/twitch/auth';
import { Clip, getClipsFromNow } from '../services/twitch/clip';
import {
  START_70_PERCENT,
  START_ACTION_ERROR,
  START_ACTION_SUCCESS,
  START_STREAM_KEY,
  STRING_PARAM,
} from '../configuration/chat';
import logger from '../utils/logger';
import Stream from '../Stream';
import { BASE_STREAM_START_TIME_MIN } from '../configuration/botEvents';
import { delay } from '../utils/system';

type BroadcasterActionsType = (params: {
  chat: tmi.Client
  value?: string;
}) => void | Promise<void>;

const ACCOUNT_CHAT_USERNAME = process.env.ACCOUNT_CHAT_USERNAME || '';

const BROADCASTER_ACTIONS: {
  [command: string]: BroadcasterActionsType;
} = {
  [START_STREAM_KEY]: async ({ chat, value }) => {
    if (Stream.shared.isOnline) {
      chat.say(ACCOUNT_CHAT_USERNAME, START_ACTION_ERROR);

      return;
    }

    const offlineBackground = Stream.offlineImage;
    let clips: Clip[] = [];

    try {
      const token = await getTokens({ avoidLogin: true });
      if (!token?.access_token) return;
      clips = await getClipsFromNow(token.access_token, async () => {
        const newTokens = await refreshTokens(token.refresh_token);

        return await getClipsFromNow(newTokens.refresh_token);
      });
    } catch { /* empty */ }

    const timeToStartMinFromMessage = Number(value?.trim()) || BASE_STREAM_START_TIME_MIN;
    const timeToStartMin = Number.isInteger(timeToStartMinFromMessage)
      ? timeToStartMinFromMessage
      : BASE_STREAM_START_TIME_MIN;

    sendEventStartStream(offlineBackground, clips || [], timeToStartMin);
    const chatMessage = START_ACTION_SUCCESS.replace(STRING_PARAM, timeToStartMin.toString());
    chat.say(ACCOUNT_CHAT_USERNAME, chatMessage);
    logger.info(chatMessage);

    await delay(timeToStartMin * 60 * 1000 * 0.7); // 70% of min to ms

    chat.say(ACCOUNT_CHAT_USERNAME, START_70_PERCENT);
    logger.info(START_70_PERCENT);
  },
};

export default BROADCASTER_ACTIONS;
