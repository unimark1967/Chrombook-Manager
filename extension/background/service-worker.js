// Chromebook Manager - MV3 Service Worker
// Manages WebSocket connection to the API and relays commands to tabs.

const HEARTBEAT_ALARM = 'cbm-heartbeat';
const RECONNECT_ALARM = 'cbm-reconnect';
const HEARTBEAT_INTERVAL_MINUTES = 0.5; // 30 seconds
const RECONNECT_DELAY_MINUTES = 0.25;   // 15 seconds

let socket = null;
let deviceId = null;
let classroomId = null;
let sessionId = null;
let serverUrl = null;
let isLocked = false;
let dynamicRuleId = 1000; // start offset for dynamic rules

// ─── Initialization ──────────────────────────────────────────────────────────

async function init() {
  const stored = await chrome.storage.managed.get([
    'serverUrl',
    'deviceId',
    'classroomId',
  ]).catch(() => ({}));

  // Fall back to local storage for dev environments
  const local = await chrome.storage.local.get([
    'serverUrl',
    'deviceId',
    'classroomId',
    'sessionId',
  ]);

  serverUrl = stored.serverUrl || local.serverUrl || 'http://localhost:3001';
  deviceId = stored.deviceId || local.deviceId || await getOrCreateDeviceId();
  classroomId = stored.classroomId || local.classroomId || null;
  sessionId = local.sessionId || null;

  connectWebSocket();
  setupAlarms();
}

async function getOrCreateDeviceId() {
  const { deviceId: existing } = await chrome.storage.local.get('deviceId');
  if (existing) return existing;

  // Use chrome.identity to get a stable device identifier
  const id = `ext-${Date.now()}-${Math.random().toString(36).slice(2)}`;
  await chrome.storage.local.set({ deviceId: id });
  return id;
}

// ─── WebSocket ───────────────────────────────────────────────────────────────

function connectWebSocket() {
  if (socket && socket.readyState === WebSocket.OPEN) return;

  const wsUrl = serverUrl.replace(/^http/, 'ws') + '/socket.io/?EIO=4&transport=websocket';

  try {
    socket = new WebSocket(wsUrl);
  } catch (err) {
    console.error('[CBM] WebSocket create error', err);
    scheduleReconnect();
    return;
  }

  socket.addEventListener('open', () => {
    console.log('[CBM] WebSocket connected');
    // Socket.IO handshake: send connect packet for root namespace
    socket.send('40');
  });

  socket.addEventListener('message', (event) => {
    handleSocketMessage(event.data);
  });

  socket.addEventListener('close', () => {
    console.warn('[CBM] WebSocket closed, scheduling reconnect');
    socket = null;
    scheduleReconnect();
  });

  socket.addEventListener('error', (err) => {
    console.error('[CBM] WebSocket error', err);
  });
}

// Minimal Socket.IO v4 protocol over raw WebSocket
let pingTimeout = null;

function handleSocketMessage(raw) {
  // Ping from server
  if (raw === '2') {
    socket?.send('3'); // Pong
    return;
  }

  // Namespace connected confirmation
  if (raw.startsWith('40')) {
    console.log('[CBM] Socket.IO namespace connected');
    registerDevice();
    return;
  }

  // Event message: "42[\"eventName\",{...}]"
  if (raw.startsWith('42')) {
    try {
      const payload = JSON.parse(raw.slice(2));
      const [event, data] = payload;
      handleEvent(event, data);
    } catch (e) {
      console.error('[CBM] Failed to parse socket message', raw, e);
    }
  }
}

function emitEvent(event, data) {
  if (!socket || socket.readyState !== WebSocket.OPEN) {
    console.warn('[CBM] Socket not connected, cannot emit', event);
    return;
  }
  socket.send('42' + JSON.stringify([event, data]));
}

function registerDevice() {
  if (!deviceId) return;
  emitEvent('device:register', {
    deviceId,
    classroomId: classroomId || 'unknown',
    sessionId,
  });
}

// ─── Event Handlers ──────────────────────────────────────────────────────────

function handleEvent(event, data) {
  console.log('[CBM] event:', event, data);

  switch (event) {
    case 'device:lock':
      handleLock(data);
      break;
    case 'device:unlock':
      handleUnlock();
      break;
    case 'tab:open':
      handleTabOpen(data);
      break;
    case 'tab:close':
      handleTabClose(data);
      break;
    case 'tab:closeAll':
      handleTabCloseAll();
      break;
    case 'tab:focus':
      handleTabFocus(data);
      break;
    case 'scene:apply':
      handleSceneApply(data);
      break;
    case 'override:add':
      handleOverrideAdd(data);
      break;
    case 'override:remove':
      handleOverrideRemove(data);
      break;
    case 'chat:receive':
      handleChatReceive(data);
      break;
    case 'screenshot:request':
      handleScreenshotRequest(data);
      break;
    case 'heartbeat:ack':
      // No-op
      break;
    default:
      console.log('[CBM] Unhandled event:', event);
  }
}

