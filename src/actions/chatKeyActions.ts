import { fetchJokes } from "../services/jokes";
import { fetchCurrentRank } from "../services/valorant";

import {
  COMMANDS_RESPONSE_KEY,
  COMMANDS_SEPARATOR,
  JOKES_KEY,
  MESSAGES_CONFIG,
  MOD_COMMANDS_RESPONSE_KEY,
  MODS_ACTIONS_CONFIG,
  PLAYERS_KEY,
  USERS_ACTIONS_CONFIG,
  VALORANT_LAST_RANKED_RESPONSE_KEY,
  VALORANT_RANK_RESPONSE_KEY,
  VIP_ACTIONS_CONFIG,
  VIP_COMMANDS_RESPONSE_KEY,
} from "../configuration/chat";
import gameQueue from "../services/GameQueue";

type ChatKeyActionsType = () => string | Promise<string>;

const CHAT_KEY_ACTIONS: {
  [command: string]: ChatKeyActionsType
} = {
  [VALORANT_RANK_RESPONSE_KEY]: async () => {
    const valorantInfo = await fetchCurrentRank();

    return valorantInfo.currenttierpatched;
  },
  [VALORANT_LAST_RANKED_RESPONSE_KEY]: async () => {
    const valorantInfo = await fetchCurrentRank();

    const isPositive = valorantInfo.mmr_change_to_last_game >= 0;
    return `${isPositive
      ? '🎉 Ahora sí, RungeKutta93 Ganó'
      : '💔 Uh, RungeKutta93 perdió'} ${Math.abs(valorantInfo.mmr_change_to_last_game)} puntos ${isPositive
      ? '🏆'
      : '😭'}`;
  },
  [JOKES_KEY]: fetchJokes,
  [COMMANDS_RESPONSE_KEY]: async () => [
    ...Object.keys(MESSAGES_CONFIG),
    ...USERS_ACTIONS_CONFIG,
  ].sort().join(COMMANDS_SEPARATOR),
  [PLAYERS_KEY]: () => gameQueue.getOrderedQueue(),
  [MOD_COMMANDS_RESPONSE_KEY]: async () => MODS_ACTIONS_CONFIG.sort().join(COMMANDS_SEPARATOR),
  [VIP_COMMANDS_RESPONSE_KEY]: async () => VIP_ACTIONS_CONFIG.sort().join(COMMANDS_SEPARATOR),
};

export default CHAT_KEY_ACTIONS;
