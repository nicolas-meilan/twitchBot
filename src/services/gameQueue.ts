const BROADCAST_USERNAME = process.env.BROADCAST_USERNAME || '';

const VIP_TIME_ADVANTAGE = 5;
const SUB_TIME_ADVANTAGE = 10;

type User = {
  username: string,
  isMod: boolean;
  isVIP: boolean;
  isSub: boolean;
  isFollower: boolean;
  isBroadcaster?: boolean;
};

type UserRequest = User & {
  timestamp: number;
  addedManuallyWithPriority: boolean;
};

const gameQueue: UserRequest[] = [{
  username: BROADCAST_USERNAME,
  isMod: true,
  isVIP: true,
  isSub: true,
  isFollower: true,
  isBroadcaster: true,
  timestamp: 0,
  addedManuallyWithPriority: false,
}];

const isBroadcaster = (username: string) => username
  .toLowerCase().trim() === BROADCAST_USERNAME.toLowerCase().trim();

const minToMs = (minutes: number) => minutes * 60 * 1000;

const findUserInQueue = (username: string) => gameQueue.find((player) => player.username
  .toLowerCase().trim() === username.toLowerCase().trim());

const extraUserData = (user: UserRequest) => {
  if (user.isBroadcaster) return '👑 (Streamer)';
  if (user.isMod) return '🛡️ (Mod)';
  if (user.addedManuallyWithPriority) return '🚀 (Invitado/a)';
  if (user.isSub) return `🏅 +${SUB_TIME_ADVANTAGE} (Suscriptor/a)`;
  if (user.isVIP) return `💎 +${VIP_TIME_ADVANTAGE} (VIP)`;
  if (user.isFollower) return '🤗 +0 (Seguidor/a)';

  return '';
};

export const joinQueue = (user: User) => {
  if (isBroadcaster(user.username) || gameQueue.some((player) => player.username
    .toLowerCase().trim() === user.username.toLowerCase().trim())) return false;

  gameQueue.push({
    ...user,
    addedManuallyWithPriority: false,
    timestamp: Date.now(),
  });

  return true;
};

export const getOrderedQueue = () => {
  const orderedQueue = gameQueue.slice().sort((a, b) => {
    if (a.isMod && !b.isMod) return -1;
    if (!a.isMod && b.isMod) return 1;

    const adjustedA = a.timestamp - (a.isVIP ? minToMs(VIP_TIME_ADVANTAGE) : 0) - (a.isSub ? SUB_TIME_ADVANTAGE : 0);
    const adjustedB = b.timestamp - (b.isVIP ? minToMs(VIP_TIME_ADVANTAGE) : 0) - (b.isSub ? SUB_TIME_ADVANTAGE : 0);

    return adjustedA - adjustedB;
  });

  return `🎮 ${orderedQueue
    .map((player, index) => `${index + 1}. @${player.username} ${extraUserData(player)}`)
    .join(' 🎮 ')}`;
};

export const moveToEndFromQueue = (username: string)  => {
  const user = findUserInQueue(username);
  if (!user || isBroadcaster(user.username)) return false;

  user.timestamp = Date.now();
  return true;
};

export const removeFromQueue = (username: string) => {
  if (isBroadcaster(username)) return false;

  const index = gameQueue.findIndex((player) => player.username
    .toLowerCase().trim() === username.toLowerCase().trim());

  if (index === -1) return false;

  gameQueue.splice(index, 1);
  return true;
};

export const deleteQueue = () => gameQueue.length = 1;

export const joinQueueManually = (value: string, maxPriority?: boolean) => {
  const username = value.split(' ')[0]?.trim();
  const alreadyExists = !!findUserInQueue(username);

  if (alreadyExists && !maxPriority) return false;
  if (alreadyExists) removeFromQueue(username);

  const userRequest = {
    username,
    isMod: false,
    isVIP: false,
    isSub: false,
    isFollower: false,
    addedManuallyWithPriority: !!maxPriority,
    timestamp: maxPriority ? 0 : Date.now(),
  };

  gameQueue.push(userRequest);
  return true;
};