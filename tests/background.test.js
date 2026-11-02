import test from 'node:test';
import assert from 'node:assert/strict';

const event = () => ({listeners: [], addListener(fn) { this.listeners.push(fn); }});
let saved = {items: []};
const badgeTexts = [];
globalThis.chrome = {
  runtime: {onInstalled: event(), onStartup: event(), onMessage: event(), getURL: path => `chrome-extension://test/${path}`},
  storage: {
    local: {
      get: async () => structuredClone(saved),
      set: async value => { await new Promise(resolve => setTimeout(resolve, 2)); saved = {...saved, ...structuredClone(value)}; }
    },
    onChanged: event()
  },
  action: {setBadgeText: async ({text}) => badgeTexts.push(text), setBadgeBackgroundColor: async () => {}, setBadgeTextColor: async () => {}, setTitle: async () => {}},
  contextMenus: {onClicked: event(), removeAll: async () => {}, create: () => {}},
  tabs: {sendMessage: async () => ({})}
};
await import('../extension/background.js');
const send = (message, url = 'chrome-extension://test/popup.html') => new Promise(resolve => {
  const handled = chrome.runtime.onMessage.listeners[0](message, {url}, resolve);
  if (!handled) resolve(undefined);
});

test('explicit video groups accept resources found elsewhere and retain read state', async () => {
  saved = {items: []};
  const {group} = await send({type: 'create-group', url: 'https://youtu.be/conscious?t=10', title: 'The myth of conscious AI'});
  assert.equal(group.url, 'https://www.youtube.com/watch?v=conscious');
  assert.equal((await send({type: 'list'})).groups.length, 1);
  assert.equal((await send({type: 'list'})).items.length, 0);
  await send({type: 'create-group', url: `${group.url}&t=90`, title: 'Same video'});
  assert.equal((await send({type: 'list'})).groups.length, 1);
  const {item} = await send({type: 'save', item: {url: 'https://www.nature.com/articles/example', title: 'Conscious AI article'}});
  assert.equal((await send({type: 'related'}, group.url)).items.length, 0);
  await send({type: 'associate', id: item.id, sourceUrl: group.url});
  let related = await send({type: 'related'}, `${group.url}&t=25`);
  assert.equal(related.items.length, 1);
  assert.equal(related.items[0].sourceTitle, group.title);
  await send({type: 'read', id: item.id, read: true});
  assert.equal((await send({type: 'related'}, group.url)).items.length, 0);
  await send({type: 'read', id: item.id, read: false});
  assert.equal((await send({type: 'related'}, group.url)).items.length, 1);
  const direct = await send({type: 'save', item: {url: item.url}});
  assert.ok((await send({type: 'associate', id: direct.item.id, sourceUrl: group.url})).error);
  await send({type: 'remove', id: item.id});
  assert.equal((await send({type: 'list'})).groups.length, 1);
  assert.equal((await send({type: 'related'}, group.url)).items.length, 0);
  const pasted = await send({type: 'save', item: {url: 'https://example.org/paper', sourceUrl: group.url, sourceTitle: group.title}});
  assert.equal((await send({type: 'related'}, group.url)).items[0].id, pasted.item.id);
  assert.equal((await send({type: 'list'})).items.find(entry => entry.id === direct.item.id).sourceUrl, '');
});

test('concurrent saves persist, survive duplicate capture, and drive unread reminders', async () => {
  saved = {items: []};
  const sourceUrl = 'https://www.youtube.com/watch?v=video';
  await Promise.all(Array.from({length: 12}, (_, i) => send({type: 'save', item: {url: `https://example.org/${i}`, sourceUrl}})));
  const {items} = await send({type: 'list'});
  assert.equal(items.length, 12);
  const duplicate = await send({type: 'save', item: {url: 'https://example.org/0', sourceUrl}});
  assert.equal(duplicate.duplicate, true);
  assert.equal((await send({type: 'related'}, `${sourceUrl}&t=40`)).items.length, 12);
  assert.equal((await send({type: 'related'}, 'https://www.youtube.com/watch?v=other')).items.length, 0);
  await send({type: 'read', id: items[0].id, read: true});
  assert.equal((await send({type: 'related'}, sourceUrl)).items.length, 11);
  await chrome.runtime.onInstalled.listeners[0]();
  assert.equal(badgeTexts.at(-1), '11');
  await send({type: 'edit', id: items[1].id, description: '  Check\n this paper '});
  assert.equal((await send({type: 'list'})).items[1].description, 'Check this paper');
  await send({type: 'remove', id: items[1].id});
  assert.equal((await send({type: 'list'})).items.length, 11);
  assert.equal(await send({type: 'remove', id: items[0].id}, 'https://example.org/'), undefined);
  assert.ok((await send({type: 'save', item: {url: 'file:///secret'}})).error);
});
