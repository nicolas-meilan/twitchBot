import dotenv from 'dotenv';
dotenv.config();

import './db/jobsdb';

import { initializeChatCommands } from './db/chatCommands';
import startBot from './bot';
import startObsViewsServer from './services/obsViewsServer';
import Stream from './Stream';
import logger from './utils/logger';

const startApplication = async () => {
  await initializeChatCommands();
  await Stream.shared.initialize();
  startBot().catch((error: unknown) => {
    logger.error('Bot startup failed:', error);
    process.exitCode = 1;
  });
  startObsViewsServer();
};

startApplication().catch((error: unknown) => {
  logger.error('Application startup failed:', error);
  process.exitCode = 1;
});
