import { sendEventStartStream } from '../services/botEvents';
import {
  ADD_COMMAND_KEY,
  REMOVE_COMMAND_KEY,
  STREAM_START_ALERT_LONG,
  START_ACTION_ERROR,
  START_ACTION_SUCCESS,
  START_STREAM_KEY,
  STRING_PARAM,
  VIP_KEY,
  AI_EXTERNAL_INFORMATION_DISABLED_MESSAGE,
  AI_EXTERNAL_INFORMATION_ENABLED_MESSAGE,
  AI_EXTERNAL_INFORMATION_OFF_KEY,
  AI_EXTERNAL_INFORMATION_ON_KEY,
} from '../configuration/chat';
import logger from '../utils/logger';
import Stream from '../Stream';
import { BASE_STREAM_START_TIME_MIN } from '../configuration/botEvents';
import { delay } from '../utils/system';
import { ActionsType } from './type';
import { twoWeeksVipRequest } from './powerups';
import { setAiExternalInformationEnabled } from '../services/aiService/aiConfig';
import { getCommandHelp } from '../configuration/commandDescriptions';
import {
  addChatCommand,
  ChatCommandError,
  getConfiguredChatCommandOwnerTwitchId,
  removeChatCommand,
} from '../db/chatCommands';

const BROADCAST_USERNAME = process.env.BROADCAST_USERNAME || '';

const BROADCASTER_ACTIONS: {
  [command: string]: ActionsType;
} = {
  [START_STREAM_KEY]: async ({ chat, value }) => {
    const isOnline = await Stream.shared.fetchStreamOnline();
    if (isOnline) {
      chat.say(BROADCAST_USERNAME, START_ACTION_ERROR);

      return;
    }

    const timeToStartMinFromMessage = Number(value?.trim()) || BASE_STREAM_START_TIME_MIN;
    const timeToStartMin = Number.isInteger(timeToStartMinFromMessage)
      ? timeToStartMinFromMessage
      : BASE_STREAM_START_TIME_MIN;

    sendEventStartStream(timeToStartMin);
    const chatMessage = START_ACTION_SUCCESS.replace(STRING_PARAM, timeToStartMin.toString());
    chat.say(BROADCAST_USERNAME, chatMessage);
    logger.info(chatMessage);

    await delay(timeToStartMin * 60 * 1000 * 0.8); // 80% of min to ms

    chat.say(BROADCAST_USERNAME, STREAM_START_ALERT_LONG);
    logger.info(STREAM_START_ALERT_LONG);
  },
  [VIP_KEY]: async ({ chat, value }) => {
    if (!value) return;

    await twoWeeksVipRequest(chat, value?.trim());
  },
  [AI_EXTERNAL_INFORMATION_ON_KEY]: async ({ chat }) => {
    setAiExternalInformationEnabled(true);
    chat.say(BROADCAST_USERNAME, AI_EXTERNAL_INFORMATION_ENABLED_MESSAGE);
  },
  [AI_EXTERNAL_INFORMATION_OFF_KEY]: async ({ chat }) => {
    setAiExternalInformationEnabled(false);
    chat.say(BROADCAST_USERNAME, AI_EXTERNAL_INFORMATION_DISABLED_MESSAGE);
  },
  [ADD_COMMAND_KEY]: async ({ chat, value }) => {
    const commandValue = value || '';
    const separatorIndex = commandValue.indexOf('/');
    const descriptionSeparator = ' /description:';
    const descriptionSeparatorIndex = commandValue.lastIndexOf(descriptionSeparator);
    if (separatorIndex < 0 || descriptionSeparatorIndex < 0) {
      chat.say(BROADCAST_USERNAME, getCommandHelp(ADD_COMMAND_KEY));
      return;
    }

    const aliases = commandValue.slice(0, separatorIndex).trim().split(/\s+/).filter(Boolean);
    const response = commandValue.slice(separatorIndex + 1, descriptionSeparatorIndex).trim();
    const description = commandValue.slice(descriptionSeparatorIndex + descriptionSeparator.length).trim();

    try {
      const command = await addChatCommand(
        getConfiguredChatCommandOwnerTwitchId(),
        BROADCAST_USERNAME,
        aliases,
        response,
        description,
      );
      chat.say(BROADCAST_USERNAME, `Comando agregado: ${command.aliases.map((alias) => `!${alias}`).join(' ')}`);
    } catch (error) {
      if (error instanceof ChatCommandError) {
        chat.say(BROADCAST_USERNAME, error.message);
        return;
      }

      logger.error('Failed to add chat command:', error);
      chat.say(BROADCAST_USERNAME, 'No pude guardar el comando por un error interno.');
    }
  },
  [REMOVE_COMMAND_KEY]: async ({ chat, value }) => {
    const aliases = (value || '').trim().split(/\s+/).filter(Boolean);
    if (aliases.length !== 1) {
      chat.say(BROADCAST_USERNAME, getCommandHelp(REMOVE_COMMAND_KEY));
      return;
    }

    try {
      const removed = await removeChatCommand(
        getConfiguredChatCommandOwnerTwitchId(),
        aliases[0],
      );
      if (!removed) {
        chat.say(BROADCAST_USERNAME, `No encontré el alias ${aliases[0]}.`);
        return;
      }

      const displayedAlias = `!${removed.alias}`;
      const result = removed.valueDeleted
        ? `Alias eliminado: ${displayedAlias}. También eliminé su respuesta porque no tenía otros alias.`
        : `Alias eliminado: ${displayedAlias}. La respuesta se conserva porque todavía tiene otros alias.`;
      chat.say(BROADCAST_USERNAME, result);
    } catch (error) {
      if (error instanceof ChatCommandError) {
        chat.say(BROADCAST_USERNAME, error.message);
        return;
      }

      logger.error('Failed to remove chat command alias:', error);
      chat.say(BROADCAST_USERNAME, 'No pude eliminar el alias por un error interno.');
    }
  },
};

export default BROADCASTER_ACTIONS;
