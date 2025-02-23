import { TTS_KEY, VALORANT_RANDOM_AGENT_ACTION, VALORANT_RANDOM_AGENT_KEY } from '../configuration/chat';
import { ActionsType } from './type';
import MOD_ACTIONS from './modActions';
import { sendEventValorantRandomPicker } from '../services/botEvents';

const BROADCAST_USERNAME = process.env.BROADCAST_USERNAME || '';

const VIP_ACTIONS: {
  [command: string]: ActionsType;
} = {
  [TTS_KEY]: MOD_ACTIONS[TTS_KEY],
  [VALORANT_RANDOM_AGENT_KEY]: ({ chat }) =>  {
    chat.say(BROADCAST_USERNAME, VALORANT_RANDOM_AGENT_ACTION);
    sendEventValorantRandomPicker();
  }
};

export default VIP_ACTIONS;
