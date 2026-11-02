import {canonical} from './model.js';
const $ = selector => document.querySelector(selector);
let items = [];
let sources = [];
let activeFilter = 'all';
const collapsed = new Set();
function fillDestinations(select, selected = '') {
  select.replaceChildren();
  const standalone = node('option', 'Ungrouped'); standalone.value = ''; select.append(standalone);
  for (const group of sources) {
    const option = node('option', group.title); option.value = group.url; select.append(option);
  }
  select.value = sources.some(group => group.url === selected) ? selected : '';
}
function association() {
  const group = sources.find(group => group.url === $('#destination').value);
  return {sourceUrl: group?.url || '', sourceTitle: group?.title || ''};
}
async function request(message) {
  const result = await chrome.runtime.sendMessage(message);
  if (result.error) throw new Error(result.error);
  return result;
}
function report(error) { $('#status').textContent = error.message; }
function node(tag, text, className) {
  const element = document.createElement(tag);
  if (text) element.textContent = text;
  if (className) element.className = className;
  return element;
}
function link(title, url) {
  const element = node('a', title); element.href = url; element.target = '_blank'; element.rel = 'noopener noreferrer'; return element;
}
function button(title, action) {
  const element = node('button', title);
  element.onclick = async () => {
    element.disabled = true;
    try { await action(); } catch (error) { report(error); }
    finally { element.disabled = false; }
  };
  return element;
}
async function refresh(selected = $('#destination').value) {
  const result = await request({type: 'list'});
  items = result.items; sources = result.groups;
  fillDestinations($('#destination'), selected);
  const groupFilter = $('#group-filter');
  const previousGroup = groupFilter.value;
  fillDestinations(groupFilter);
  const all = node('option', 'All groups'); all.value = 'all'; groupFilter.prepend(all);
  groupFilter.value = [...groupFilter.options].some(option => option.value === previousGroup) ? previousGroup : 'all';
  fillManagedResources();
  render();
}
function render() {
  const query = $('#search').value.trim().toLowerCase();
  const filter = activeFilter;
  const selectedGroup = $('#group-filter').value;
  const visible = items.filter(item => (selectedGroup === 'all' || item.sourceUrl === selectedGroup) && (filter === 'all' || item.read === (filter === 'read')) && `${item.title} ${item.description} ${item.sourceTitle} ${item.url}`.toLowerCase().includes(query));
  $('#count').textContent = String(items.length);
  $('#library-meta').textContent = `${items.filter(item => !item.read).length} unread`;
  $('#result-count').textContent = `${visible.length} ${visible.length === 1 ? 'link' : 'links'}${query || filter !== 'all' || selectedGroup !== 'all' ? ' found' : ' saved'}`;
  const list = $('#list'); list.replaceChildren();
  const groups = new Map();
  for (const item of visible) {
    if (!groups.has(item.sourceUrl)) groups.set(item.sourceUrl, []);
    groups.get(item.sourceUrl).push(item);
  }
  if (filter === 'all') {
    for (const group of sources) {
      if ((selectedGroup === 'all' || selectedGroup === group.url) && !items.some(item => item.sourceUrl === group.url) && group.title.toLowerCase().includes(query)) groups.set(group.url, []);
    }
  }
  if (!groups.size) {
    const empty = node('div', '', 'empty');
    const symbol = node('span', '↗', 'empty-symbol'); symbol.setAttribute('aria-hidden', 'true');
    const hasData = items.length || sources.length;
    empty.append(symbol, node('strong', hasData ? 'No matching finds.' : 'A home for your good finds.'), node('p', hasData ? 'Try another search or change your filters.' : 'Hit + Add to save a page or drop in a link for later.'));
    list.append(empty);
  }
  for (const [source, resources] of groups) {
    const section = node('details', '', 'group'); section.open = !collapsed.has(source);
    section.ontoggle = () => { if (section.open) collapsed.delete(source); else collapsed.add(source); };
    const heading = node('summary');
    const groupTitle = sources.find(group => group.url === source)?.title || resources[0]?.sourceTitle;
    const unread = items.filter(item => item.sourceUrl === source && !item.read).length;
    heading.append(node('span', source ? groupTitle : 'Ungrouped', 'group-name'), node('span', `${unread} unread`, 'group-count'));
    if (source) {
      const origin = link('↗', source); origin.className = 'source-link'; origin.title = 'Open source'; origin.setAttribute('aria-label', `Open source: ${groupTitle}`);
      origin.onclick = event => event.stopPropagation(); heading.append(origin);
    }
    section.append(heading); list.append(section);
    if (!resources.length) section.append(node('p', 'No links yet.', 'group-empty'));
    for (const item of resources) {
      const card = node('article', '', item.read ? 'is-read' : '');
      const row = node('div', '', 'resource-row');
      const read = node('span', '', 'read-indicator'); read.title = item.read ? 'Read' : 'Unread'; read.setAttribute('role', 'img'); read.setAttribute('aria-label', read.title);
      const body = node('div', '', 'resource-body');
      const title = link(item.title, item.url); title.className = 'title'; body.append(title);
      if (item.description) body.append(node('p', item.description, 'description'));
      body.append(node('span', new URL(item.url).hostname.replace(/^www\./, ''), 'domain'));
      row.append(read, body); card.append(row);
      section.append(card);
    }
  }
}
$('#save').onclick = async () => {
  $('#save').disabled = true;
  try {
    const [tab] = await chrome.tabs.query({active: true, currentWindow: true});
    const metadata = await chrome.tabs.sendMessage(tab.id, {type: 'metadata'}).catch(() => ({}));
    const result = await request({type: 'save', item: {url: tab.url, title: metadata.title || tab.title, description: metadata.description, ...association()}});
    $('#status').textContent = result.duplicate ? 'Already saved.' : 'Saved.';
    await refresh();
  } catch (error) { report(error); }
  finally { $('#save').disabled = false; }
};
$('#create-group').onclick = async () => {
  $('#create-group').disabled = true;
  try {
    const [tab] = await chrome.tabs.query({active: true, currentWindow: true});
    const metadata = await chrome.tabs.sendMessage(tab.id, {type: 'metadata'}).catch(() => ({}));
    const {group} = await request({type: 'create-group', url: tab.url, title: metadata.title || tab.title});
    await refresh(group.url);
    $('#status').textContent = 'Group created.';
  } catch (error) { report(error); }
  finally { $('#create-group').disabled = false; }
};
$('#add-link').onsubmit = async event => {
  event.preventDefault();
  const submit = $('#add-link button'); submit.disabled = true;
  try {
    const result = await request({type: 'save', item: {url: $('#resource-url').value.trim(), title: $('#resource-title').value,
      description: $('#resource-description').value, ...association()}});
    $('#status').textContent = result.duplicate ? 'Already saved.' : 'Link saved.';
    $('#add-link').reset();
    await refresh();
  } catch (error) { report(error); }
  finally { submit.disabled = false; }
};
function setPanel(id, open) {
  const toggle = id === 'capture' ? '#add-toggle' : '#manage-toggle';
  $(`#${id}`).hidden = !open;
  $(toggle).setAttribute('aria-expanded', String(open));
  if (open) {
    const other = id === 'capture' ? 'manage' : 'capture';
    setPanel(other, false);
    $('#status').textContent = '';
  }
}
$('#add-toggle').onclick = () => setPanel('capture', $('#capture').hidden);
$('#manage-toggle').onclick = () => {
  setPanel('manage', $('#manage').hidden);
  if (!$('#manage').hidden) $('#selected-resource').focus();
};
function fillManagedResources() {
  const select = $('#selected-resource');
  const previous = select.value;
  select.replaceChildren();
  for (const item of items) {
    const option = node('option', `${item.title} · ${item.sourceTitle || 'Ungrouped'}`);
    option.value = item.id; select.append(option);
  }
  if (items.some(item => item.id === previous)) select.value = previous;
  if (!items.length) select.append(node('option', 'No saved links yet'));
  select.disabled = !items.length;
  $('#manage-toggle').disabled = !items.length;
  renderActions();
}
function renderActions() {
  const item = items.find(item => item.id === $('#selected-resource').value);
  const actions = $('#resource-actions'); actions.replaceChildren();
  $('#editor').replaceChildren();
  if (!item) return;
  actions.append(
    button(item.read ? 'Mark unread' : 'Mark read', async () => {
      await request({type: 'read', id: item.id, read: !item.read}); await refresh();
      $('#status').textContent = item.read ? 'Marked unread.' : 'Marked read.';
    }),
    button(item.description ? 'Edit line' : 'Add a line', () => {
      const editor = node('form', '', 'editor');
      const input = node('input'); input.value = item.description; input.maxLength = 240;
      input.setAttribute('aria-label', 'Edit one-line description');
      const submit = node('button', 'Save'); submit.type = 'submit';
      const cancel = button('Cancel', () => { $('#editor').replaceChildren(); }); cancel.type = 'button';
      editor.append(input, submit, cancel);
      editor.onsubmit = async event => {
        event.preventDefault(); submit.disabled = true;
        try { await request({type: 'edit', id: item.id, description: input.value}); await refresh(); $('#status').textContent = 'Line saved.'; }
        catch (error) { report(error); submit.disabled = false; }
      };
      $('#editor').replaceChildren(editor); input.focus();
    }),
    button('Move', () => {
      const editor = node('div', '', 'editor');
      const select = node('select'); select.setAttribute('aria-label', 'Move resource to source group'); fillDestinations(select, item.sourceUrl);
      editor.append(select, button('Move', async () => {
        await request({type: 'associate', id: item.id, sourceUrl: select.value}); await refresh(); $('#status').textContent = 'Link moved.';
      }), button('Cancel', () => $('#editor').replaceChildren()));
      $('#editor').replaceChildren(editor); select.focus();
    }),
    button('Remove', async () => {
      await request({type: 'remove', id: item.id}); await refresh(); $('#status').textContent = 'Link removed.';
      if (!items.length) setPanel('manage', false);
    })
  );
}
$('#selected-resource').onchange = renderActions;
document.addEventListener('keydown', event => {
  const editing = event.target.matches('input, textarea, select, [contenteditable]');
  if (event.key === '/' && !editing && !event.ctrlKey && !event.metaKey && !event.altKey) {
    event.preventDefault(); $('#search').focus(); return;
  }
  if (event.key !== 'Escape') return;
  if ($('#editor').childElementCount) { $('#editor').replaceChildren(); $('#selected-resource').focus(); }
  else if (!$('#manage').hidden) { setPanel('manage', false); $('#manage-toggle').focus(); }
  else if (!$('#capture').hidden) { setPanel('capture', false); $('#add-toggle').focus(); }
  else if ($('#search').value) { $('#search').value = ''; render(); }
});
$('#search').oninput = render;
$('#group-filter').onchange = render;
document.querySelectorAll('[data-filter]').forEach(tab => {
  tab.onclick = () => {
    activeFilter = tab.dataset.filter;
    document.querySelectorAll('[data-filter]').forEach(button => button.setAttribute('aria-pressed', String(button === tab)));
    render();
  };
});
async function initialize() {
  const [tab] = await chrome.tabs.query({active: true, currentWindow: true});
  let current = '';
  try { current = canonical(tab?.url); } catch { /* Internal browser pages have no source group. */ }
  await refresh(current);
}
initialize().catch(report);
