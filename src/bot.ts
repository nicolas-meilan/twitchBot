import tmi from 'tmi.js';

import getTokens from './services/auth';
import connectToChat, { OnNewMessage } from './services/chat';
import { MESSAGES_CONFIG } from './configuration/chat';
import logger from './utils/logger';

const BOT_USERNAME = process.env.BOT_USERNAME || '';
const ACCOUNT_CHAT_USERNAME = process.env.ACCOUNT_CHAT_USERNAME || '';

const messageHandler = (chat: tmi.Client): OnNewMessage => ({ tags, channel, message }) => {
    const formattedMessage = message.toLowerCase().trim();

    const currentMessageResponse = MESSAGES_CONFIG[formattedMessage] || '';

    if (!currentMessageResponse) return;

    logger.info(`${tags.username}: ${formattedMessage}`);
    const messages = currentMessageResponse.split('\n');
    messages.forEach((currentMessage) => {
        chat.say(channel, currentMessage);
    })
}

const startBot = async () => {
    const token = await getTokens();

    const chat = await connectToChat(BOT_USERNAME, token.access_token, ACCOUNT_CHAT_USERNAME, (params) => {
        messageHandler(chat)(params)
    });
};

export default startBot;
