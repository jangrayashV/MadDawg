(() => {
  let lastLink = null;
  let previousUrl = location.href;
  let dismissed = false;
  let host;
  let generation = 0;
  document.addEventListener('contextmenu', event => {
    const anchor = event.composedPath().find(node => node instanceof HTMLAnchorElement);
    lastLink = anchor ? {url: anchor.href, title: anchor.innerText || anchor.getAttribute('aria-label') || anchor.title,
      description: anchor.title || anchor.closest('p, li')?.innerText || ''} : null;
  }, true);

  function panel(text, items = []) {
    host?.remove();
    host = document.createElement('div');
    host.style.cssText = 'position:fixed!important;bottom:24px!important;right:24px!important;z-index:2147483647!important;';
    const shadow = host.attachShadow({mode: 'closed'});
    const style = document.createElement('style');
    style.textContent = ':host{all:initial}section{width:300px;max-width:calc(100vw - 64px);background:#0b0b0b;color:#eeeae5;border:1px solid #49302b;border-radius:6px;padding:18px;box-shadow:0 8px 40px #0002;font:14px/1.5 system-ui}header{display:flex;gap:12px;justify-content:space-between}button{border:0;background:none;cursor:pointer;color:#ff342b;font:inherit}a{color:#eeeae5;display:block;margin-top:10px;overflow-wrap:anywhere}small{display:block;color:#a3a09c}div{max-height:260px;overflow:auto}';
    const section = document.createElement('section');
    section.setAttribute('aria-label', 'mad dawg');
    const header = document.createElement('header');
    const label = document.createElement('strong'); label.textContent = text;
    const close = document.createElement('button'); close.textContent = '×'; close.setAttribute('aria-label', 'Dismiss');
    close.onclick = () => { dismissed = true; host.remove(); };
    header.append(label, close); section.append(header);
    const links = document.createElement('div');
    for (const item of items) {
      const link = document.createElement('a'); link.href = item.url; link.target = '_blank'; link.rel = 'noopener noreferrer'; link.textContent = item.title;
      const description = document.createElement('small'); description.textContent = item.description;
      links.append(link, description);
    }
    section.append(links); shadow.append(style, section); document.documentElement.append(host);
  }
  async function check() {
    const current = ++generation;
    const requestedUrl = location.href;
    try {
      const result = await chrome.runtime.sendMessage({type: 'related'});
      if (current !== generation || dismissed || location.href !== requestedUrl) return;
      if (result.items?.length) panel(`Catch these too — ${result.items.length} unread resource${result.items.length === 1 ? '' : 's'} for this source`, result.items);
      else host?.remove();
    } catch { /* An extension reload invalidates existing content scripts. */ }
  }
  chrome.runtime.onMessage.addListener((message, sender, respond) => {
    if (message.type === 'context') respond(lastLink?.url === message.url ? lastLink : {});
    if (message.type === 'metadata') respond({title: document.title, description: document.querySelector('meta[name="description"], meta[property="og:description"]')?.content || ''});
    if (message.type === 'saved' || message.type === 'save-error') {
      panel(message.type === 'save-error' ? `Could not save: ${message.error}` : message.duplicate ? 'Already saved from this source' : 'Saved with its source');
      const notice = host;
      setTimeout(() => notice.remove(), 3500);
    }
  });
  // Also catches SPA navigation, including moving between YouTube videos.
  setInterval(() => {
    if (location.href !== previousUrl) {
      previousUrl = location.href; dismissed = false; host?.remove(); check();
    }
  }, 1000);
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') { dismissed = false; check(); }
  });
  chrome.storage.onChanged.addListener((changes, area) => {
    if (area === 'local' && changes.items) check();
  });
  check();
})();
