class Lottery {
  #users: string[] = [];
  #winner: string | null = null;
  #joinPaused = true;

  join(username: string, onJoinPaused?: () => void) {
    if (this.#joinPaused) {
      onJoinPaused?.();
      return false;
    }
    const uname = username.trim().toLowerCase();
    if (!uname || this.#users.includes(uname)) return false;
    this.#users.push(uname);
    return true;
  }

  joinManually(username: string, onJoinPaused?: () => void) {
    if (this.#joinPaused) {
      onJoinPaused?.();
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

  pauseJoin() {
    this.#joinPaused = true;
  }

  resumeJoin() {
    this.#joinPaused = false;
  }

  start(onJoinPaused?: () => void) {
    if (this.#joinPaused) {
      onJoinPaused?.();
      return null;
    }
    this.#winner = null;
    if (this.#users.length === 0) return null;
    const idx = Math.floor(Math.random() * this.#users.length);
    this.#winner = this.#users[idx];
    return this.#winner;
  }

  getWinner(onJoinPaused?: () => void) {
    if (this.#joinPaused) {
      onJoinPaused?.();
      return null;
    }
    return this.#winner;
  }

  getListLength(onJoinPaused?: () => void) {
    if (this.#joinPaused) {
      onJoinPaused?.();
      return 0;
    }
    return this.#users.length;
  }

  isJoined(username: string, onJoinPaused?: () => void) {
    if (this.#joinPaused) {
      onJoinPaused?.();
      return false;
    }
    return this.#users.includes(username.trim().toLowerCase());
  }

  getAllUsers(onJoinPaused?: () => void) {
    if (this.#joinPaused) {
      onJoinPaused?.();
      return [];
    }
    return [...this.#users];
  }
}

const lottery = new Lottery();

export default lottery;
