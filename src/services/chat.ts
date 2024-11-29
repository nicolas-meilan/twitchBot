import tmi from 'tmi.js';
import logger from '../utils/logger';

export type OnNewMessage = (props: {
    channel: string;
    tags: tmi.ChatUserstate;
    message: string;
}) => void;

const connectToChat = async (
  botUsername: string,
  token: string,
  accountChatUsername: string,
  onNewMessage: OnNewMessage,
) => {
  try {
    logger.info(`Connecting to Twitch chat for channel: ${accountChatUsername}...`);

    const client = new tmi.Client({
      identity: {
        username: botUsername,
        password: `oauth:${token}`,
      },
      channels: [accountChatUsername],
    });

    // Conectar al chat
    await client.connect();

    logger.info('Successfully connected to Twitch chat.');

    client.on('message', (channel, tags, message, self) => {
      if (self) return; // Bot message

      onNewMessage({
        channel,
        tags,
        message,
      });
    });

    return client;
  } catch(error) {
    logger.error('Error connecting to chat');
    throw error;
  }
};

export default connectToChat;
