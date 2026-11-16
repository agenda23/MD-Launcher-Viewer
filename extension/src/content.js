// file:///*.md を開いたとき、生テキストをMarkdownレンダリングに差し替える
(function () {
  const pre = document.querySelector('body > pre');
  if (!pre || document.body.children.length !== 1) return; // テキスト表示でなければ何もしない
  const text = pre.textContent;
  document.body.textContent = '';
  document.body.classList.add('mdlv-root');
  const root = document.createElement('div');
  document.body.appendChild(root);
  const title = MDRender.mount(root, text, location.href);
  if (title) document.title = title;
})();