// ─── Lock / Unlock ────────────────────────────────────────────────────────────

async function handleLock(data) {
  isLocked = true;
  await chrome.storage.local.set({ isLocked: true, lockMessage: data?.message || '' });

  // Open lock page in all windows
  const windows = await chrome.windows.getAll({ populate: true });
  for (const win of windows) {
    const lockUrl = chrome.runtime.getURL('pages/lock.html') +
      '?message=' + encodeURIComponent(data?.message || 'Устройството е заключено от учителя.');
    await chrome.tabs.create({ windowId: win.id, url: lockUrl, active: true });
  }

  notifyContentScripts({ type: 'LOCK', message: data?.message });
}

async function handleUnlock() {
  isLocked = false;
  await chrome.storage.local.set({ isLocked: false, lockMessage: '' });

  // Close all lock pages
  const tabs = await chrome.tabs.query({ url: chrome.runtime.getURL('pages/lock.html') + '*' });
  for (const tab of tabs) {
    if (tab.id) await chrome.tabs.remove(tab.id).catch(() => {});
  }

  notifyContentScripts({ type: 'UNLOCK' });
}

// ─── Tab Management ───────────────────────────────────────────────────────────

async function handleTabOpen(data) {
  if (!data?.url) return;
  const [win] = await chrome.windows.getAll({ populate: false });
  await chrome.tabs.create({ url: data.url, windowId: win?.id });
}

async function handleTabClose(data) {
  if (data?.tabId) {
    await chrome.tabs.remove(data.tabId).catch(() => {});
    return;
  }
  // Close active tab if no specific tabId
  const [active] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (active?.id) await chrome.tabs.remove(active.id).catch(() => {});
}

async function handleTabCloseAll() {
  const lockPageUrl = chrome.runtime.getURL('pages/lock.html');
  const tabs = await chrome.tabs.query({});
  const toClose = tabs.filter((t) => t.url && !t.url.startsWith(lockPageUrl));
  await Promise.all(toClose.map((t) => t.id && chrome.tabs.remove(t.id).catch(() => {})));
}

async function handleTabFocus(data) {
  if (!data?.tabId) return;
  await chrome.tabs.update(data.tabId, { active: true }).catch(() => {});
  const tab = await chrome.tabs.get(data.tabId).catch(() => null);
  if (tab?.windowId) await chrome.windows.update(tab.windowId, { focused: true }).catch(() => {});
}

// ─── Scene (declarativeNetRequest) ───────────────────────────────────────────

async function handleSceneApply(data) {
  if (!data?.rules) return;

  // Remove existing dynamic rules
  const existing = await chrome.declarativeNetRequest.getDynamicRules();
  const existingIds = existing.map((r) => r.id);
  await chrome.declarativeNetRequest.updateDynamicRules({ removeRuleIds: existingIds });

  const addRules = [];
  let id = dynamicRuleId;

  for (const rule of data.rules) {
    if (rule.ruleType === 'url_block') {
      const urlFilter = rule.value?.pattern || '*';
      addRules.push({
        id: id++,
        priority: rule.priority ?? 1,
        action: { type: 'block' },
        condition: { urlFilter, resourceTypes: ['main_frame', 'sub_frame'] },
      });
    } else if (rule.ruleType === 'url_allow') {
      const urlFilter = rule.value?.pattern || '*';
      addRules.push({
        id: id++,
        priority: (rule.priority ?? 1) + 10, // Allow rules have higher priority
        action: { type: 'allow' },
        condition: { urlFilter, resourceTypes: ['main_frame', 'sub_frame'] },
      });
    }
    // tab_limit and lock are handled separately
    if (rule.ruleType === 'lock') {
      await handleLock({ message: 'Заключено от сцена: ' + data.sceneName });
    }
  }

  if (addRules.length > 0) {
    await chrome.declarativeNetRequest.updateDynamicRules({ addRules });
  }

  await chrome.storage.local.set({ activeScene: data });
  notifyContentScripts({ type: 'SCENE_APPLY', scene: data });
}

// ─── Overrides ────────────────────────────────────────────────────────────────

async function handleOverrideAdd(data) {
  const { overrides = [] } = await chrome.storage.local.get('overrides');

  overrides.push({
    id: data.id,
    urlPattern: data.urlPattern,
    expiresAt: data.expiresAt,
  });

  await chrome.storage.local.set({ overrides });

  // Add allow rule for the override URL pattern
  const ruleId = dynamicRuleId + overrides.length + 500;
  await chrome.declarativeNetRequest.updateDynamicRules({
    addRules: [
      {
        id: ruleId,
        priority: 100,
        action: { type: 'allow' },
        condition: {
          urlFilter: data.urlPattern,
          resourceTypes: ['main_frame', 'sub_frame'],
        },
      },
    ],
  });

  await chrome.storage.local.set({ [`override_rule_${data.id}`]: ruleId });
  notifyContentScripts({ type: 'OVERRIDE_ADD', override: data });
}

