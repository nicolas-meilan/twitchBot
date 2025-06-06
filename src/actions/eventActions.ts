import tmi from 'tmi.js';

import logger from '../utils/logger';
import Stream from '../Stream';
import { sendEventTTS } from '../services/botEvents';
import {
  TWITCH_LOTTERY,
  TWITCH_POWER_UP_CLIP,
  TWITCH_POWER_UP_MAKE_CLIP,
  TWITCH_POWER_UP_TTS,
  TWITCH_POWER_UP_USER_SACRIFICE,
  TWITCH_POWER_UP_VALORANT_RANDOM_PICKER,
  TWITCH_POWER_UP_VIP_REQUEST,
} from '../configuration/botEvents';
import {
  BITS_MESSAGE,
  CREATE_CLIP_KEY,
  MOST_POPULAR_CLIP_KEY,
  NEW_COMMUNITY_GIFT_MESSAGE,
  NEW_FOLLOWER_MESSAGE,
  NEW_GIFT_SUB_MESSAGE,
  NEW_SUB_MESSAGE,
  RAID_FOLLOW_MESSAGE,
  RAID_MESSAGE,
  REWARD_CLAIMED,
  STRING_PARAM,
  VALORANT_RANDOM_AGENT_KEY,
} from '../configuration/chat';
import MOD_ACTIONS from './modActions';
import VIP_ACTIONS from './vipActions';
import USER_ACTIONS from './userActions';
import { joinLottery, twoWeeksVipRequest, userSacrifice } from './powerups';
import { delay } from '../utils/system';

const BROADCAST_USERNAME = process.env.BROADCAST_USERNAME || '';

const RAID_MESSAGES_DELAY = 5000;
const BITS_TTS_DELAY = 5000;
const MIN_BITS_FOR_TTS = 10;

type EventActionsType = (params: {
  chat: tmi.Client
  event?: any;
}) => void | Promise<void>;

