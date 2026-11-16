# MD Launcher & Viewer

仕様: `docs/MD Launcher & Viewer 仕様.md`

## インストール
1. `chrome://extensions` で「デベロッパーモード」をON
2. 「パッケージ化されていない拡張機能を読み込む」→ `extension/` を選択
3. 本拡張の詳細画面で **「ファイルのURLへのアクセスを許可する」** をON

## 構成
- `extension/src/panel.*` 登録リストUI（ポップアップ／オプションページ）
- `extension/src/content.js` `file:///*.md` のレンダリング
- `extension/src/viewer.*` ダウンロード扱いになる環境向けフォールバック
- `extension/lib/` marked / DOMPurify / highlight.js / github-markdown-css（バンドル済み）
