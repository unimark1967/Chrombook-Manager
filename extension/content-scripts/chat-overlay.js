// Chromebook Manager - Chat Overlay Content Script
// Injects a non-intrusive notification overlay for teacher messages.

(function () {
  'use strict';

  if (window.__cbmOverlayInitialized) return;
  window.__cbmOverlayInitialized = true;

  const OVERLAY_ID = 'cbm-chat-overlay';
  const TOAST_DURATION = 6000;

  // ── Styles ────────────────────────────────────────────────────────────────

  const style = document.createElement('style');
  style.textContent = `
    #cbm-chat-overlay {
      position: fixed;
      bottom: 20px;
      right: 20px;
      z-index: 2147483647;
      display: flex;
      flex-direction: column;
      gap: 10px;
      pointer-events: none;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
    }

    .cbm-toast {
      pointer-events: auto;
      background: #1e293b;
      color: #f8fafc;
      border-radius: 12px;
      padding: 14px 18px;
      max-width: 340px;
      min-width: 240px;
      box-shadow: 0 8px 30px rgba(0,0,0,0.35);
      display: flex;
      align-items: flex-start;
      gap: 12px;
      animation: cbm-slide-in 0.3s ease-out;
      border-left: 4px solid #6366f1;
    }

    .cbm-toast.cbm-toast-announcement {
      border-left-color: #6366f1;
    }

    .cbm-toast.cbm-toast-private {
      border-left-color: #0ea5e9;
    }

    .cbm-toast.cbm-toast-reaction {
      border-left-color: #f59e0b;
    }

    .cbm-toast-icon {
      flex-shrink: 0;
      width: 36px;
      height: 36px;
      border-radius: 50%;
      background: #334155;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 16px;
    }

    .cbm-toast-body {
      flex: 1;
      min-width: 0;
    }

    .cbm-toast-sender {
      font-size: 12px;
      font-weight: 600;
      color: #94a3b8;
      margin-bottom: 3px;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }

    .cbm-toast-text {
      font-size: 14px;
      color: #f1f5f9;
      line-height: 1.4;
      word-break: break-word;
    }

    .cbm-toast-close {
      flex-shrink: 0;
      background: transparent;
      border: none;
      color: #64748b;
      cursor: pointer;
      font-size: 18px;
      line-height: 1;
      padding: 0;
      margin-left: 4px;
    }

    .cbm-toast-close:hover {
      color: #f1f5f9;
    }

    .cbm-lock-banner {
      position: fixed;
      top: 0;
      left: 0;
      right: 0;
      background: #ef4444;
      color: white;
      text-align: center;
      padding: 10px 16px;
      font-size: 14px;
      font-weight: 600;
      z-index: 2147483647;
      pointer-events: none;
      animation: cbm-slide-down 0.3s ease-out;
    }

    @keyframes cbm-slide-in {
      from { opacity: 0; transform: translateX(20px); }
      to   { opacity: 1; transform: translateX(0); }
    }

    @keyframes cbm-slide-down {
      from { transform: translateY(-100%); }
      to   { transform: translateY(0); }
    }

    @keyframes cbm-fade-out {
      from { opacity: 1; }
      to   { opacity: 0; transform: translateX(10px); }
    }
  `;
  document.head.appendChild(style);

  // ── DOM ────────────────────────────────────────────────────────────────────

  function getOrCreateContainer() {
    let el = document.getElementById(OVERLAY_ID);
    if (!el) {
      el = document.createElement('div');
      el.id = OVERLAY_ID;
      document.body.appendChild(el);
    }
    return el;
  }

  function showToast(message) {
    const container = getOrCreateContainer();
    const toast = document.createElement('div');
    const typeClass = `cbm-toast-${message.type || 'announcement'}`;
    toast.className = `cbm-toast ${typeClass}`;

    const initials = (message.senderName || 'T')
      .split(' ')
      .map((w) => w[0])
      .slice(0, 2)
      .join('')
      .toUpperCase();

    toast.innerHTML = `
      <div class="cbm-toast-icon">${initials}</div>
      <div class="cbm-toast-body">
        <div class="cbm-toast-sender">${escapeHtml(message.senderName || 'Учителят')}</div>
        <div class="cbm-toast-text">${escapeHtml(message.message || '')}</div>
      </div>
      <button class="cbm-toast-close" aria-label="Затвори">×</button>
    `;

    toast.querySelector('.cbm-toast-close').addEventListener('click', () => dismissToast(toast));
    container.appendChild(toast);

    // Auto-dismiss
    setTimeout(() => dismissToast(toast), TOAST_DURATION);
  }

  function dismissToast(toast) {
    if (!toast.parentNode) return;
    toast.style.animation = 'cbm-fade-out 0.3s ease-out forwards';
    setTimeout(() => toast.remove(), 300);
  }

  let lockBanner = null;

  function showLockBanner(message) {
    if (lockBanner) return;
    lockBanner = document.createElement('div');
    lockBanner.className = 'cbm-lock-banner';
    lockBanner.textContent = message || 'Устройството е заключено от учителя.';
    document.body.prepend(lockBanner);
  }

  function hideLockBanner() {
    if (lockBanner) {
      lockBanner.remove();
      lockBanner = null;
    }
  }

  // ── Message Listener ───────────────────────────────────────────────────────

  chrome.runtime.onMessage.addListener((msg) => {
    switch (msg.type) {
      case 'CHAT_MESSAGE':
        showToast(msg.message);
        break;
      case 'LOCK':
        showLockBanner(msg.message);
        break;
      case 'UNLOCK':
        hideLockBanner();
        break;
      case 'SCENE_APPLY':
        showToast({
          senderName: 'Системно',
          message: `Приложена сцена: ${msg.scene?.sceneName || ''}`,
          type: 'announcement',
        });
        break;
      case 'OVERRIDE_ADD':
        showToast({
          senderName: 'Учителят',
          message: `Разрешен достъп: ${msg.override?.urlPattern || ''}`,
          type: 'private',
        });
        break;
      default:
        break;
    }
  });

  // ── Utils ──────────────────────────────────────────────────────────────────

  function escapeHtml(str) {
    const div = document.createElement('div');
    div.appendChild(document.createTextNode(str));
    return div.innerHTML;
  }
})();
