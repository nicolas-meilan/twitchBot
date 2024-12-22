import http, { IncomingMessage, ServerResponse } from 'http';
import fs from 'fs';
import path from 'path';
import logger from '../utils/logger';

const OBS_VIEWS_PORT = process.env.OBS_VIEWS_PORT || '';
const OBS_VIEWS_WS_URL = process.env.OBS_VIEWS_WS_URL || '';
const OBS_CLIPS_FONT_NAME = process.env.OBS_CLIPS_FONT_NAME || '';
const OFFLINE_SCENE_NAME = process.env.OFFLINE_SCENE_NAME || '';
const BOT_EVENTS_PASSWORD = process.env.BOT_EVENTS_PASSWORD || '';
const BOT_EVENTS_URL = process.env.BOT_EVENTS_URL || '';

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
            .replace('__OFFLINE_SCENE_NAME__', OFFLINE_SCENE_NAME)
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
