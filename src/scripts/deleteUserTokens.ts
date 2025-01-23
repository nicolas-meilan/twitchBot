import dotenv from 'dotenv';
dotenv.config();

import { deleteTokens } from '../db/tokensdb';
import { LoginType } from '../services/twitch/auth';

deleteTokens(LoginType.BotUser);
deleteTokens(LoginType.BroadcastUser);
