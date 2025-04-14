import tmi from 'tmi.js';

import { revokeVipRequest, storeVipRequest } from '../db/vipdb';
import { getBotTokens, getBroadcastTokens } from '../services/twitch/auth';
import { getUserIdByUsername } from '../services/twitch/user';
import { giveVip } from '../services/twitch/vip';
import logger from '../utils/logger';
import {
  SACRIFICE_ERROR,
  SACRIFICE_REASON,
  SACRIFICE_SUCCESS,
  STRING_PARAM,
  VIP_REQUEST_ACTION_ERROR,
  VIP_REQUEST_ACTION_SUCCESS,
} from '../configuration/chat';
import { banUser } from '../services/twitch/mod';

const BROADCAST_USERNAME = process.env.BROADCAST_USERNAME || '';

export const twoWeeksVipRequest = async (chat: tmi.Client, userName?: string) => {
  if (!userName) return;
  try {
    let vipDone = false;
    let vipStored = false;

    const tokens = await getBroadcastTokens({ avoidLogin: true });
    const userId = tokens
      ? await getUserIdByUsername(tokens.access_token, userName)
      : null;

    try {
      if (!tokens || !userId) throw new Error();

      const expirationTimestamp = Date.now() + 2 * 7 * 24 * 60 * 60 * 1000; // 2 weeks
      await giveVip(tokens.access_token, userId);
      vipDone = true;
      storeVipRequest(BROADCAST_USERNAME, userId, userName, expirationTimestamp);
      vipStored = true;
      const successMessage = VIP_REQUEST_ACTION_SUCCESS
        .replace(STRING_PARAM, userName);
      chat.say(BROADCAST_USERNAME, successMessage);

      logger.info(successMessage);
    } catch {
      if (vipDone && !vipStored && tokens && userId) {
        try {
          await revokeVipRequest(tokens.access_token, userId);
        } catch { /* empty */ }
      }
      const errorMessage = VIP_REQUEST_ACTION_ERROR
        .replace(STRING_PARAM, userName);
      chat.say(BROADCAST_USERNAME, errorMessage);

      logger.error(errorMessage);
    }
  } catch {
    const errorMessage = VIP_REQUEST_ACTION_ERROR
      .replace(STRING_PARAM, userName);
    chat.say(BROADCAST_USERNAME, errorMessage);

    logger.error(errorMessage);
  }
};

const SACRIFICE_TIME_MIN = 2;
export const userSacrifice = async (chat: tmi.Client, userId: string, userName: string) => {
  try {
    const tokens = await getBotTokens({ avoidLogin: true });
    if (!tokens) throw new Error('Failed to retrieve access tokens.');

    await banUser(tokens.access_token, userId, {
      duration: SACRIFICE_TIME_MIN * 60,
      reason: SACRIFICE_REASON,
    });

    chat.say(BROADCAST_USERNAME, SACRIFICE_SUCCESS
      .replace(`${STRING_PARAM}1`, userName)
      .replace(`${STRING_PARAM}2`, `${SACRIFICE_TIME_MIN} minutos`));
    logger.info(SACRIFICE_SUCCESS.replace(STRING_PARAM, userName));
  } catch (error){
    chat.say(BROADCAST_USERNAME, SACRIFICE_ERROR.replace(STRING_PARAM, userName));
    logger.error('error on execute sacrifice');
  }
};
