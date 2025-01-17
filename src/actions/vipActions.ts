import { TTS_KEY } from '../configuration/chat';
import { ActionsType } from './type';
import MOD_ACTIONS from './modActions';

const VIP_ACTIONS: {
  [command: string]: ActionsType;
} = {
  [TTS_KEY]: MOD_ACTIONS[TTS_KEY],
};

export default VIP_ACTIONS;
