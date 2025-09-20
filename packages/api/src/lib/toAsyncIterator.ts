type Resolve<T> = (v: T) => void;
type Reject = (e: Error) => void;
type Deferred<T> = {
  resolve: Resolve<T>;
  reject: Reject;
  promise: Promise<T>;
};

function createDeferred<T = void>(): Deferred<T> {
  let resolve: Resolve<T> | undefined;
  let reject: Reject | undefined;
  const promise = new Promise<T>((...args) => ([resolve, reject] = args));
  return Object.freeze(<Deferred<T>>{
    resolve: resolve!,
    reject: reject!,
    promise,
  });
}

export function toAsyncIterator<R extends [...any[]]>(
  onHandler: (...arg: any[]) => unknown,
  options?: { signal?: AbortSignal } // ← make sure `signal` is typed
): AsyncIterableIterator<R> {
  const comEvents: any[] = [];
  const unconsumedDeferred: Deferred<IteratorResult<any>>[] = [];

  const unHandle = onHandler((...args: any[]) => {
    const deferred = unconsumedDeferred.shift();
    if (deferred) {
      deferred.resolve({ value: args, done: false });
    } else {
      comEvents.push(args);
    }
  });

  const abortSignal = options?.signal;

  let finished = false;

  const finish = () => {
    if (finished) return; // idempotent
    finished = true;
    if (typeof unHandle === "function") unHandle();
    abortSignal?.removeEventListener("abort", finish);

    // resolve any pending `next()` calls
    for (const deferred of unconsumedDeferred) {
      deferred.resolve({ value: undefined, done: true });
    }
  };

  /* ---------- wire up the AbortSignal ---------- */
  if (abortSignal?.aborted) {
    // already aborted before we started
    finish();
  } else {
    abortSignal?.addEventListener("abort", finish, { once: true });
  }

  /* ---------- AsyncIterator implementation ---------- */
  return {
    async next() {
      const value = comEvents.shift();
      if (value) {
        return { value, done: false };
      }

      if (finished) {
        return { value: undefined, done: true };
      }

      const deferred = createDeferred<IteratorResult<any>>();
      unconsumedDeferred.push(deferred);
      return deferred.promise;
    },

    async return() {
      finish();
      return { value: undefined, done: true };
    },

    async throw(err?: unknown) {
      finish();
      return Promise.reject(err);
    },

    [Symbol.asyncIterator]() {
      return this;
    },
  };
}
