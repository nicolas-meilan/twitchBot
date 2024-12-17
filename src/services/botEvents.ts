import WebSocket, { WebSocketServer } from 'ws';
import logger from '../utils/logger';
import {
  BOT_EVENT_PASSWORD,
  BOT_EVENT_TTS,
  BOT_EVENT_WRONG_PASSWORD,
  TTS_MAX_CHARACTERS,
} from '../configuration/botEvents';
import { STRING_PARAM, TTS_MESSAGE } from '../configuration/chat';

const BOT_EVENTS_PASSWORD = process.env.BOT_EVENTS_PASSWORD || '';
const BOT_EVENTS_PORT = process.env.BOT_EVENTS_PORT || '';

let activeSocket: WebSocket | null = null;

const wss = new WebSocketServer({ port: Number(BOT_EVENTS_PORT) });

wss.on('connection', (ws: WebSocket) => {
  logger.info('New connection established.');

  ws.send(JSON.stringify({ type: BOT_EVENT_PASSWORD }));

  ws.on('message', (data: Buffer) => {
    const message = data.toString('utf8');
    if (message === BOT_EVENTS_PASSWORD) {
      logger.info('Correct password. Storing WebSocket connection.');

      activeSocket = ws;
    } else {
      logger.error('Incorrect password. Disconnecting.');

      ws.send(JSON.stringify({ type: BOT_EVENT_WRONG_PASSWORD }));
      ws.close();
    }
  });

  ws.on('close', () => {
    logger.info('Connection closed.');

    if (ws === activeSocket) {
      activeSocket = null;
    }
  });

  ws.on('error', () => {
    logger.error('WebSocket error:');
  });
});

export const sendEventTTS = (message: string, user?: string) => {
  logger.info('Sending TTS event ...');
  if (activeSocket && activeSocket.readyState === WebSocket.OPEN) {
    const parsedMessage = user
      ? TTS_MESSAGE.replace(`${STRING_PARAM}1`, user).replace(`${STRING_PARAM}2`, message)
      : message;

    const payload = { type: BOT_EVENT_TTS, message: parsedMessage.substring(0, TTS_MAX_CHARACTERS) };
    activeSocket.send(JSON.stringify(payload));
    logger.info('TTS message sent:', payload);
  } else {
    logger.error('No active WebSocket connection. Message not sent.');
  }
};

export default activeSocket;
