# Twitch Bot

A Twitch chat bot built with TypeScript. It handles channel commands, Twitch events, OBS integrations, Valorant data, and an optional OpenAI-compatible AI assistant.

## Requirements

- Node.js 20 or newer
- Yarn 4.5.3 or a compatible Yarn 4 installation
- A Twitch application and bot account
- A SQLite-compatible runtime (SQLite is bundled through `sqlite3`)
- An OpenAI-compatible AI server if the AI assistant is enabled
- A Valorant API key if Valorant external data is enabled

## Installation

```bash
yarn install
cp .env.example .env
```

On Windows, copy `.env.example` to `.env` using Explorer or PowerShell:

```powershell
Copy-Item .env.example .env
```

Fill in the required environment variables before starting the bot. Never commit `.env` or credentials to the repository.

## Configuration

The complete variable list is available in [.env.example](.env.example). The main groups are:

### Twitch and authentication

```dotenv
CLIENT_ID=your_twitch_client_id
CLIENT_SECRET=your_twitch_client_secret
BOT_USERNAME=your_bot_username
BROADCAST_USERNAME=your_channel_username
BROADCAST_ACCOUNT_ID=your_broadcaster_id
BOT_ACCOUNT_ID=your_bot_id
LOGIN_REDIRECT_URI=http://localhost:3339/callback
ENCRYPTION_KEY=long_random_secret
```

### AI assistant

The AI client uses the OpenAI-compatible endpoints `/v1/chat/completions` and `/v1/models`.

```dotenv
AI_URL=http://localhost:1234
AI_MODEL=qwen3-8b
AI_TIMEOUT_MS=90000
AI_MEMORY_MESSAGES=20
AI_LOG_TOKEN_USAGE=true
```

`AI_MODEL` is used for the chat completion request. For the context preflight, the bot looks for the matching model in `/v1/models`; if it is not listed, it uses the first returned model. Only that model's `context_length` field is accepted. The metadata is refreshed every 15 minutes. If the server does not provide `context_length`, the request is sent without a local context-length preflight.

Before every AI request, the bot estimates the prompt token count. When it exceeds the discovered context length, the request is rejected locally and the user receives a configured chat message from `src/configuration/chat.ts`.

To use the assistant, mention the bot in chat:

```text
@your_bot what was the broadcaster's last ranked match?
```

The assistant keeps a limited in-memory conversation history per channel. It returns structured JSON internally and can either answer, execute a supported bot command, or start the external-information workflow.

## External information sources

External sources are registered in `src/services/aiService/aiExternalEndpoints.ts`. Each source provides:

- A source name used by the AI
- A base API URL
- Optional headers and request body defaults
- An OpenAPI documentation URL
- A description and source-specific rules
- Optional response URL filtering

Example source:

```typescript
const exampleEndpoint: AiExternalEndpoint = {
  endpoint: 'https://api.example.com',
  baseHeader: {
    Authorization: process.env.EXAMPLE_API_KEY || '',
    Accept: 'application/json',
  },
  documentation: 'https://api.example.com/openapi.json',
  description: 'Example data source for public account information.',
  extraInformation: `
- Prefer the v1 routes.
- Use the smallest supported result size.
`,
};

const getExampleEndpoint = async () => exampleEndpoint;

export const AiExternalEndpoints = {
  example: {
    ...exampleEndpoint,
    baseEndpoint: exampleEndpoint,
    endpointGetter: getExampleEndpoint,
  },
};
```

When adding a source, also add any required credentials to `.env.example` and keep secrets in `.env`. The source name (`example` in the sample) is the key used by the AI workflow.

### Generate external endpoint documentation

The bot reads the source's OpenAPI document and stores compact local documentation under `aiExtraData/`:

```bash
yarn fetchAiExternalDocs
```

Run this command after adding a source or when its API documentation changes. The generated files are used by the mandatory external-information flow:

1. List the available endpoints.
2. Retrieve the exact documentation for the selected endpoint.
3. Execute the documented request.
4. Build the final answer from the returned data only.

The AI is not allowed to invent routes, parameters, response fields, or results during this flow.

## Development

Start the bot with automatic TypeScript restart:

```bash
yarn dev
```

Build the production JavaScript output:

```bash
yarn build
node dist/index.js
```

Run the configured linter:

```bash
yarn lint
```

Apply automatic ESLint fixes where available:

```bash
yarn lint:fix
```

## Available scripts

| Script | Purpose |
| --- | --- |
| `yarn dev` | Run the bot through `ts-node-dev` |
| `yarn build` | Compile `src/` into `dist/` |
| `yarn start` | Build and start the bot |
| `yarn lint` | Run ESLint |
| `yarn lint:fix` | Apply ESLint fixes |
| `yarn fetchAiExternalDocs` | Download and generate external API documentation |
| `yarn deleteUserTokens` | Build and delete stored Twitch tokens |

## Data and generated files

- `database.db` stores local SQLite data.
- `aiExtraData/` stores generated external API documentation.
- `dist/` contains compiled JavaScript and is generated by the build.
- `.env` contains local secrets and must remain private.
