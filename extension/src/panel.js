// 登録リストの管理UI（ポップアップ／オプションページ共用）
(function () {
  const $ = (id) => document.getElementById(id);
  const VIEWER = chrome.runtime.getURL('src/viewer.html');
  let items = [];
  let settings = { useViewer: false };
  let editingId = null;

  const params = new URLSearchParams(location.search);
  const isSide = params.has('side');
  const isPopup = !isSide && !params.has('full');
  if (!isPopup) document.body.classList.add('full');
  if (isSide) document.body.classList.add('side');

  // ---------- storage ----------
  async function load() {
    const d = await chrome.storage.local.get(['items', 'settings']);
    items = d.items || [];
    settings = Object.assign(settings, d.settings || {});
  }
  const save = () => chrome.storage.local.set({ items, settings });

  function status(t) { $('status').textContent = t; }

  // ---------- 登録 ----------
  // タブから対象の .md URL を取り出す（通常タブ／ビューアタブ）
  function tabMdUrl(tab) {
    if (!tab.url) return null;
    let u = tab.url;
    if (u.startsWith(VIEWER)) u = new URLSearchParams(new URL(u).search).get('src');
    const n = u && MDUtil.toFileUrl(u);
    return n && MDUtil.isMdUrl(n) ? n : null;
  }

  // 追加して { added, dup } を返す（保存は呼び出し側）
  function addUrls(urls) {
    let added = 0, dup = 0;
    for (const url of urls) {
      if (items.some((i) => i.url === url)) { dup++; continue; }
      items.push({
        id: crypto.randomUUID(), url, name: MDUtil.fileName(url),
        tags: [], memo: '', createdAt: new Date().toISOString(),
      });
      added++;
    }
    return { added, dup };
  }

  async function finishAdd(r, invalid) {
    await save();
    render();
    status(`追加 ${r.added} 件・重複 ${r.dup} 件` + (invalid ? `・無効 ${invalid} 件` : ''));
  }

  async function addCurrent() {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    const url = tab && tabMdUrl(tab);
    if (!url) return status('現在のタブは .md / .markdown のファイルではありません。');
    await finishAdd(addUrls([url]), 0);
  }

  async function addAllTabs() {
    const tabs = await chrome.tabs.query({ currentWindow: true });
    const urls = [...new Set(tabs.map(tabMdUrl).filter(Boolean))];
    if (!urls.length) return status('開いている .md タブがありません。');
    await finishAdd(addUrls(urls), 0);
  }

  async function addPasted() {
    const lines = $('pasteText').value.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
    const urls = [];
    let invalid = 0;
    for (const l of lines) {
      const n = MDUtil.toFileUrl(l);
      if (n && MDUtil.isMdUrl(n)) urls.push(n); else invalid++;
    }
    await finishAdd(addUrls([...new Set(urls)]), invalid);
    $('pasteText').value = '';
  }

  // ---------- 起動 ----------
  async function open(item) {
    const target = settings.useViewer ? VIEWER + '?src=' + encodeURIComponent(item.url) : item.url;
    const tabs = await chrome.tabs.query({});
    const found = tabs.find((t) => tabMdUrl(t) === item.url);
    if (found) {
      await chrome.tabs.update(found.id, { active: true, url: target === found.url ? undefined : target });
      if (target === found.url) await chrome.tabs.reload(found.id);
      await chrome.windows.update(found.windowId, { focused: true });
    } else {
      await chrome.tabs.create({ url: target });
    }
    if (isPopup) window.close();
  }

  // ---------- 一覧描画 ----------
  function visibleItems() {
    const q = $('search').value.trim().toLowerCase();
    const tag = $('tagFilter').value;
    return items.filter((i) => {
      if (tag && !i.tags.includes(tag)) return false;
      if (!q) return true;
      return [i.name, MDUtil.decodedPath(i.url), i.memo, ...i.tags].join('\n').toLowerCase().includes(q);
    });
  }

  function renderTagFilter() {
    const sel = $('tagFilter');
    const cur = sel.value;
    const tags = [...new Set(items.flatMap((i) => i.tags))].sort();
    sel.textContent = '';
    sel.add(new Option('すべてのタグ', ''));
    tags.forEach((t) => sel.add(new Option(t, t)));
    sel.value = tags.includes(cur) ? cur : '';
  }

  function el(tag, props, ...kids) {
    const e = document.createElement(tag);
    Object.assign(e, props || {});
    kids.forEach((k) => e.append(k));
    return e;
  }

  function render() {
    renderTagFilter();
    const ul = $('list');
    ul.textContent = '';
    const list = visibleItems();
    $('empty').hidden = list.length > 0;
    $('empty').textContent = items.length ? '該当するファイルがありません。' : '登録されたファイルはありません。';
    for (const item of list) ul.appendChild(editingId === item.id ? editRow(item) : viewRow(item));
  }

  function viewRow(item) {
    const li = el('li');
    const name = el('button', { className: 'name', title: '開く', textContent: item.name });
    name.addEventListener('click', () => open(item));
    li.append(name, el('div', { className: 'path', textContent: MDUtil.decodedPath(item.url) }));
    const tags = el('div');
    item.tags.forEach((t) => {
      const b = el('span', { className: 'tag', textContent: t });
      b.addEventListener('click', () => { $('tagFilter').value = t; render(); });
      tags.appendChild(b);
    });
    li.appendChild(tags);
    if (item.memo) li.appendChild(el('div', { className: 'memo', textContent: item.memo }));
    const edit = el('button', { textContent: '編集' });
    edit.addEventListener('click', () => { editingId = item.id; render(); });
    const del = el('button', { textContent: '削除' });
    del.addEventListener('click', async () => {
      items = items.filter((i) => i.id !== item.id);
      await save(); render(); status('一覧から削除しました（ファイルは削除されません）。');
    });
    li.appendChild(el('div', { className: 'actions' }, edit, del));
    return li;
  }

  function editRow(item) {
    const li = el('li', { className: 'edit' });
    const name = el('input', { type: 'text', value: item.name });
    const tags = el('input', { type: 'text', value: item.tags.join(', ') });
    const memo = el('textarea', { rows: 3, value: item.memo });
    const ok = el('button', { className: 'primary', textContent: '保存' });
    const cancel = el('button', { textContent: 'キャンセル' });
    ok.addEventListener('click', async () => {
      item.name = name.value.trim() || MDUtil.fileName(item.url);
      item.tags = [...new Set(tags.value.split(/[,、]/).map((t) => t.trim()).filter(Boolean))];
      item.memo = memo.value;
      editingId = null;
      await save(); render();
    });
    cancel.addEventListener('click', () => { editingId = null; render(); });
    li.append(
      el('div', { className: 'path', textContent: MDUtil.decodedPath(item.url) }),
      el('label', { textContent: '表示名' }, name),
      el('label', { textContent: 'タグ（カンマ区切り）' }, tags),
      el('label', { textContent: 'メモ' }, memo),
      el('div', { className: 'actions' }, ok, cancel),
    );
    return li;
  }

  // ---------- 初期化 ----------
  async function init() {
    await load();
    chrome.extension.isAllowedFileSchemeAccess((ok) => { $('banner').hidden = ok; });
    $('useViewer').checked = settings.useViewer;
    $('useViewer').addEventListener('change', () => { settings.useViewer = $('useViewer').checked; save(); });
    $('addCurrent').addEventListener('click', addCurrent);
    $('addAllTabs').addEventListener('click', addAllTabs);
    $('pasteAdd').addEventListener('click', addPasted);
    $('search').addEventListener('input', render);
    $('tagFilter').addEventListener('change', render);

    // 対象外タブでは「このファイルを登録」を無効化（サイドパネルではタブ切替に追従）
    const refreshCurrent = async () => {
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      $('addCurrent').disabled = !(tab && tabMdUrl(tab));
    };
    refreshCurrent();
    if (isSide) {
      chrome.tabs.onActivated.addListener(refreshCurrent);
      chrome.tabs.onUpdated.addListener((id, info) => { if (info.url || info.status === 'complete') refreshCurrent(); });
    }
    // 他のパネル／ページでの変更を反映
    chrome.storage.onChanged.addListener(async (ch, area) => {
      if (area !== 'local' || (!ch.items && !ch.settings)) return;
      await load();
      $('useViewer').checked = settings.useViewer;
      render();
    });

    // ポップアップ／設定ページからサイドパネルを開く
    if (isSide) {
      $('openSide').hidden = true;
    } else {
      $('openSide').addEventListener('click', async () => {
        const w = await chrome.windows.getCurrent();
        chrome.sidePanel.open({ windowId: w.id });
        if (isPopup) window.close();
      });
    }
    render();
  }
  init();
})();
