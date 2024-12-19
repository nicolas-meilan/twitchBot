import dotenv from 'dotenv';
dotenv.config();

import startBot from './bot';
import startObsViewsServer from './services/obsViewsServer';
import Stream from './Stream';

Stream.shared.initialize().then(() => {
  startBot();
  startObsViewsServer();
});