const EVENT_ACTIONS: {
  [eventName: string]: EventActionsType;
} = {
  ['channel.follow']: ({ chat, event }) => {
    const newFollower = event?.user_name;
    if (!newFollower) return;

    const chatMessage = NEW_FOLLOWER_MESSAGE.replace(`${STRING_PARAM}1`, newFollower);
    logger.info(chatMessage);
    chat.say(BROADCAST_USERNAME, chatMessage);
  },
  ['channel.subscribe']: ({ chat, event }) => {
    const username = event?.user_name;
    const gifter = event?.gifter_name;
    const giftCount = event?.gift_count || 1;
    const isGift = event?.is_gift && gifter;
    const recipient = event?.recipient_user_name;

    const giftMessage = recipient
      ? NEW_GIFT_SUB_MESSAGE
        .replace(`${STRING_PARAM}1`, gifter)
        .replace(`${STRING_PARAM}2`, recipient)
      : NEW_COMMUNITY_GIFT_MESSAGE
        .replace(`${STRING_PARAM}1`, gifter)
        .replace(`${STRING_PARAM}2`, giftCount.toString());

    const chatMessage = isGift
      ? giftMessage
      : NEW_SUB_MESSAGE.replace(`${STRING_PARAM}1`, username);

    logger.info(chatMessage);
    chat.say(BROADCAST_USERNAME, chatMessage);
  },
  ['channel.subscription.gift']: ({ chat, event }) => {
    const gifter = event?.user_name;
    const giftCount = event?.total || 1;
    const recipient = event?.recipient_user_name;

    if (!gifter) return;

    const chatMessage = recipient
      ? NEW_GIFT_SUB_MESSAGE
        .replace(`${STRING_PARAM}1`, gifter)
        .replace(`${STRING_PARAM}2`, recipient)
      : NEW_COMMUNITY_GIFT_MESSAGE
        .replace(`${STRING_PARAM}1`, gifter)
        .replace(`${STRING_PARAM}2`, giftCount.toString());

    logger.info(chatMessage);
    chat.say(BROADCAST_USERNAME, chatMessage);
  },
  ['channel.raid']: async ({ chat, event }) => {
    const username: string = event?.from_broadcaster_user_name;
    const viewers: string = event?.viewers;

    if (!username || !viewers) return;

    const chatMessage = RAID_MESSAGE.replace(`${STRING_PARAM}1`, username)
      .replace(`${STRING_PARAM}2`, viewers);

    const chatMessage2 = RAID_FOLLOW_MESSAGE
      .replace(STRING_PARAM, username)
      .replace(STRING_PARAM, username);

    logger.info(chatMessage);
    chat.say(BROADCAST_USERNAME, chatMessage);

    await delay(RAID_MESSAGES_DELAY);

    logger.info(chatMessage);
    chat.say(BROADCAST_USERNAME, chatMessage2);
  },
  ['channel.cheer']: async ({ chat, event }) => {
    const username = event?.user_name;
    const userMessage = event?.message?.trim();
    const bits = event?.bits;

    if (!username || !bits) return;

    const chatMessage = BITS_MESSAGE.replace(`${STRING_PARAM}1`, username)
      .replace(`${STRING_PARAM}2`, bits.toString());

    logger.info(chatMessage);
    chat.say(BROADCAST_USERNAME, chatMessage);

    if (userMessage && bits >= MIN_BITS_FOR_TTS) {
      await delay(BITS_TTS_DELAY);
      sendEventTTS(userMessage, username);
    }
  },
  ['channel.channel_points_custom_reward_redemption.add']: async ({ chat, event }) => {
    chat.say(BROADCAST_USERNAME, REWARD_CLAIMED
      .replace(`${STRING_PARAM}1`, event.user_name)
      .replace(`${STRING_PARAM}2`, event.reward.title)
    );

    const is2WeeksVipRequest = event.reward.title.toLowerCase().trim()
      === TWITCH_POWER_UP_VIP_REQUEST.toLowerCase().trim();

    if (is2WeeksVipRequest) {
      await twoWeeksVipRequest(chat, event.user_name);
      return;
    }

    // Power Ups that Needs to be online
    if (!Stream.shared.isOnline) return;

    const isTTS = event.reward.title.toLowerCase().trim()
      === TWITCH_POWER_UP_TTS.toLowerCase().trim();

    if (isTTS) {
      const userInput = event.user_input?.trim();
      if (!userInput) return;

      sendEventTTS(userInput, event.user_name);
      return;
    }

    const isClip = event.reward.title.toLowerCase().trim()
      === TWITCH_POWER_UP_CLIP.toLowerCase().trim();

    if (isClip) {
      MOD_ACTIONS[MOST_POPULAR_CLIP_KEY]({ chat });
      return;
    }

    const isMakeClip = event.reward.title.toLowerCase().trim()
      === TWITCH_POWER_UP_MAKE_CLIP.toLowerCase().trim();

    if (isMakeClip) {
      USER_ACTIONS[CREATE_CLIP_KEY]({ chat });
      return;
    }

    const isValorantRandomPicker = event.reward.title.toLowerCase().trim()
      === TWITCH_POWER_UP_VALORANT_RANDOM_PICKER.toLowerCase().trim();

    if (isValorantRandomPicker) {
      VIP_ACTIONS[VALORANT_RANDOM_AGENT_KEY]({ chat });
      return;
    }

    const isUserSacrifice = event.reward.title.toLowerCase().trim()
      === TWITCH_POWER_UP_USER_SACRIFICE.toLowerCase().trim();

    if (isUserSacrifice) {
      await userSacrifice(chat, event.user_id, event.user_name);
      return;
    }

    const isLottery = event.reward.title.toLowerCase().trim()
      === TWITCH_LOTTERY.toLowerCase().trim();

    if (isLottery) {
      joinLottery(chat, event.user_name);
      return;
    }
  },
  ['stream.online']: () => { Stream.shared.isOnline = true; },
  ['stream.offline']: () => { Stream.shared.isOnline = false; },
};

export default EVENT_ACTIONS;
