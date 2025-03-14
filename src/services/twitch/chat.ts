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

function createProxiedClient(client: tmi.Client): tmi.Client {
  return new Proxy(client, {
    get(target, prop, receiver) {
      if (prop === 'say') {
        return async function(targetChannel: string, message: string) {
          try {
            await target.say(targetChannel, message);
            return;
          } catch {
            logger.error(`Error sending message`);
          }
        };
      }
      return Reflect.get(target, prop, receiver);
    }
  });
}

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

    const proxiedClient = createProxiedClient(client);

    await proxiedClient.connect();

    logger.info('Successfully connected to Twitch chat.');

    proxiedClient.on('message', (channel, tags, message, self) => {
      reconnectionCurrentRetries = 0;
      onNewMessage({
        channel,
        tags,
        message,
        self,
      });
    });

    proxiedClient.on('disconnected', async () => {
      try {
        if (reconnectionCurrentRetries >= RECONNECTION_RETRIES) {
          logger.error('Error connecting chat');
          return;
        }

        reconnectionCurrentRetries += 1;
        await connectToChat(botUsername, accountChatUsername, onNewMessage);
      } catch {
        logger.error('Unexpected error on reconnection attempt');
      }
    });

    return proxiedClient;
  } catch {
    logger.error('Chat error');
  }
};

export default connectToChat;
