class Lottery {
  #users: string[] = [];
  #winner: string | null = null;
  #lotteryPaused = true;

  join(username: string, onLotteryPaused?: () => void) {
    if (this.#lotteryPaused) {
      onLotteryPaused?.();
      return false;
    }
    const uname = username.trim().toLowerCase();
    if (!uname || this.#users.includes(uname)) return false;
    this.#users.push(uname);
    return true;
  }

  joinManually(username: string, onLotteryPaused?: () => void) {
    if (this.#lotteryPaused) {
      onLotteryPaused?.();
      return false;
    }
    const uname = username.trim().toLowerCase();
    if (!uname || this.#users.includes(uname)) return false;
    this.#users.push(uname);
    return true;
  }

  remove(username: string) {
    const uname = username.trim().toLowerCase();
    const idx = this.#users.indexOf(uname);
    if (idx === -1) return false;
    this.#users.splice(idx, 1);
    return true;
  }

  clean() {
    this.#users = [];
    this.#winner = null;
  }

  pause() {
    this.#lotteryPaused = true;
  }

  resume() {
    this.#lotteryPaused = false;
  }

  start(onLotteryPaused?: () => void) {
    if (this.#lotteryPaused) {
      onLotteryPaused?.();
      return null;
    }
    this.#winner = null;
    if (this.#users.length === 0) return null;
    const idx = Math.floor(Math.random() * this.#users.length);
    this.#winner = this.#users[idx];
    return this.#winner;
  }

  getWinner(onLotteryPaused?: () => void) {
    if (this.#lotteryPaused) {
      onLotteryPaused?.();
      return null;
    }
    return this.#winner;
  }

  getListLength(onLotteryPaused?: () => void) {
    if (this.#lotteryPaused) {
      onLotteryPaused?.();
      return 0;
    }
    return this.#users.length;
  }

  isJoined(username: string, onLotteryPaused?: () => void) {
    if (this.#lotteryPaused) {
      onLotteryPaused?.();
      return false;
    }
    return this.#users.includes(username.trim().toLowerCase());
  }

  getAllUsers(onLotteryPaused?: () => void) {
    if (this.#lotteryPaused) {
      onLotteryPaused?.();
      return [];
    }
    return [...this.#users];
  }

  getList(onLotteryPaused?: () => void) {
    if (this.#lotteryPaused) {
      onLotteryPaused?.();
      return [];
    }
    return [...this.#users];
  }
}

const lottery = new Lottery();

export default lottery;
