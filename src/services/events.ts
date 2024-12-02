import WebSocket from 'ws';
import logger from '../utils/logger';
import axios from 'axios';

export type EventCallback = (user: string) => void;

const CLIENT_ID = process.env.CLIENT_ID || '';
const ACCOUNT_TRACK_ID = process.env.ACCOUNT_TRACK_ID || '';
const ACCOUNT_BOT_ID = process.env.ACCOUNT_BOT_ID || '';

const RECONNECTION_TIME = 1000;
const RECONNECTION_RETRIES = 3;
let reconnectionCurrentRetries = 0;

const REGISTER_EVENT_SUBSCRIPTION_URL = 'https://api.twitch.tv/helix/eventsub/subscriptions';
const LIST_EVENT_SUBSCRIPTIONS_URL = 'https://api.twitch.tv/helix/eventsub/subscriptions';

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
        };
      }) =>
        ['channel.follow', 'channel.subscribe'].includes(sub.type) &&
        sub.condition.broadcaster_user_id === ACCOUNT_TRACK_ID &&
        sub.condition.moderator_user_id === ACCOUNT_BOT_ID
    );

    // Eliminar cada suscripción que coincida
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

const registerEventSubSubscription = async (accessToken: string, sessionId: string) => {
  const headers = {
    'Client-ID': CLIENT_ID,
    'Authorization': `Bearer ${accessToken}`,
    'Content-Type': 'application/json'
  };

  const body = {
    type: '',
    version: '',
    condition: {
      broadcaster_user_id: ACCOUNT_TRACK_ID,
      moderator_user_id: ACCOUNT_BOT_ID,
    },
    transport: {
      method: 'websocket',
      session_id: sessionId
    }
  };

  try {
    await Promise.all([
      axios.post(REGISTER_EVENT_SUBSCRIPTION_URL, {
        ...body,
        type: 'channel.follow',
        version: '2',
      }, { headers }),
      axios.post(REGISTER_EVENT_SUBSCRIPTION_URL, {
        ...body,
        type: 'channel.subscribe',
        version: '1',
      }, { headers }),
    ]);
  } catch {
    logger.error('Error on register subscriptions to websocket');
  }
};

const connectToEvents = async (
  accessToken: string,
  onNewFollower: EventCallback,
  onNewSub: EventCallback,
) => {
  await deleteExistingSubscriptions(accessToken);
  const ws = new WebSocket('wss://eventsub.wss.twitch.tv/ws');

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

        await registerEventSubSubscription(accessToken, sessionId);
      }

      if (data.metadata && data.payload?.subscription?.type === 'channel.follow') {
        logger.info('New follower event');
        onNewFollower(data.payload.event.user_name);
      }

      if (data.metadata && data.payload?.subscription?.type === 'channel.subscribe') {
        logger.info('New subscription event');
        onNewSub(data.payload.event.user_name);
      }
    } catch {
      logger.error('Error processing websocket message');
    }
  });

  ws.on('error', () => {
    logger.error('Error in webSocket:');
  });

  ws.on('close', () => {
    setTimeout(() => {
      if (reconnectionCurrentRetries >= RECONNECTION_RETRIES) {
        logger.error('Error connecting websocket');
        return;
      }

      logger.info('Reconnecting websocket...');
      connectToEvents(accessToken, onNewFollower, onNewSub);
      reconnectionCurrentRetries += 1;
    }, RECONNECTION_TIME);
  });
};

export default connectToEvents;
