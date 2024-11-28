import tmi from 'tmi.js';

import getOAuthToken from './services/auth';
import connectToChat, { OnNewMessage } from './services/chat';
import { MESSAGES_CONFIG } from './configuration/chat';

const BOT_USERNAME = process.env.BOT_USERNAME || '';
const ACCOUNT_CHAT_USERNAME = process.env.ACCOUNT_CHAT_USERNAME || '';

const messageHandler = (chat: tmi.Client): OnNewMessage => ({ channel, message }) => {
    const formattedMessage = message.toLowerCase().trim();

    const currentMessageResponse = MESSAGES_CONFIG[formattedMessage] || '';

    if (!currentMessageResponse) return;

    chat.say(channel, currentMessageResponse);
}

const startBot = async () => {
    const token = await getOAuthToken();

    const chat = await connectToChat(BOT_USERNAME, token, ACCOUNT_CHAT_USERNAME, (params) => {
        messageHandler(chat)(params)
    });
};

export default startBot;
