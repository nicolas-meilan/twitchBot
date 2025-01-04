import tmi from 'tmi.js';

export type ActionsType = (params: {
  chat: tmi.Client
  value?: string;
  username?: string;
}) => void | Promise<void>;
