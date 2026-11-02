export function clean(value, max = 240) {
  return String(value || '').replace(/\s+/g, ' ').trim().slice(0, max);
}

export function canonical(raw) {
  const url = new URL(raw);
  if (!['http:', 'https:'].includes(url.protocol)) throw new Error('Only web links can be saved.');
  if (url.hostname === 'www.youtube.com' && url.pathname === '/redirect' && url.searchParams.has('q')) {
    return canonical(url.searchParams.get('q'));
  }
  const youtube = ['youtube.com', 'www.youtube.com', 'm.youtube.com', 'youtu.be'].includes(url.hostname);
  const video = youtube && (url.hostname === 'youtu.be' ? url.pathname.slice(1) : url.searchParams.get('v') || url.pathname.match(/^\/(?:shorts|live)\/([^/]+)/)?.[1]);
  if (video) return `https://www.youtube.com/watch?v=${encodeURIComponent(video)}`;
  for (const key of [...url.searchParams.keys()]) {
    if (/^utm_/i.test(key) || ['fbclid', 'gclid'].includes(key)) url.searchParams.delete(key);
  }
  url.searchParams.sort();
  // Keep fragments: some sites use them as distinct application routes.
  return url.href;
}

export function addResource(items, input) {
  const url = canonical(input.url);
  const sourceUrl = input.sourceUrl ? canonical(input.sourceUrl) : '';
  const existing = items.find(item => item.url === url && item.sourceUrl === sourceUrl);
  if (existing) return {items, item: existing, duplicate: true};
  const item = {
    id: crypto.randomUUID(), url, sourceUrl,
    title: clean(input.title) || new URL(url).hostname,
    description: clean(input.description),
    sourceTitle: clean(input.sourceTitle) || (sourceUrl ? new URL(sourceUrl).hostname : ''),
    read: false, createdAt: Date.now()
  };
  return {items: [item, ...items], item, duplicate: false};
}

export function sourceGroups(items, savedGroups = []) {
  const groups = new Map(savedGroups.map(group => [group.url, group]));
  for (const item of items) {
    if (item.sourceUrl && !groups.has(item.sourceUrl)) {
      groups.set(item.sourceUrl, {url: item.sourceUrl, title: item.sourceTitle});
    }
  }
  return [...groups.values()];
}
