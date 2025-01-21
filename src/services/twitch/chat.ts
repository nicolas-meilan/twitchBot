import tmi from 'tmi.js';
import logger from '../../utils/logger';
import { getBotTokens } from './auth';

const RECONNECTION_RETRIES = 3;
let reconnectionCurrentRetries = 0;

export type OnNewMessage = (props: {
    channel: string;
    tags: tmi.ChatUserstate;
    message: string;
    self: boolean;
}) => void;

const connectToChat = async (
  botUsername: string,
  accountChatUsername: string,
  onNewMessage: OnNewMessage,
) => {
  try {
    const token = await getBotTokens({ avoidLogin: true });

    if (!token) return;

    logger.info(`Connecting to Twitch chat for channel: ${accountChatUsername}...`);

    const client = new tmi.Client({
      identity: {
        username: botUsername,
        password: `oauth:${token.access_token}`,
      },
      channels: [accountChatUsername],
    });

    await client.connect();

    logger.info('Successfully connected to Twitch chat.');

    client.on('message', (channel, tags, message, self) => {
      reconnectionCurrentRetries = 0;
      onNewMessage({
        channel,
        tags,
        message,
        self,
      });
    });

    client.on('disconnected', async () => {
      if (reconnectionCurrentRetries >= RECONNECTION_RETRIES) {
        logger.error('Error connecting chat');
        return;
      }

      reconnectionCurrentRetries += 1;
      await connectToChat(botUsername, accountChatUsername, onNewMessage);
    });

    return client;
  } catch {
    if (reconnectionCurrentRetries >= RECONNECTION_RETRIES) {
      logger.error('Error connecting to chat');
      return;
    }

    reconnectionCurrentRetries += 1;
    await connectToChat(botUsername, accountChatUsername, onNewMessage);
  }
};

export default connectToChat;
