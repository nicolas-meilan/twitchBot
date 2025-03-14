const VIP_TIME_ADVANTAGE = 10 * 60 * 1000; // 10 minutes in milliseconds
const SUB_TIME_ADVANTAGE = 5 * 60 * 1000; // 5 minutes in milliseconds

type User = {
  username: string,
  isMod: boolean;
  isVIP: boolean;
  isSub: boolean;
  isFollower: boolean;
};

type UserRequest = User & {
  timestamp: number;
};

const gameQueue: UserRequest[] = [];

export const joinQueue = (user: User) => {
  if (gameQueue.some((player) => player.username === user.username)) return false;

  gameQueue.push({
    ...user,
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

  return `🎮 ${[
    '1. rungekutta93 👑',
    ...orderedQueue.map((player, index) => `${index + 2}. ${player.username}`),
  ].join(' 🎮 ')}`;
};

export const moveToEndFromQueue = (username: string)  => {
  const user = gameQueue.find((player) => player.username.toLowerCase() === username.toLowerCase());
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

export const deleteQueue = () => gameQueue.length = 0;

export const joinQueueManually = (username: string, maxPriority?: boolean) => {
  const userRequest = {
    username: `${username} ${maxPriority ? '⭐' : '⚠️'}`,
    isMod: false,
    isVIP: false,
    isSub: false,
    isFollower: false,
    timestamp: maxPriority ? 0 : Date.now(),
  };

  gameQueue.push(userRequest);
};