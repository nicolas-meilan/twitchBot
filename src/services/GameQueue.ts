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

class GameQueue {
  #gameQueue: UserRequest[];
  #VIP_TIME_ADVANTAGE = VIP_TIME_ADVANTAGE;
  #SUB_TIME_ADVANTAGE = SUB_TIME_ADVANTAGE;
  #BROADCAST_USERNAME = BROADCAST_USERNAME;
  #joinStopped = false;

  constructor() {
    this.#gameQueue = [{
      username: this.#BROADCAST_USERNAME,
      isMod: true,
      isVIP: true,
      isSub: true,
      isFollower: true,
      isBroadcaster: true,
      timestamp: 0,
      addedManuallyWithPriority: false,
    }];
  }

  stopJoin() {
    this.#joinStopped = true;
  }

  resumeJoin() {
    this.#joinStopped = false;
  }

  isJoinStopped() {
    return this.#joinStopped;
  }

  #isBroadcaster(username: string) {
    return username.toLowerCase().trim() === this.#BROADCAST_USERNAME.toLowerCase().trim();
  }

  #minToMs(minutes: number) {
    return minutes * 60 * 1000;
  }

  #findUserInQueue(username: string) {
    return this.#gameQueue.find((player) =>
      player.username.toLowerCase().trim() === username.toLowerCase().trim()
    );
  }

  #extraUserData(user: UserRequest) {
    if (user.isBroadcaster) return '👑 (Streamer)';
    if (user.isMod) return '🛡️ (Mod)';
    if (user.addedManuallyWithPriority) return '🚀 (Invitado/a)';
    if (user.isSub) return `🏅 +${this.#SUB_TIME_ADVANTAGE} (Suscriptor/a)`;
    if (user.isVIP) return `💎 +${this.#VIP_TIME_ADVANTAGE} (VIP)`;
    if (user.isFollower) return '🤗 +0 (Seguidor/a)';

    return '';
  }

  #getTimeDiscount(user: UserRequest) {
    const maxTimeDiscount = this.#SUB_TIME_ADVANTAGE > this.#VIP_TIME_ADVANTAGE
      ? this.#SUB_TIME_ADVANTAGE : this.#VIP_TIME_ADVANTAGE;

    if (user.isSub && user.isVIP) return this.#minToMs(maxTimeDiscount);
    if (user.isSub) return this.#minToMs(this.#SUB_TIME_ADVANTAGE);
    if (user.isVIP) return this.#minToMs(this.#VIP_TIME_ADVANTAGE);

    return 0;
  }

  joinQueue(user: User, onJoinStopped?: () => void) {
    if (this.#joinStopped) {
      onJoinStopped?.();
      return false;
    }

    if (this.#isBroadcaster(user.username) || this.#findUserInQueue(user.username)) return false;

    this.#gameQueue.push({
      ...user,
      addedManuallyWithPriority: false,
      timestamp: Date.now(),
    });

    return true;
  }

  getOrderedQueue() {
    const orderedQueue = this.#gameQueue.slice().sort((a, b) => {
      if (a.isBroadcaster && !b.isBroadcaster) return -1;
      if (!a.isBroadcaster && b.isBroadcaster) return 1;

      if (a.addedManuallyWithPriority && !b.addedManuallyWithPriority) return -1;
      if (!a.addedManuallyWithPriority && b.addedManuallyWithPriority) return 1;

      if (a.isMod && !b.isMod) return -1;
      if (!a.isMod && b.isMod) return 1;

      const adjustedA = a.timestamp - this.#getTimeDiscount(a);
      const adjustedB = b.timestamp - this.#getTimeDiscount(b);

      return adjustedA - adjustedB;
    });

    return `🎮 ${orderedQueue
      .map((player, index) => `${index + 1}. @${player.username} ${this.#extraUserData(player)}`)
      .join(' 🎮 ')}`;
  }

  moveToEndFromQueue(username: string) {
    const user = this.#findUserInQueue(username);
    if (!user || this.#isBroadcaster(user.username)) return false;

    user.timestamp = Date.now();
    return true;
  }

  removeFromQueue(username: string) {
    if (this.#isBroadcaster(username)) return false;

    const index = this.#gameQueue.findIndex((player) =>
      player.username.toLowerCase().trim() === username.toLowerCase().trim()
    );

    if (index === -1) return false;

    this.#gameQueue.splice(index, 1);
    return true;
  }

  deleteQueue() {
    this.#gameQueue.length = 1;
  }

  joinQueueManually(value: string, maxPriority?: boolean) {
    const username = value.split(' ')[0]?.trim();
    const alreadyExists = !!this.#findUserInQueue(username);

    if (alreadyExists && !maxPriority) return false;
    if (alreadyExists) this.removeFromQueue(username);

    const userRequest: UserRequest = {
      username,
      isMod: false,
      isVIP: false,
      isSub: false,
      isFollower: false,
      addedManuallyWithPriority: !!maxPriority,
      timestamp: Date.now(),
    };

    this.#gameQueue.push(userRequest);
    return true;
  }
}

const gameQueue = new GameQueue();

export default gameQueue;
