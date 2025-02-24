import WebSocket, { WebSocketServer } from 'ws';
import logger from '../utils/logger';
import {
  BASE_STREAM_START_TIME_MIN,
  BOT_EVENT_CLIP,
  BOT_EVENT_PASSWORD,
  BOT_EVENT_TTS,
  BOT_EVENT_WRONG_PASSWORD,
  START_STREAM_EVENT,
  TTS_MAX_CHARACTERS,
  VALORANT_RANDOM_PICKER_EVENT,
} from '../configuration/botEvents';
import { STRING_PARAM, TTS_MESSAGE } from '../configuration/chat';
import { Clip } from './twitch/clip';

const BOT_EVENTS_PASSWORD = process.env.BOT_EVENTS_PASSWORD || '';
const BOT_EVENTS_PORT = process.env.BOT_EVENTS_PORT || '';

const MAX_RETRIES = 5;
const RETRIES_TIME = 5000;

let activeSocket: WebSocket | null = null;
let retryCount = 0;

function startWebSocketServer() {
  try {
    const wss = new WebSocketServer({ port: Number(BOT_EVENTS_PORT) });
    logger.info(`WebSocket server started on port ${BOT_EVENTS_PORT}`);

    wss.on('connection', (ws) => {
      logger.info('New connection established.');

      ws.send(JSON.stringify({ type: BOT_EVENT_PASSWORD }));

      ws.on('message', (data) => {
        try {
          retryCount = 0;
          const message = data.toString('utf8');
          if (message === BOT_EVENTS_PASSWORD) {
            logger.info('Correct password. Storing WebSocket connection.');
            activeSocket = ws;
          } else {
            logger.error('Incorrect password. Disconnecting.');
            ws.send(JSON.stringify({ type: BOT_EVENT_WRONG_PASSWORD }));
            ws.close();
          }
        } catch (error) {
          logger.error('Error processing message:', error);
        }
      });

      ws.on('close', () => {
        logger.info('Connection closed.');
        if (ws === activeSocket) {
          activeSocket = null;
        }
      });

      ws.on('error', (err) => {
        logger.error('WebSocket error:', err);
      });
    });
  } catch {
    logger.error('WebSocket server error:');
    if (retryCount < MAX_RETRIES) {
      retryCount++;
      logger.info(`Retrying to start WebSocket server... Attempt ${retryCount}/${MAX_RETRIES}`);
      setTimeout(startWebSocketServer, RETRIES_TIME);
    } else {
      logger.error('Max retries reached. WebSocket server failed to start.');
    }
  }
}

startWebSocketServer();

const webSocketErrorHandler = <T extends Array<unknown>>(callback: (...args: T) => Promise<void>) => async (...args: T): Promise<void> => {
  try {
    await callback(...args);
  } catch {
    logger.error('WebSocket Error');
    startWebSocketServer();
  }
};

export const sendEventTTS = webSocketErrorHandler<[
  message: string,
  user?: string,
]>(async (message, user) => {
  logger.info('Sending TTS event ...');
  if (activeSocket && activeSocket.readyState === WebSocket.OPEN) {
    const parsedMessage = user
      ? TTS_MESSAGE.replace(`${STRING_PARAM}1`, user).replace(`${STRING_PARAM}2`, message)
      : message;

    const payload = { type: BOT_EVENT_TTS, message: parsedMessage.substring(0, TTS_MAX_CHARACTERS) };
    activeSocket.send(JSON.stringify(payload));
    logger.info('TTS message sent:', JSON.stringify(payload));
  } else {
    logger.error('No active WebSocket connection. Message not sent.');
  }
});

export const sendEventClip = webSocketErrorHandler<[
  url: string,
  duration?: string,
]>(async (url, duration = '0') => {
  logger.info('Sending CLIP event ...');
  if (activeSocket && activeSocket.readyState === WebSocket.OPEN) {

    const payload = { type: BOT_EVENT_CLIP, url, duration };
    activeSocket.send(JSON.stringify(payload));
    logger.info('CLIP message sent:', JSON.stringify(payload));
  } else {
    logger.error('No active WebSocket connection. Message not sent.');
  }
});

export const sendEventStartStream = webSocketErrorHandler<[
  background: string,
  clips: Clip[],
  startTimeMin?: number,
]>(async (background, clips, startTimeMin = BASE_STREAM_START_TIME_MIN) => {
  logger.info('Sending START_STREAM event ...');
  if (activeSocket && activeSocket.readyState === WebSocket.OPEN) {

    const payload = {
      type: START_STREAM_EVENT,
      background,
      clips,
      startTimeMin,
    };
    activeSocket.send(JSON.stringify(payload));
    logger.info('START_STREAM message sent:', JSON.stringify(payload));
  } else {
    logger.error('No active WebSocket connection. Message not sent.');
  }
});

export const sendEventValorantRandomPicker = webSocketErrorHandler<[]>(async () => {
  logger.info('Sending VALORANT_RANDOM_PICKER_EVENT event ...');
  if (activeSocket && activeSocket.readyState === WebSocket.OPEN) {

    const payload = { type: VALORANT_RANDOM_PICKER_EVENT };
    activeSocket.send(JSON.stringify(payload));
    logger.info('VALORANT_RANDOM_PICKER_EVENT message sent');
  } else {
    logger.error('No active WebSocket connection. Message not sent.');
  }
});

export default activeSocket;
