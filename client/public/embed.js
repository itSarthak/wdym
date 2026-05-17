(function () {
  'use strict';

  var script = document.currentScript ||
    (function () {
      var scripts = document.querySelectorAll('script[data-survey]');
      return scripts[scripts.length - 1];
    })();

  if (!script) return;

  var slug     = script.getAttribute('data-survey');
  var mode     = script.getAttribute('data-mode')     || 'popup';
  var label    = script.getAttribute('data-label')    || 'Give Feedback';
  var position = script.getAttribute('data-position') || 'bottom-right';
  var color    = script.getAttribute('data-color')    || '#09090b';

  if (!slug) return;

  var origin = (function () {
    try { return new URL(script.src).origin; } catch (_) { return window.location.origin; }
  })();

  var surveyUrl = origin + '/s/' + slug + '?embed=1';

  /* ── Inline mode ─────────────────────────────────────────────────── */
  if (mode === 'inline') {
    var iframe = document.createElement('iframe');
    iframe.src = surveyUrl;
    iframe.setAttribute('frameborder', '0');
    iframe.setAttribute('allowtransparency', 'true');
    iframe.setAttribute('title', 'Survey');
    iframe.style.cssText = 'width:100%;height:600px;border:none;border-radius:8px;display:block;';
    if (script.parentNode) script.parentNode.insertBefore(iframe, script.nextSibling);
    return;
  }

  /* ── Popup mode ──────────────────────────────────────────────────── */
  var POS = {
    'bottom-right': 'bottom:24px;right:24px;',
    'bottom-left':  'bottom:24px;left:24px;',
    'top-right':    'top:24px;right:24px;',
    'top-left':     'top:24px;left:24px;',
  };
  var posStyle = POS[position] || POS['bottom-right'];

  var css =
    '.__wdym-trigger{position:fixed;' + posStyle +
    'z-index:2147483646;background:' + color + ';color:#fff;border:none;border-radius:9999px;' +
    'padding:11px 22px;font-size:13px;font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;' +
    'font-weight:500;cursor:pointer;box-shadow:0 2px 12px rgba(0,0,0,0.25);' +
    'transition:transform 0.15s,box-shadow 0.15s;white-space:nowrap;}' +
    '.__wdym-trigger:hover{transform:translateY(-1px);box-shadow:0 4px 20px rgba(0,0,0,0.32);}' +
    '.__wdym-overlay{display:none;position:fixed;inset:0;background:rgba(0,0,0,0.45);' +
    'z-index:2147483647;align-items:center;justify-content:center;}' +
    '.__wdym-overlay.open{display:flex;animation:__wdymFadeIn 0.2s ease;}' +
    '.__wdym-modal{background:#fff;border-radius:16px;width:min(540px,94vw);height:min(680px,90vh);' +
    'overflow:hidden;position:relative;box-shadow:0 24px 80px rgba(0,0,0,0.35);' +
    'animation:__wdymSlideUp 0.25s ease;}' +
    '.__wdym-close{position:absolute;top:10px;right:10px;z-index:2;background:rgba(0,0,0,0.07);' +
    'border:none;border-radius:50%;width:30px;height:30px;cursor:pointer;font-size:14px;' +
    'color:#555;display:flex;align-items:center;justify-content:center;transition:background 0.15s;}' +
    '.__wdym-close:hover{background:rgba(0,0,0,0.14);}' +
    '.__wdym-frame{width:100%;height:100%;border:none;display:block;}' +
    '@keyframes __wdymFadeIn{from{opacity:0}to{opacity:1}}' +
    '@keyframes __wdymSlideUp{from{opacity:0;transform:translateY(16px)}to{opacity:1;transform:translateY(0)}}';

  var styleEl = document.createElement('style');
  styleEl.textContent = css;
  (document.head || document.documentElement).appendChild(styleEl);

  /* ── DOM ─────────────────────────────────────────────────────────── */
  var btn = document.createElement('button');
  btn.className = '__wdym-trigger';
  btn.textContent = label;
  btn.setAttribute('aria-label', label);

  var overlay = document.createElement('div');
  overlay.className = '__wdym-overlay';
  overlay.setAttribute('role', 'dialog');
  overlay.setAttribute('aria-modal', 'true');
  overlay.setAttribute('aria-label', label);

  var modal = document.createElement('div');
  modal.className = '__wdym-modal';

  var closeBtn = document.createElement('button');
  closeBtn.className = '__wdym-close';
  closeBtn.innerHTML = '&#10005;';
  closeBtn.setAttribute('aria-label', 'Close');

  var frame = document.createElement('iframe');
  frame.className = '__wdym-frame';
  frame.setAttribute('frameborder', '0');
  frame.setAttribute('title', label);

  modal.appendChild(closeBtn);
  modal.appendChild(frame);
  overlay.appendChild(modal);
  document.body.appendChild(btn);
  document.body.appendChild(overlay);

  /* ── Logic ───────────────────────────────────────────────────────── */
  function openModal() {
    frame.src = surveyUrl;
    overlay.classList.add('open');
    document.body.style.overflow = 'hidden';
    closeBtn.focus();
  }

  function closeModal() {
    overlay.classList.remove('open');
    frame.src = '';
    document.body.style.overflow = '';
    btn.focus();
  }

  btn.addEventListener('click', openModal);
  closeBtn.addEventListener('click', closeModal);
  overlay.addEventListener('click', function (e) { if (e.target === overlay) closeModal(); });
  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape' && overlay.classList.contains('open')) closeModal();
  });

  /* Auto-close after survey submission */
  window.addEventListener('message', function (e) {
    if (e.data && e.data.type === 'wdym:submitted') setTimeout(closeModal, 1200);
  });
})();