async function handleOverrideRemove(data) {
  const { overrides = [] } = await chrome.storage.local.get('overrides');
  const updated = overrides.filter((o) => o.id !== data.id);
  await chrome.storage.local.set({ overrides: updated });

  const stored = await chrome.storage.local.get(`override_rule_${data.id}`);
  const ruleId = stored[`override_rule_${data.id}`];
  if (ruleId) {
    await chrome.declarativeNetRequest.updateDynamicRules({ removeRuleIds: [ruleId] });
    await chrome.storage.local.remove(`override_rule_${data.id}`);
  }

  notifyContentScripts({ type: 'OVERRIDE_REMOVE', id: data.id });
}

// ─── Chat ─────────────────────────────────────────────────────────────────────

function handleChatReceive(data) {
  // Forward to content scripts to show overlay
  notifyContentScripts({ type: 'CHAT_MESSAGE', message: data });

  // Also show a Chrome notification for announcements
  if (data.type === 'announcement') {
    chrome.notifications.create({
      type: 'basic',
      iconUrl: '../icons/icon48.png',
      title: data.senderName || 'Учителят',
      message: data.message,
      priority: 2,
    });
  }
}

// ─── Screenshots ──────────────────────────────────────────────────────────────

async function handleScreenshotRequest() {
  try {
    const [activeTab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (!activeTab?.id || !activeTab.windowId) return;

    const dataUrl = await chrome.tabs.captureVisibleTab(activeTab.windowId, {
      format: 'jpeg',
      quality: 60,
    });

    emitEvent('screen:frame', {
      deviceId,
      classroomId: classroomId || 'unknown',
      dataUrl,
      timestamp: Date.now(),
    });
  } catch (err) {
    console.error('[CBM] Screenshot capture failed', err);
  }
}

// ─── Tab Monitoring ───────────────────────────────────────────────────────────

chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  if (changeInfo.status !== 'complete') return;
  if (!tab.url || tab.url.startsWith('chrome://') || tab.url.startsWith('chrome-extension://')) return;
  if (!sessionId) return;

  emitEvent('history:visit', {
    sessionId,
    deviceId,
    tabId,
    url: tab.url,
    title: tab.title,
  });
});

// ─── Alarms ───────────────────────────────────────────────────────────────────

function setupAlarms() {
  chrome.alarms.create(HEARTBEAT_ALARM, {
    periodInMinutes: HEARTBEAT_INTERVAL_MINUTES,
  });
}

function scheduleReconnect() {
  chrome.alarms.create(RECONNECT_ALARM, {
    delayInMinutes: RECONNECT_DELAY_MINUTES,
  });
}

chrome.alarms.onAlarm.addListener((alarm) => {
  if (alarm.name === HEARTBEAT_ALARM) {
    if (socket?.readyState === WebSocket.OPEN) {
      emitEvent('heartbeat', { deviceId });
    } else {
      connectWebSocket();
    }
  }

  if (alarm.name === RECONNECT_ALARM) {
    connectWebSocket();
  }
});

// ─── Message from Content Scripts / Popup ────────────────────────────────────

chrome.runtime.onMessage.addListener((msg, _sender, sendResponse) => {
  switch (msg.type) {
    case 'GET_STATE':
      sendResponse({ isLocked, deviceId, classroomId, sessionId, serverUrl });
      break;
    case 'SET_CONFIG':
      chrome.storage.local.set(msg.config).then(() => {
        serverUrl = msg.config.serverUrl || serverUrl;
        classroomId = msg.config.classroomId || classroomId;
        sessionId = msg.config.sessionId || sessionId;
        connectWebSocket();
        sendResponse({ ok: true });
      });
      return true;
    case 'SEND_CHAT':
      emitEvent('chat:send', msg.payload);
      sendResponse({ ok: true });
      break;
    default:
      break;
  }
});

// ─── Helpers ─────────────────────────────────────────────────────────────────

async function notifyContentScripts(payload) {
  const tabs = await chrome.tabs.query({});
  for (const tab of tabs) {
    if (tab.id && tab.url && !tab.url.startsWith('chrome://') && !tab.url.startsWith('chrome-extension://')) {
      chrome.tabs.sendMessage(tab.id, payload).catch(() => {});
    }
  }
}

// ─── Boot ─────────────────────────────────────────────────────────────────────
chrome.runtime.onInstalled.addListener(init);
chrome.runtime.onStartup.addListener(init);
init();
