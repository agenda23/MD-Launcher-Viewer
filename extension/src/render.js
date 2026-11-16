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

  // レンダリング／ソース表示の切り替えUI付きで描画
  function mount(root, text, baseUrl, opts) {
    root.textContent = '';
    const bar = document.createElement('div');
    bar.className = 'mdlv-bar';
    const btn = document.createElement('button');
    btn.textContent = 'ソース表示';
    bar.appendChild(btn);
    const body = document.createElement('article');
    body.className = 'markdown-body mdlv-body';
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
