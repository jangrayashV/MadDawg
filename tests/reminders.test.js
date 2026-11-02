import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {readFileSync} from 'node:fs';

test('reminders return on tab revisit, clear when read, and follow video navigation', async () => {
  const elements = [];
  const listeners = {};
  let onStorage, poll;
  let items = [];
  const element = () => ({
    style: {}, children: [], removed: false,
    setAttribute() {}, append(...children) { this.children.push(...children); },
    remove() { this.removed = true; }, attachShadow() { this.shadow = element(); return this.shadow; }
  });
  const document = {
    visibilityState: 'visible',
    addEventListener(name, fn) { listeners[name] = fn; },
    createElement() { return element(); },
    documentElement: {append(host) { elements.push(host); }}
  };
  const location = {href: 'https://www.youtube.com/watch?v=one'};
  vm.runInNewContext(readFileSync(new URL('../extension/content.js', import.meta.url), 'utf8'), {
    document, location,
    chrome: {
      runtime: {sendMessage: async () => ({items}), onMessage: {addListener() {}}},
      storage: {onChanged: {addListener(fn) { onStorage = fn; }}}
    },
    setInterval(fn) { poll = fn; }, setTimeout() {}, HTMLAnchorElement: class {}
  });
  const flush = () => new Promise(resolve => setImmediate(resolve));
  await flush();
  assert.equal(elements.length, 0);
  items = [{title: 'Related paper', description: 'Mentioned in video', url: 'https://example.org/paper'}];
  listeners.visibilitychange();
  await flush();
  assert.equal(elements.length, 1);
  const section = elements.at(-1).shadow.children[1];
  assert.match(section.children[0].children[0].textContent, /1 unread resource/);
  section.children[0].children[1].onclick();
  assert.equal(elements.at(-1).removed, true);
  listeners.visibilitychange();
  await flush();
  assert.equal(elements.at(-1).removed, false);
  items = [];
  onStorage({items: {}}, 'local');
  await flush();
  assert.equal(elements.at(-1).removed, true);
  items = [{title: 'Second video paper', url: 'https://example.org/two'}];
  location.href = 'https://www.youtube.com/watch?v=two'; poll();
  await flush();
  assert.equal(elements.at(-1).removed, false);
});
