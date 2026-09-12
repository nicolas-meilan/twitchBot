type QueueTask<T> = () => Promise<T>;

export type QueuedResult<T> = {
  accepted: boolean;
  value?: T;
};

export class ChannelQueue {
  private readonly tails = new Map<string, Promise<void>>();
  private readonly sizes = new Map<string, number>();

  public constructor(private readonly maxSize: number) {}

  public async run<T>(channel: string, task: QueueTask<T>): Promise<QueuedResult<T>> {
    const channelKey = channel.toLowerCase();
    const size = this.sizes.get(channelKey) || 0;
    if (size >= this.maxSize) return { accepted: false };

    this.sizes.set(channelKey, size + 1);
    const previous = this.tails.get(channelKey) || Promise.resolve();
    let result: T | undefined;

    const current = previous
      .catch(() => undefined)
      .then(async () => { result = await task(); })
      .finally(() => this.complete(channelKey, current));

    this.tails.set(channelKey, current);
    await current;
    return { accepted: true, value: result };
  }

  private complete(channel: string, current: Promise<void>): void {
    const size = this.sizes.get(channel) || 1;
    if (size <= 1) this.sizes.delete(channel);
    else this.sizes.set(channel, size - 1);

    if (this.tails.get(channel) === current) this.tails.delete(channel);
  }
}
