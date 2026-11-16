// フォールバックビューア: viewer.html?src=<file:// URL> を fetch して描画
(async function () {
  const root = document.getElementById('root');
  const msg = (t) => {
    root.textContent = '';
    const p = document.createElement('p');
    p.style.cssText = 'padding:24px;font:14px system-ui';
    p.textContent = t;
    root.appendChild(p);
  };
  const src = new URLSearchParams(location.search).get('src');
  const url = src && MDUtil.toFileUrl(src);
  if (!url || !MDUtil.isMdUrl(url)) return msg('表示できるURLが指定されていません。');
  try {
    const res = await fetch(url);
    if (!res.ok) throw new Error(String(res.status));
    const text = await res.text();
    const title = MDRender.mount(root, text, url, {
      viewerHref: (u) => location.pathname + '?src=' + encodeURIComponent(u),
    });
    document.title = (title || MDUtil.fileName(url)) + ' - MD Viewer';
  } catch (e) {
    chrome.extension.isAllowedFileSchemeAccess((ok) => {
      msg(ok
        ? 'ファイルが見つかりません: ' + MDUtil.decodedPath(url)
        : '拡張機能の詳細画面で「ファイルのURLへのアクセスを許可する」をONにしてください。');
    });
  }
})();
