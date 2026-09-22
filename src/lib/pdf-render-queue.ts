type QueueEvent = "start" | "success" | "error" | "timeout" | "end";
type Listener = (...args: unknown[]) => void;
type Job = ((done: (error?: unknown, result?: unknown) => void) => unknown) & {
  timeout?: number;
};

type QueueOptions = {
  concurrency?: number;
  timeout?: number;
  autostart?: boolean;
  results?: unknown[] | null;
};

/** Browser-native replacement for the tiny `queue` package used by react-pdf. */
class PdfRenderQueue {
  concurrency: number;
  timeout: number;
  autostart: boolean;
  results: unknown[] | null;
  pending = 0;
  running = false;
  jobs: Job[] = [];
  private listenersByEvent = new Map<QueueEvent, Set<Listener>>();

  constructor(options: QueueOptions = {}) {
    this.concurrency = options.concurrency ?? Number.POSITIVE_INFINITY;
    this.timeout = options.timeout ?? 0;
    this.autostart = options.autostart ?? false;
    this.results = options.results ?? null;
  }

  get length() {
    return this.pending + this.jobs.length;
  }

  on(event: QueueEvent, listener: Listener) {
    const listeners = this.listenersByEvent.get(event) ?? new Set<Listener>();
    listeners.add(listener);
    this.listenersByEvent.set(event, listeners);
    return this;
  }

  removeListener(event: QueueEvent, listener: Listener) {
    this.listenersByEvent.get(event)?.delete(listener);
    return this;
  }

  emit(event: QueueEvent, ...args: unknown[]) {
    for (const listener of this.listenersByEvent.get(event) ?? []) listener(...args);
    return this;
  }

  push(...jobs: Job[]) {
    const length = this.jobs.push(...jobs);
    if (this.autostart) this.start();
    return length;
  }

  splice(start: number, deleteCount?: number, ...jobs: Job[]) {
    const removed = deleteCount === undefined
      ? this.jobs.splice(start)
      : this.jobs.splice(start, deleteCount, ...jobs);
    if (this.autostart) this.start();
    return removed;
  }

  start() {
    this.running = true;
    while (this.running && this.pending < this.concurrency && this.jobs.length > 0) {
      const job = this.jobs.shift();
      if (!job) break;
      this.run(job);
    }
    if (this.pending === 0 && this.jobs.length === 0) this.emit("end");
    return this;
  }

  end(error?: unknown) {
    this.running = false;
    this.jobs.length = 0;
    this.emit("end", error);
    return this;
  }

  private run(job: Job) {
    this.pending += 1;
    this.emit("start", job);
    let settled = false;
    let timer: ReturnType<typeof setTimeout> | undefined;

    const done = (error?: unknown, result?: unknown) => {
      if (settled) return;
      settled = true;
      if (timer) clearTimeout(timer);
      this.pending -= 1;
      if (error) this.emit("error", error, job);
      else {
        this.results?.push(result);
        this.emit("success", result, job);
      }
      if (this.running) this.start();
    };

    const timeout = job.timeout ?? this.timeout;
    if (timeout > 0) {
      timer = setTimeout(() => {
        this.emit("timeout", done, job);
        done();
      }, timeout);
    }

    try {
      const result = job(done);
      if (result && typeof (result as PromiseLike<unknown>).then === "function") {
        Promise.resolve(result).then((value) => done(undefined, value), done);
      }
    } catch (error) {
      done(error);
    }
  }
}

export default function createPdfRenderQueue(options: QueueOptions = {}) {
  return new PdfRenderQueue(options);
}
