// file:// URL の判定・正規化ユーティリティ（panel / viewer / content で共用）
(function (g) {
  const MD_RE = /\.(md|markdown)$/i;

  // 絶対パス or file:// URL を正規化された file:// URL にする。不正なら null
  function toFileUrl(input) {
    const s = String(input || '').trim().replace(/^["'](.*)["']$/, '$1');
    if (!s) return null;
    try {
      if (/^file:\/\//i.test(s)) return fromPathname(new URL(s).pathname);
      if (/^[a-zA-Z]:[\\/]/.test(s)) return fromPathname('/' + s.replace(/\\/g, '/'));
      if (s.startsWith('/')) return fromPathname(s);
    } catch (e) { /* 不正入力は null */ }
    return null;
  }

  function fromPathname(p) {
    let decoded = p;
    try { decoded = decodeURIComponent(p); } catch (e) { /* そのまま */ }
    return ('file://' + decoded.split('/').map(encodeURIComponent).join('/'))
      .replace(/^file:\/\/\/([A-Za-z])%3A/, 'file:///$1:');
  }

  function isMdUrl(url) {
    const n = toFileUrl(url);
    return !!n && MD_RE.test(n);
  }

  function decodedPath(url) {
    try { return decodeURIComponent(new URL(url).pathname); } catch (e) { return url; }
  }

  function fileName(url) {
    const p = decodedPath(url);
    return p.substring(p.lastIndexOf('/') + 1) || p;
  }

  g.MDUtil = { toFileUrl, isMdUrl, decodedPath, fileName };
})(globalThis);
