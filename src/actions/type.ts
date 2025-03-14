import tmi from 'tmi.js';

export type ActionsType = (params: {
  chat: tmi.Client
  value?: string;
  username?: string;
  tags?: tmi.ChatUserstate;
}) => void | Promise<void>;
