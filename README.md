# Twitch Bot

Este bot de Twitch interactúa en el chat de un canal configurado. El bot responde automáticamente a los siguientes comandos:

- `!redes`: Muestra los enlaces de redes sociales.
- `!horarios`: Muestra los horarios de transmisión.

### Funcionalidades

- Responde a comandos específicos en el chat de Twitch.
- **Comando `!redes`**: Proporciona los enlaces de Twitch y Kick.
- **Comando `!horarios`**: Muestra el horario de los streams con un formato divertido utilizando emojis.

### ¿Qué hace el bot?

Este bot está configurado para escuchar mensajes en el chat de **Twitch** y responder de acuerdo con los comandos predefinidos en el archivo `MESSAGES_CONFIG`. Actualmente, responde a:

1. **`!redes`**: Proporciona los enlaces de Twitch y Kick de RungeKutta93.
2. **`!horarios`**: Muestra los horarios de los streams con un formato interactivo utilizando emojis.

### ¿Como lo puedo configurar?

Solo se debe agregar un .env con los siguientes datos
```
CLIENT_ID // client_id de tu aplicacion de twitch development
CLIENT_SECRET // secret de tu aplicacion de twitch development
BOT_USERNAME // username de la cuenta bot
ACCOUNT_CHAT_USERNAME // username de la cuenta con el chat
```
