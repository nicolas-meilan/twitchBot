import tmi from 'tmi.js';

import logger from '../utils/logger';
import Stream from '../Stream';
import { sendEventTTS } from '../services/botEvents';
import {
  TWITCH_POWER_UP_CLIP,
  TWITCH_POWER_UP_MAKE_CLIP,
  TWITCH_POWER_UP_TTS,
} from '../configuration/botEvents';
import {
  BITS_MESSAGE,
  CREATE_CLIP_KEY,
  MOST_POPULAR_CLIP_KEY,
  NEW_FOLLOWER_MESSAGE,
  NEW_SUB_MESSAGE,
  RAID_MESSAGE,
  STRING_PARAM,
} from '../configuration/chat';
import MOD_ACTIONS from './modActions';
import USER_ACTIONS from './userActions';

const BROADCAST_USERNAME = process.env.BROADCAST_USERNAME || '';

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

    if (!username) return;

    const chatMessage = NEW_SUB_MESSAGE.replace(`${STRING_PARAM}1`, username);
    logger.info(chatMessage);
    chat.say(BROADCAST_USERNAME, chatMessage);
  },
  ['channel.raid']: ({ chat, event }) => {
    const username: string = event?.from_broadcaster_user_name;
    const viewers: string = event?.viewers;

    if (!username || !viewers) return;

    const chatMessage = RAID_MESSAGE.replace(`${STRING_PARAM}1`, username)
      .replace(`${STRING_PARAM}2`, viewers);

    logger.info(chatMessage);
    chat.say(BROADCAST_USERNAME, chatMessage);
  },
  ['channel.cheer']: ({ chat, event }) => {
    const username = event?.user_name;
    const bits = event?.bits;

    if (!username || !bits) return;

    const chatMessage = BITS_MESSAGE.replace(`${STRING_PARAM}1`, username)
      .replace(`${STRING_PARAM}2`, bits.toString());

    logger.info(chatMessage);
    chat.say(BROADCAST_USERNAME, chatMessage);
  },
  ['channel.channel_points_custom_reward_redemption.add']: ({ chat, event }) => {
    if (!Stream.shared.isOnline) return;

    const isTTS = event?.reward?.title?.toLowerCase().trim()
      === TWITCH_POWER_UP_TTS.toLowerCase().trim();

    if (isTTS) {
      const userInput = event?.user_input?.trim();
      if (!userInput) return;

      sendEventTTS(userInput, event?.user_name || '');
      return;
    }

    const isClip = event?.reward?.title?.toLowerCase().trim()
      === TWITCH_POWER_UP_CLIP.toLowerCase().trim();

    if (isClip) {
      MOD_ACTIONS[MOST_POPULAR_CLIP_KEY]({ chat });
      return;
    }

    const isMakeClip = event?.reward?.title?.toLowerCase().trim()
      === TWITCH_POWER_UP_MAKE_CLIP.toLowerCase().trim();

    if (isMakeClip) {
      USER_ACTIONS[CREATE_CLIP_KEY]({ chat });
      return;
    }
  },
  ['stream.online']: () => { Stream.shared.isOnline = true; },
  ['stream.offline']: () => { Stream.shared.isOnline = false; },
};

export default EVENT_ACTIONS;