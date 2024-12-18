import dotenv from 'dotenv';
dotenv.config();

import startBot from './bot';
import startObsViewsServer from './services/obsViewsServer';

startBot();
startObsViewsServer();
