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

  private reconnecting = false;
  private reconnectionRetries = 3;
  private reconnectionTime = 10000; // 10 seconds
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
    if (this.reconnecting) return;
    this.reconnecting = true;

    if (this.currentRetries >= this.reconnectionRetries) {
      logger.error('Error connecting chat');
      this.reconnecting = false;
      return;
    }

    await delay(this.reconnectionTime);
    this.currentRetries += 1;
    await this.connect();
    this.reconnecting = false;
  }

  private createProxiedClient(client: tmi.Client): tmi.Client {
    return new Proxy(client, {
      get: (target, prop, receiver) => {
        if (prop === 'disconnect') {
          return Reflect.get(target, prop, receiver);
        }

        const original = Reflect.get(target, prop, receiver);

        if (typeof original === 'function') {
          return async (...args: any[]) => {
            try {
              return await original.apply(target, args);
            } catch (error) {
              if (!TwitchChatService.chat || TwitchChatService.chat?.readyState() === 'CLOSED') {
                await this.retryConnection();
              } else {
                logger.error(`Error in tmi.js client method ${String(prop)}:`, error);
              }
            }
          };
        }

        return original;
      },
    });
  }

  private async connect() {
    try {
      await TwitchChatService.chat?.removeAllListeners();
      await TwitchChatService.chat?.disconnect();

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
        try {
          this.currentRetries = 0;
          this.onNewMessage({ channel, tags, message, self });
        } catch {
          logger.error('Error in message handler:');
        }
      });

      TwitchChatService.chat.on('disconnected', (reason: string) => {
        logger.warn(`Twitch chat disconnected: ${reason}`);
        this.retryConnection();
      });

    } catch {
      logger.error('Chat error');
    }
  }
}

export default TwitchChatService;
