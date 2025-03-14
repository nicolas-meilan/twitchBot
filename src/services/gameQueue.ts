const VIP_TIME_ADVANTAGE = 10 * 60 * 1000; // 10 minutes in milliseconds
const SUB_TIME_ADVANTAGE = 5 * 60 * 1000; // 5 minutes in milliseconds

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
  username: 'rungekutta93',
  isMod: true,
  isVIP: true,
  isSub: true,
  isFollower: true,
  isBroadcaster: true,
  timestamp: 0,
  addedManuallyWithPriority: false,
}];

const findUserInQueue = (username: string) => gameQueue.find((player) => player.username === username);

const extraUserData = (user: UserRequest) => {
  if (user.isBroadcaster) return '👑 (Streamer)';
  if (user.isMod) return '🛡️ (Mod)';
  if (user.addedManuallyWithPriority) return '🚀 (Invitado/a)';
  if (user.isVIP) return '💎 +10 (VIP)';
  if (user.isSub) return '🏅 +5 (Suscriptor/a)';
  if (user.isFollower) return '🤗 +0 (Seguidor/a)';

  return '';
};

export const joinQueue = (user: User) => {
  if (gameQueue.some((player) => player.username === user.username)) return false;

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

    const adjustedA = a.timestamp - (a.isVIP ? VIP_TIME_ADVANTAGE : 0) - (a.isSub ? SUB_TIME_ADVANTAGE : 0);
    const adjustedB = b.timestamp - (b.isVIP ? VIP_TIME_ADVANTAGE : 0) - (b.isSub ? SUB_TIME_ADVANTAGE : 0);

    return adjustedA - adjustedB;
  });

  return `🎮 ${orderedQueue
    .map((player, index) => `${index + 1}. @${player.username} ${extraUserData(player)}`)
    .join(' 🎮 ')}`;
};

export const moveToEndFromQueue = (username: string)  => {
  const user = findUserInQueue(username);
  if (!user) return false;

  user.timestamp = Date.now();
  return true;
};

export const removeFromQueue = (username: string) => {
  const index = gameQueue.findIndex((player) => player.username.toLowerCase() === username.toLowerCase());
  if (index === -1) return false;

  gameQueue.splice(index, 1);
  return true;
};

export const deleteQueue = () => gameQueue.length = 1;

export const joinQueueManually = (value: string, maxPriority?: boolean) => {
  const username = value.split(' ')[0];
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