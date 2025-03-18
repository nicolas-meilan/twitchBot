import tmi from 'tmi.js';
import logger from '../../utils/logger';
import { getBotTokens } from './auth';
import { delay } from '../../utils/system';

export type OnNewMessage = (props: {
  channel: string;
  tags: tmi.ChatUserstate;
  message: string;
  self: boolean;
}) => void;

class TwitchChatService {
  public static chat: tmi.Client;

  private static shared = new TwitchChatService();

  private reconnectionRetries = 3;
  private reconnectionTime = 1000;
  private currentRetries = 0;
  private botUsername!: string;
  private accountChatUsername!: string;
  private onNewMessage!: OnNewMessage;

  private constructor() {}

  public static async initialize(
    botUsername: string,
    accountChatUsername: string,
    onNewMessage: OnNewMessage
  ) {
    TwitchChatService.shared.botUsername = botUsername;
    TwitchChatService.shared.accountChatUsername = accountChatUsername;
    TwitchChatService.shared.onNewMessage = onNewMessage;
    await TwitchChatService.shared.connect();
  }

  private async retryConnection() {
    if (this.currentRetries >= this.reconnectionRetries) {
      logger.error('Error connecting chat');
      return;
    }

    await delay(this.reconnectionTime);
    this.currentRetries += 1;
    await this.connect();
  }

  private createProxiedClient(client: tmi.Client): tmi.Client {
    return new Proxy(client, {
      get: (target, prop, receiver) => {
        if (prop === 'say') {
          return async (targetChannel: string, message: string) => {
            try {
              await target.say(targetChannel, message);
            } catch {
              await this.retryConnection();
              try {
                await target.say(targetChannel, message);
              } catch {
                logger.error('Error sending message to chat');
              }
            }
          };
        }
        return Reflect.get(target, prop, receiver);
      },
    });
  }

  private async connect() {
    try {
      const token = await getBotTokens({ avoidLogin: true });

      if (!token) return;

      logger.info(`Connecting to Twitch chat for channel: ${this.accountChatUsername}...`);

      const client = new tmi.Client({
        identity: {
          username: this.botUsername,
          password: `oauth:${token.access_token}`,
        },
        channels: [this.accountChatUsername],
      });

      TwitchChatService.chat = this.createProxiedClient(client);

      await TwitchChatService.chat.connect();

      logger.info('Successfully connected to Twitch chat.');

      TwitchChatService.chat.on('message', (channel, tags, message, self) => {
        this.currentRetries = 0;
        this.onNewMessage({ channel, tags, message, self });
      });

      TwitchChatService.chat.on('disconnected', async () => {
        await this.retryConnection();
      });
    } catch {
      logger.error('Chat error');
    }
  }
}

export default TwitchChatService;
