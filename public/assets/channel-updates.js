// Retry only failed fan feeds. Official API requests keep their existing cadence.
export const CHANNEL_RETRY_DELAYS = [60_000, 5 * 60_000, 15 * 60_000];
const stamp = value => Date.parse(value) || 0;
const failed = item => item.status === 'unavailable';
const validVideo = video => video === null || (video && /^[\w-]{11}$/.test(video.id || '')
  && video.format === 'video' && typeof video.title === 'string' && video.title
  && Number.isFinite(Date.parse(video.publishedAt)));

export function mergeChannelUpdates(previous, incoming) {
  if (!incoming || !Array.isArray(incoming.items)
    || !Number.isFinite(Date.parse(incoming.checkedAt))) throw new Error('INVALID_CHANNEL_RESPONSE');
  const old = new Map((previous?.items || []).map(item => [item.channelId, item]));
  const seen = new Set();
  for (const item of incoming.items) {
    if (!item || !/^UC[\w-]{22}$/.test(item.channelId || '') || seen.has(item.channelId)
      || !['ok','empty','limited','unavailable'].includes(item.status) || !validVideo(item.latest)
      || (item.status === 'ok' && !item.latest) || (item.status === 'empty' && item.latest)
      || (item.checkedAt !== null && !Number.isFinite(Date.parse(item.checkedAt)))) throw new Error('INVALID_CHANNEL_RESPONSE');
    seen.add(item.channelId);
  }
  if (!seen.size || [...old.keys()].some(id => !seen.has(id))) throw new Error('INCOMPLETE_CHANNEL_RESPONSE');
  const items = incoming.items.map(row => {
    const item = incoming.mode === 'unavailable' ? {...row, status:'unavailable'} : row;
    const prior = old.get(item.channelId);
    if (!prior) return item;
    // An old cache or fallback must not replace a more recently verified result.
    if (stamp(prior.checkedAt) > stamp(item.checkedAt)
      || (['limited','unavailable'].includes(item.status) && !item.latest && prior.latest)) {
      return {...prior, status: ['limited','unavailable'].includes(item.status) ? item.status : prior.status};
    }
    return item;
  });
  return {...incoming, items, checkedAt: stamp(previous?.checkedAt) > stamp(incoming.checkedAt) ? previous.checkedAt : incoming.checkedAt,
    stale: items.some(item => ['limited','unavailable'].includes(item.status))};
}

export function createChannelUpdater({load, render, onFailure, initialData, setTimer = setTimeout, clearTimer = clearTimeout}) {
  let data = initialData, generation = 0, controller, timer;
  function stop() {
    generation++;
    controller?.abort();
    clearTimer(timer);
    timer = undefined;
  }
  async function attempt(current, retries = 0) {
    if (current !== generation) return;
    let needsRetry = false;
    try {
      const incoming = await load(controller.signal);
      if (current !== generation) return;
      const next = mergeChannelUpdates(data, incoming);
      render(next);
      data = next;
      needsRetry = data.items.some(failed);
    } catch {
      if (current !== generation) return;
      needsRetry = true;
    }
    if (!needsRetry) return;
    const retryIn = CHANNEL_RETRY_DELAYS[retries] ?? null;
    onFailure({retryIn});
    if (retryIn !== null) timer = setTimer(() => {
      timer = undefined;
      return attempt(current, retries + 1);
    }, retryIn);
  }
  return {
    start() { stop(); controller = new AbortController(); return attempt(generation); },
    stop
  };
}
