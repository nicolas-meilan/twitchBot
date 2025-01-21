import tmi from 'tmi.js';

import { revokeVipRequest, storeVipRequest } from "../db/vipdb";
import { getBroadcastTokens } from "../services/twitch/auth";
import { getUserIdByUsername } from "../services/twitch/user";
import { giveVip } from "../services/twitch/vip";
import logger from "../utils/logger";
import {
  STRING_PARAM,
  VIP_REQUEST_ACTION_ERROR,
  VIP_REQUEST_ACTION_SUCCESS,
} from "../configuration/chat";

const BROADCAST_USERNAME = process.env.BROADCAST_USERNAME || '';

export const vipRequest = async (chat: tmi.Client, userName?: string) => {
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

      await giveVip(tokens.access_token, userId);
      vipDone = true;
      storeVipRequest(BROADCAST_USERNAME, userId, userName);
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
