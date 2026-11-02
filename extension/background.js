import {addResource, canonical, clean, sourceGroups} from './model.js';

let queue = Promise.resolve();
function serialized(fn) {
  const result = queue.then(fn);
  queue = result.catch(() => {});
  return result;
}
async function list() {
  return (await chrome.storage.local.get({items: []})).items;
}
async function groups() {
  const stored = await chrome.storage.local.get({groups: []});
  return sourceGroups(await list(), stored.groups || []);
}
async function badge() {
  const count = (await list()).filter(item => !item.read).length;
  await chrome.action.setBadgeBackgroundColor({color: '#171717'});
  await chrome.action.setBadgeTextColor({color: '#FFFFFF'});
  await chrome.action.setBadgeText({text: count ? (count > 99 ? '99+' : String(count)) : ''});
  await chrome.action.setTitle({title: `mad dawg · ${count} unread`});
}
chrome.runtime.onInstalled.addListener(async () => {
  await chrome.contextMenus.removeAll();
  chrome.contextMenus.create({id: 'save', title: 'Save resource to mad dawg', contexts: ['link'], targetUrlPatterns: ['http://*/*', 'https://*/*']});
  await badge();
});
chrome.runtime.onStartup.addListener(() => { badge().catch(console.error); });
chrome.storage.onChanged.addListener(() => { badge().catch(console.error); });

async function save(input) {
  const result = addResource(await list(), input);
  if (!result.duplicate) await chrome.storage.local.set({items: result.items});
  return {item: result.item, duplicate: result.duplicate};
}
chrome.contextMenus.onClicked.addListener((info, tab) => {
  if (info.menuItemId !== 'save') return;
  serialized(async () => {
    const context = await chrome.tabs.sendMessage(tab.id, {type: 'context', url: info.linkUrl}).catch(() => ({}));
    const result = await save({url: info.linkUrl, title: context.title, description: context.description,
      sourceUrl: tab.url || info.pageUrl, sourceTitle: tab.title});
    await chrome.tabs.sendMessage(tab.id, {type: 'saved', duplicate: result.duplicate}).catch(() => {});
  }).catch(async error => {
    await chrome.tabs.sendMessage(tab.id, {type: 'save-error', error: error.message}).catch(() => {});
  });
});

chrome.runtime.onMessage.addListener((message, sender, respond) => {
  const extensionPage = sender.url?.startsWith(chrome.runtime.getURL(''));
  if (message.type === 'related') {
    (async () => {
      const url = canonical(sender.url);
      return {items: (await list()).filter(item => !item.read && item.sourceUrl === url)};
    })().then(respond).catch(() => respond({items: []}));
    return true;
  }
  if (!extensionPage) return false;
  serialized(async () => {
    if (message.type === 'list') return {items: await list(), groups: await groups()};
    if (message.type === 'create-group') {
      const url = canonical(message.url);
      const existing = await groups();
      const group = existing.find(group => group.url === url) || {url, title: clean(message.title) || new URL(url).hostname};
      if (!existing.some(entry => entry.url === url)) existing.unshift(group);
      await chrome.storage.local.set({groups: existing});
      return {group};
    }
    if (message.type === 'save') return save(message.item);
    const items = await list();
    const item = items.find(item => item.id === message.id);
    if (!item) throw new Error('This resource no longer exists.');
    if (message.type === 'remove') await chrome.storage.local.set({items: items.filter(item => item.id !== message.id)});
    else if (message.type === 'associate') {
      const group = message.sourceUrl ? (await groups()).find(group => group.url === canonical(message.sourceUrl)) : null;
      if (message.sourceUrl && !group) throw new Error('Choose an existing source group.');
      const sourceUrl = group?.url || '';
      if (items.some(other => other.id !== item.id && other.url === item.url && other.sourceUrl === sourceUrl)) {
        throw new Error('This resource is already in that group.');
      }
      item.sourceUrl = sourceUrl;
      item.sourceTitle = group?.title || '';
      await chrome.storage.local.set({items});
    } else if (message.type === 'edit') {
      item.description = clean(message.description);
      await chrome.storage.local.set({items});
    } else if (message.type === 'read') {
      item.read = Boolean(message.read);
      await chrome.storage.local.set({items});
    } else throw new Error('Unknown action.');
    return {ok: true};
  }).then(respond).catch(error => respond({error: error.message}));
  return true;
});
