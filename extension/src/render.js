// Markdown → サニタイズ済みHTML を container に描画する
(function (g) {
  // file: を許可した URI ホワイトリスト（DOMPurify 既定は file: を除去するため）
  const URI_RE = /^(?:(?:(?:f|ht)tps?|file|mailto|tel):|[^a-z]|[a-z+.\-]+(?:[^a-z+.\-:]|$))/i;

  // baseUrl: 元ファイルの file:// URL
  // opts.viewerHref: 指定時、.md リンクを viewer ページ経由のリンクに書き換える関数
  function render(text, baseUrl, container, opts) {
    opts = opts || {};
    marked.setOptions({ gfm: true, breaks: false });
    const clean = DOMPurify.sanitize(marked.parse(text), { ALLOWED_URI_REGEXP: URI_RE });
    container.innerHTML = clean;

    const resolve = (v) => {
      if (!v || v.startsWith('#')) return null;
      try { return new URL(v, baseUrl).href; } catch (e) { return null; }
    };
    container.querySelectorAll('img[src]').forEach((el) => {
      const r = resolve(el.getAttribute('src'));
      if (r) el.setAttribute('src', r);
    });
    container.querySelectorAll('a[href]').forEach((el) => {
      const r = resolve(el.getAttribute('href'));
      if (!r) return;
      const isMd = /^file:/i.test(r) && MDUtil.isMdUrl(r);
      el.setAttribute('href', opts.viewerHref && isMd ? opts.viewerHref(r) : r);
    });
    container.querySelectorAll('pre code').forEach((el) => {
      try { hljs.highlightElement(el); } catch (e) { /* 無視 */ }
    });
    const h1 = container.querySelector('h1');
    return h1 ? h1.textContent.trim() : '';
  }

  function mountThemeBar(bar, body) {
    const themeBtn = document.createElement('button');
    themeBtn.type = 'button';
    themeBtn.title = 'ライト／ダーク表示を切り替え';
    bar.appendChild(themeBtn);
    let mdTheme = MDTheme.SYSTEM;

    const syncThemeUi = () => {
      MDTheme.apply(mdTheme, body);
      themeBtn.textContent = MDTheme.toggleLabel(mdTheme);
      MDTheme.watchSystem(mdTheme, body, () => { themeBtn.textContent = MDTheme.toggleLabel(mdTheme); });
    };

    themeBtn.addEventListener('click', async () => {
      mdTheme = MDTheme.toggleTarget(mdTheme);
      await MDTheme.writeSetting(mdTheme);
      syncThemeUi();
    });

    MDTheme.readSetting().then((t) => {
      mdTheme = t;
      syncThemeUi();
    });

    chrome.storage.onChanged.addListener((ch, area) => {
      if (area !== 'local' || !ch.settings) return;
      const next = ch.settings.newValue && ch.settings.newValue.mdTheme;
      if (next === 'light' || next === 'dark' || next === MDTheme.SYSTEM) {
        mdTheme = next;
        syncThemeUi();
      }
    });
  }

  // レンダリング／ソース表示の切り替えUI付きで描画
  function mount(root, text, baseUrl, opts) {
    root.textContent = '';
    const bar = document.createElement('div');
    bar.className = 'mdlv-bar';
    const body = document.createElement('article');
    body.className = 'markdown-body mdlv-body';
    mountThemeBar(bar, body);
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.textContent = 'ソース表示';
    bar.appendChild(btn);
    const src = document.createElement('pre');
    src.className = 'mdlv-source';
    src.hidden = true;
    src.textContent = text;
    root.append(bar, body, src);
    const title = render(text, baseUrl, body, opts);
    let showSrc = false;
    btn.addEventListener('click', () => {
      showSrc = !showSrc;
      body.hidden = showSrc;
      src.hidden = !showSrc;
      btn.textContent = showSrc ? 'レンダリング表示' : 'ソース表示';
    });
    return title;
  }

  g.MDRender = { render, mount };
})(globalThis);
