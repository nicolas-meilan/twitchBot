import { sendEventStartStream } from '../services/botEvents';
import {
  STREAM_START_ALERT_LONG,
  START_ACTION_ERROR,
  START_ACTION_SUCCESS,
  START_STREAM_KEY,
  STRING_PARAM,
  VIP_KEY,
  AI_EXTERNAL_INFORMATION_DISABLED_MESSAGE,
  AI_EXTERNAL_INFORMATION_ENABLED_MESSAGE,
  AI_EXTERNAL_INFORMATION_OFF_KEY,
  AI_EXTERNAL_INFORMATION_ON_KEY,
} from '../configuration/chat';
import logger from '../utils/logger';
import Stream from '../Stream';
import { BASE_STREAM_START_TIME_MIN } from '../configuration/botEvents';
import { delay } from '../utils/system';
import { ActionsType } from './type';
import { twoWeeksVipRequest } from './powerups';
import { setAiExternalInformationEnabled } from '../services/aiService/aiConfig';

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

    const timeToStartMinFromMessage = Number(value?.trim()) || BASE_STREAM_START_TIME_MIN;
    const timeToStartMin = Number.isInteger(timeToStartMinFromMessage)
      ? timeToStartMinFromMessage
      : BASE_STREAM_START_TIME_MIN;

    sendEventStartStream(timeToStartMin);
    const chatMessage = START_ACTION_SUCCESS.replace(STRING_PARAM, timeToStartMin.toString());
    chat.say(BROADCAST_USERNAME, chatMessage);
    logger.info(chatMessage);

    await delay(timeToStartMin * 60 * 1000 * 0.8); // 80% of min to ms

    chat.say(BROADCAST_USERNAME, STREAM_START_ALERT_LONG);
    logger.info(STREAM_START_ALERT_LONG);
  },
  [VIP_KEY]: async ({ chat, value }) => {
    if (!value) return;

    await twoWeeksVipRequest(chat, value?.trim());
  },
  [AI_EXTERNAL_INFORMATION_ON_KEY]: async ({ chat }) => {
    setAiExternalInformationEnabled(true);
    chat.say(BROADCAST_USERNAME, AI_EXTERNAL_INFORMATION_ENABLED_MESSAGE);
  },
  [AI_EXTERNAL_INFORMATION_OFF_KEY]: async ({ chat }) => {
    setAiExternalInformationEnabled(false);
    chat.say(BROADCAST_USERNAME, AI_EXTERNAL_INFORMATION_DISABLED_MESSAGE);
  },
};

export default BROADCASTER_ACTIONS;
