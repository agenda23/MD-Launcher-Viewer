// ビューアの表示テーマ（ライト／ダーク／システム）を storage と DOM に反映
(function (g) {
  const SYSTEM = 'system';

  function systemResolved() {
    return matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  }

  function resolve(mdTheme) {
    return mdTheme === SYSTEM ? systemResolved() : mdTheme;
  }

  async function readSetting() {
    const d = await chrome.storage.local.get('settings');
    const s = d.settings || {};
    return s.mdTheme === 'light' || s.mdTheme === 'dark' ? s.mdTheme : SYSTEM;
  }

  async function writeSetting(mdTheme) {
    const d = await chrome.storage.local.get('settings');
    const settings = Object.assign({ useViewer: false }, d.settings || {}, { mdTheme });
    await chrome.storage.local.set({ settings });
  }

  function apply(mdTheme, markdownBody) {
    const resolved = resolve(mdTheme);
    const html = document.documentElement;
    if (mdTheme === SYSTEM) {
      html.removeAttribute('data-theme');
      if (markdownBody) markdownBody.removeAttribute('data-theme');
    } else {
      html.setAttribute('data-theme', resolved);
      if (markdownBody) markdownBody.setAttribute('data-theme', resolved);
    }
    return resolved;
  }

  function toggleTarget(mdTheme) {
    return resolve(mdTheme) === 'dark' ? 'light' : 'dark';
  }

  function toggleLabel(mdTheme) {
    return resolve(mdTheme) === 'dark' ? 'ライト' : 'ダーク';
  }

  let systemMq = null;
  let systemMqFn = null;
  function watchSystem(mdTheme, markdownBody, onChange) {
    if (systemMq && systemMqFn) {
      systemMq.removeEventListener('change', systemMqFn);
      systemMq = null;
      systemMqFn = null;
    }
    if (mdTheme !== SYSTEM) return;
    systemMq = matchMedia('(prefers-color-scheme: dark)');
    systemMqFn = () => {
      apply(mdTheme, markdownBody);
      onChange();
    };
    systemMq.addEventListener('change', systemMqFn);
  }

  g.MDTheme = {
    SYSTEM, readSetting, writeSetting, apply, resolve, toggleTarget, toggleLabel, watchSystem,
  };
})(globalThis);