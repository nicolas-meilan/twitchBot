import tmi from 'tmi.js';
import logger from '../../utils/logger';
import getTokens from './auth';

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
    const token = await getTokens({ avoidLogin: true });

    if (!token) return;

    logger.info(`Connecting to Twitch chat for channel: ${accountChatUsername}...`);

    const client = new tmi.Client({
      identity: {
        username: botUsername,
        password: `oauth:${token.access_token}`,
      },
      channels: [accountChatUsername],
    });

    // Conectar al chat
    await client.connect();

    logger.info('Successfully connected to Twitch chat.');

    client.on('message', (channel, tags, message, self) => {
      onNewMessage({
        channel,
        tags,
        message,
        self,
      });
    });

    return client;
  } catch(error) {
    logger.error('Error connecting to chat');
    throw error;
  }
};

export default connectToChat;
