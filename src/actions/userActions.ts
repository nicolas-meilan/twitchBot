import { sendEventClip } from '../services/botEvents';
import {
  getBotTokens,
  refreshBotTokens,
} from '../services/twitch/auth';
import { createClip } from '../services/twitch/clip';
import Stream from '../Stream';
import {
  ADD_TO_PLAYERS_QUEUE_KEY,
  ADD_TO_PLAYERS_QUEUE_KEY_ALIAS,
  CLIP_ACTION_ERROR,
  CLIP_ACTION_SUCCESS,
  CLIP_ACTION_SUCCESS_EDIT_AVAILABLE,
  CREATE_CLIP_KEY,
  LEAVE_PLAYERS_QUEUE_KEY,
  PLAYERS_QUEUE_SUCCESS_MESSAGE,
  PROCESSING_CLIP_ERROR,
  STRING_PARAM,
} from '../configuration/chat';
import { ActionsType } from './type';
import { getOrderedQueue, joinQueue, removeFromQueue } from '../services/gameQueue';

const BROADCAST_USERNAME = process.env.BROADCAST_USERNAME || '';

const CLIP_AWAITING_TIME = 15000;
let processingClip = false;

const USER_ACTIONS: {
  [command: string]: ActionsType;
} = {
  [ADD_TO_PLAYERS_QUEUE_KEY]: ({ chat, username, tags }) => {
    if (!username || !tags) return;

    joinQueue({
      username,
      isMod: !!tags.mod,
      isVIP: !!tags.badges?.vip,
      isSub: !!tags.subscriber,
      isFollower: true,
    });

    const list = getOrderedQueue();
    chat.say(BROADCAST_USERNAME, PLAYERS_QUEUE_SUCCESS_MESSAGE.replace(STRING_PARAM, list));
  },
  [ADD_TO_PLAYERS_QUEUE_KEY_ALIAS]: ({ chat, username, tags }) => {
    USER_ACTIONS[ADD_TO_PLAYERS_QUEUE_KEY]({ chat, username, tags });
  },
  [LEAVE_PLAYERS_QUEUE_KEY]: ({ chat, username }) => {
    if (!username) return;

    removeFromQueue(username);
    const list = getOrderedQueue();
    chat.say(BROADCAST_USERNAME, PLAYERS_QUEUE_SUCCESS_MESSAGE.replace(STRING_PARAM, list));
  },
  [CREATE_CLIP_KEY]: async ({ chat }) => {
    try {
      const isOnline = await Stream.shared.fetchStreamOnline();

      if (!isOnline) throw new Error('offline');

      if (processingClip) {
        chat.say(BROADCAST_USERNAME, PROCESSING_CLIP_ERROR);
        return;
      }
      processingClip = true;

      const token = await getBotTokens({ avoidLogin: true });
      if (!token || !token.access_token) return;

      const clip = await createClip(
        token.access_token,
        false,
        async () => {
          const newToken = await refreshBotTokens(token.refresh_token);
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

      chat.say(BROADCAST_USERNAME, message);

      sendEventClip(clip.embed_url, clip.duration);
      setTimeout(() => processingClip = false, CLIP_AWAITING_TIME);
    } catch {
      chat.say(BROADCAST_USERNAME, CLIP_ACTION_ERROR);
      processingClip = false;
    }
  },
};

export default USER_ACTIONS;
