import tmi from 'tmi.js';

export type OnNewMessage = (props: {
    channel: string;
    tags: tmi.ChatUserstate;
    message: string;
}) => void;

const connectToChat = async (
    botUsername: string,
    token: string,
    accountChatUsername: string,
    onNewMessage: OnNewMessage,
) => {
        const client = new tmi.Client({
            identity: {
                username: botUsername,
                password: `oauth:${token}`,
            },
            channels: [accountChatUsername],
        });

        // Conectar al chat
        await client.connect();

        client.on('message', (channel, tags, message, self) => {
            if (self) return; // Bot message

            onNewMessage({
                channel,
                tags,
                message,
            })
        });

        return client;
};

export default connectToChat;
