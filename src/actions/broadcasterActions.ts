import { sendEventStartStream } from '../services/botEvents';
import { getBroadcastTokens } from '../services/twitch/auth';
import { Clip, getLatestClips } from '../services/twitch/clip';
import {
  STREAM_START_ALERT_LONG,
  START_ACTION_ERROR,
  START_ACTION_SUCCESS,
  START_STREAM_KEY,
  STRING_PARAM,
} from '../configuration/chat';
import logger from '../utils/logger';
import Stream from '../Stream';
import { BASE_STREAM_START_TIME_MIN } from '../configuration/botEvents';
import { delay } from '../utils/system';
import { ActionsType } from './type';

const BROADCAST_USERNAME = process.env.BROADCAST_USERNAME || '';

const BROADCASTER_ACTIONS: {
  [command: string]: ActionsType;
} = {
  [START_STREAM_KEY]: async ({ chat, value }) => {
    const isOnline = await Stream.shared.fetchStreamOnline();
    if (isOnline) {
      chat.say(BROADCAST_USERNAME, START_ACTION_ERROR);

      return;
    }

    const offlineBackground = Stream.offlineImage;
    let clips: Clip[] = [];

    try {
      const token = await getBroadcastTokens({ avoidLogin: true });
      if (!token?.access_token) return;
      clips = await getLatestClips(token.access_token);
    } catch { /* empty */ }

    const timeToStartMinFromMessage = Number(value?.trim()) || BASE_STREAM_START_TIME_MIN;
    const timeToStartMin = Number.isInteger(timeToStartMinFromMessage)
      ? timeToStartMinFromMessage
      : BASE_STREAM_START_TIME_MIN;

    sendEventStartStream(offlineBackground, clips || [], timeToStartMin);
    const chatMessage = START_ACTION_SUCCESS.replace(STRING_PARAM, timeToStartMin.toString());
    chat.say(BROADCAST_USERNAME, chatMessage);
    logger.info(chatMessage);

    await delay(timeToStartMin * 60 * 1000 * 0.8); // 80% of min to ms

    chat.say(BROADCAST_USERNAME, STREAM_START_ALERT_LONG);
    logger.info(STREAM_START_ALERT_LONG);
  },
};

export default BROADCASTER_ACTIONS;
