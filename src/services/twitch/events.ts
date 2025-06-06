import WebSocket from 'ws';
import axios from 'axios';

import logger from '../../utils/logger';
import { getBroadcastTokens } from './auth';
import { BASE_URL } from '../../configuration/constants';
import EVENT_ACTIONS from '../../actions/eventActions';
import TwitchChatService from './TwitchChatService';

export type EventCallback = (principalData?: string, extraData?: any) => void;

const CLIENT_ID = process.env.CLIENT_ID || '';
const BROADCAST_ACCOUNT_ID = process.env.BROADCAST_ACCOUNT_ID || '';

const RECONNECTION_TIME = 1000;
const RECONNECTION_RETRIES = 3;
let reconnectionCurrentRetries = 0;

const REGISTER_EVENT_SUBSCRIPTION_URL = `${BASE_URL}/helix/eventsub/subscriptions`;
const LIST_EVENT_SUBSCRIPTIONS_URL = `${BASE_URL}/helix/eventsub/subscriptions`;
const WEB_SOCKET_URL = 'wss://eventsub.wss.twitch.tv/ws';

const EVENT_SUB_SUBSCRIPTIONS: {
  type: string;
  version: string;
}[] = [{
  type: 'channel.follow',
  version: '2',
}, {
  type: 'channel.subscribe',
  version: '1',
}, {
  type: 'channel.subscription.gift',
  version: '1',
}, {
  type: 'channel.cheer',
  version: '1',
}, {
  type: 'channel.channel_points_custom_reward_redemption.add',
  version: '1',
}, {
  type: 'channel.raid',
  version: '1',
}, {
  type: 'stream.online',
  version: '1',
}, {
  type: 'stream.offline',
  version: '1',
}];

const deleteExistingSubscriptions = async (accessToken: string) => {
  try {
    const response = await axios.get(LIST_EVENT_SUBSCRIPTIONS_URL, {
      headers: {
        'Client-ID': CLIENT_ID,
        'Authorization': `Bearer ${accessToken}`,
      },
    });

    const subscriptions = response.data.data;
    const subscriptionsToDelete = subscriptions.filter(
      (sub: {
        type: string;
        condition: {
          broadcaster_user_id: string;
          moderator_user_id: string;
          to_broadcaster_user_id: string;
        };
      }) =>
        EVENT_SUB_SUBSCRIPTIONS.map(({ type }) => type).includes(sub.type) && (
          sub.condition.broadcaster_user_id === BROADCAST_ACCOUNT_ID ||
          sub.condition.moderator_user_id === BROADCAST_ACCOUNT_ID ||
          sub.condition.to_broadcaster_user_id === BROADCAST_ACCOUNT_ID
        ),
    );

    for (const sub of subscriptionsToDelete) {
      await axios.delete(`${REGISTER_EVENT_SUBSCRIPTION_URL}?id=${sub.id}`, {
        headers: {
          'Client-ID': CLIENT_ID,
          'Authorization': `Bearer ${accessToken}`,
        },
      });
      logger.info(`Deleted subscription with ID: ${sub.id}`);
    }
  } catch {
    logger.error('Error deleting existing subscriptions');
  }
};

const registerEventSubSubscriptions = async (accessToken: string, sessionId: string) => {
  const headers = {
    'Client-ID': CLIENT_ID,
    'Authorization': `Bearer ${accessToken}`,
    'Content-Type': 'application/json',
  };

  const body = {
    type: '',
    version: '',
    condition: {
      to_broadcaster_user_id: BROADCAST_ACCOUNT_ID,
      broadcaster_user_id: BROADCAST_ACCOUNT_ID,
      moderator_user_id: BROADCAST_ACCOUNT_ID,
    },
    transport: {
      method: 'websocket',
      session_id: sessionId
    },
  };

  await Promise.all(EVENT_SUB_SUBSCRIPTIONS.map(async (eventSub) => {
    try {
      await axios.post(REGISTER_EVENT_SUBSCRIPTION_URL, {
        ...body,
        type: eventSub.type,
        version: eventSub.version,
      }, { headers });
    } catch {
      logger.error(`Error on register ${eventSub.type} websocket, try to add bot user as moderator`);
    }
  }));
};

const connectToEvents = async () => {
  try {
    const runHandler = (subscriptionType: string = '', event?: any) => {
      const action = EVENT_ACTIONS[subscriptionType as keyof typeof EVENT_ACTIONS];
      if (!action) return;

      logger.info(subscriptionType);
      action({
        chat: TwitchChatService.chat,
        event,
      });
    };

    const token = await getBroadcastTokens({ avoidLogin: true });
    if (!token) return;

    await deleteExistingSubscriptions(token.access_token);
    const ws = new WebSocket(WEB_SOCKET_URL);

    ws.on('open', () => {
      logger.info('Twitch websocket connected');
    });

    ws.on('message', async (message) => {
      try {
        reconnectionCurrentRetries = 0;
        const data = JSON.parse(message.toString());

        if (data.type === 'PING') ws.send(JSON.stringify({ type: 'PONG' }));

        if (data.metadata && data.metadata.message_type === 'session_welcome') {
          const sessionId = data.payload.session.id;
          logger.info('Session ID received:', sessionId);

          await registerEventSubSubscriptions(token.access_token, sessionId);
        }

        const event = data?.payload?.event;
        runHandler(data.payload?.subscription?.type, event);
      } catch {
        logger.error('Error processing websocket message');
      }
    });

    ws.on('error', () => {
      logger.error('Error in webSocket');
    });

    ws.on('close', async (code) => {
      if (code === 4004) logger.error('Token expired');

      eventsReconnection();
    });
  } catch {
    eventsReconnection();
  }
};

const eventsReconnection = () => {
  setTimeout(() => {
    if (reconnectionCurrentRetries >= RECONNECTION_RETRIES) {
      logger.error('Error connecting websocket');
      return;
    }

    logger.info('Reconnecting websocket...');
    connectToEvents();
    reconnectionCurrentRetries += 1;
  }, RECONNECTION_TIME);
};

export default connectToEvents;
