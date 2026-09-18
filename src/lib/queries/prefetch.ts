/**
 * Resilient loader helper.
 *
 * On the server we must never block a render on an upstream backend call that
 * may hang — if the timer wins the race we shell out after `ms` and the page
 * paints immediately (the client picks the fetch back up from the skeleton).
 * On the client a skeleton is already showing, so finishing the fetch fully is
 * cheap and desired.
 */
export async function prefetchWithin<T>(
  fn: () => Promise<T>,
  ms = 4000,
): Promise<T | undefined> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  const guard = new Promise<void>((resolve) => {
    timer = setTimeout(resolve, ms);
  });
  try {
    const result = await Promise.race([fn(), guard.then(() => undefined)]);
    return result as T | undefined;
  } catch {
    return undefined;
  } finally {
    if (timer) clearTimeout(timer);
  }
}