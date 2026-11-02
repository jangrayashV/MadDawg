import test from 'node:test';
import assert from 'node:assert/strict';
import {canonical, addResource} from '../extension/model.js';

test('YouTube timestamps, share links, playlists and mobile URLs match one source', () => {
  const expected = 'https://www.youtube.com/watch?v=abc123';
  for (const url of ['https://youtu.be/abc123?t=40', 'https://www.youtube.com/watch?v=abc123&t=20&list=xyz', 'https://m.youtube.com/watch?v=abc123', 'https://www.youtube.com/shorts/abc123']) assert.equal(canonical(url), expected);
  assert.notEqual(canonical('https://www.youtube.com/watch?v=different'), expected);
});
test('unwraps YouTube outbound links and rejects unsafe protocols', () => {
  assert.equal(canonical('https://www.youtube.com/redirect?q=https%3A%2F%2Fexample.org%2Fpaper'), 'https://example.org/paper');
  assert.throws(() => canonical('javascript:alert(1)'));
  assert.throws(() => canonical('https://www.youtube.com/redirect?q=javascript%3Aalert(1)'));
});
test('preserves meaningful queries and hash routes while removing known trackers', () => {
  assert.equal(canonical('https://example.org/?utm_source=x&id=3#article'), 'https://example.org/?id=3#article');
  assert.notEqual(canonical('https://example.org/?id=3'), canonical('https://example.org/?id=4'));
  assert.notEqual(canonical('https://example.org/#/one'), canonical('https://example.org/#/two'));
});
test('deduplicates within a source but preserves associations with other sources', () => {
  const input = {url: 'https://example.org/paper', sourceUrl: 'https://youtu.be/abc', title: 'A paper', description: '  Useful\n evidence '};
  const first = addResource([], input);
  assert.equal(first.item.description, 'Useful evidence');
  assert.equal(addResource(first.items, {...input, sourceUrl: 'https://www.youtube.com/watch?v=abc&t=12'}).duplicate, true);
  assert.equal(addResource(first.items, {...input, sourceUrl: 'https://example.org/article'}).items.length, 2);
});
