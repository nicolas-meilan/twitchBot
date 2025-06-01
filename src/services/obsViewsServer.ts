import http, { IncomingMessage, ServerResponse } from 'http';
import fs from 'fs';
import path from 'path';
import logger from '../utils/logger';
import {
  STREAM_START_ALERT_SHORT,
  STRING_PARAM,
} from '../configuration/chat';

const OBS_VIEWS_PORT = process.env.OBS_VIEWS_PORT || '';
const OBS_VIEWS_WS_URL = process.env.OBS_VIEWS_WS_URL || '';
const OBS_CLIPS_FONT_NAME = process.env.OBS_CLIPS_FONT_NAME || '';
const OBS_OFFLINE_SCENE_NAME = process.env.OBS_OFFLINE_SCENE_NAME || '';
const OBS_COUNTDOWN_URL = process.env.OBS_COUNTDOWN_URL || '';
const VALORANT_RANDOM_PICKER_URL = process.env.VALORANT_RANDOM_PICKER_URL || '';
const BOT_EVENTS_PASSWORD = process.env.BOT_EVENTS_PASSWORD || '';
const BOT_EVENTS_URL = process.env.BOT_EVENTS_URL || '';
const LOTTERY_URL = process.env.LOTTERY_URL || '';

const startObsViewsServer = () => {
  try {
    const hostname = '0.0.0.0';
    const port = Number(OBS_VIEWS_PORT);

    const requestHandler = (req: IncomingMessage, res: ServerResponse) => {
      if (req.url === '/') {
        fs.readFile(path.resolve(__dirname, '../../obsViews/botEventsHandler.html'), 'utf8', (err, data) => {
          if (err) {
            res.statusCode = 500;
            res.end('Error reading the HTML file');
            return;
          }
          const finalData = data
            .replace('__WEBSOCKET_URL__', BOT_EVENTS_URL)
            .replace('__OBS_VIEWS_WS_URL__', OBS_VIEWS_WS_URL)
            .replace('__OBS_CLIPS_FONT_NAME__', OBS_CLIPS_FONT_NAME)
            .replace('__OBS_OFFLINE_SCENE_NAME__', OBS_OFFLINE_SCENE_NAME)
            .replace('__OBS_COUNTDOWN_URL__', OBS_COUNTDOWN_URL)
            .replace('__OBS_COUNTDOWN_STRING_PARAM__', STRING_PARAM)
            .replace('__OBS_COUNTDOWN_MESSAGE__', STREAM_START_ALERT_SHORT)
            .replace('__VALORANT_RANDOM_PICKER_URL__', VALORANT_RANDOM_PICKER_URL)
            .replace('__LOTTERY_URL__', LOTTERY_URL)
            .replace('__PASSWORD__', BOT_EVENTS_PASSWORD);

          res.statusCode = 200;
          res.setHeader('Content-Type', 'text/html');
          res.end(finalData);
        });
      } else {
        res.statusCode = 404;
        res.end('Page not found');
      }
    };

    const server = http.createServer(requestHandler);

    server.listen(port, hostname, () => {
      logger.info(`Obs views server running`);
    });
  } catch {
    logger.error('Error starting obs views server');
  }
};

export default startObsViewsServer;
