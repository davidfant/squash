export const raceWithAbortSignal = <T>(
  promise: Promise<T>,
  abortSignal: AbortSignal
): Promise<T> =>
  Promise.race<T>([
    promise,
    new Promise((_, reject) => {
      abortSignal.addEventListener("abort", () =>
        reject(new Error("Cancelled"))
      );
    }),
  ]);
