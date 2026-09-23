(function () {
  'use strict';
  if (!window.MVA_CONFIG || !MVA_CONFIG.endpoint || !MVA_CONFIG.token) return;

  function randomId() {
    if (window.crypto && typeof window.crypto.randomUUID === 'function') {
      return window.crypto.randomUUID().replace(/-/g, '');
    }
    return (Date.now().toString(36) + Math.random().toString(36).slice(2) + Math.random().toString(36).slice(2)).slice(0, 40);
  }

  function storageGet(key) {
    try { return window.localStorage.getItem(key) || ''; } catch (e) { return ''; }
  }
  function storageSet(key, value) {
    try { window.localStorage.setItem(key, value); return true; } catch (e) { return false; }
  }
  function cookieGet(name) {
    var match = document.cookie.match(new RegExp('(?:^|; )' + name.replace(/([.$?*|{}()[\]\\/+^])/g, '\\$1') + '=([^;]*)'));
    return match ? decodeURIComponent(match[1]) : '';
  }
  function cookieSet(name, value, seconds) {
    document.cookie = name + '=' + encodeURIComponent(value) + '; path=/; max-age=' + seconds + '; SameSite=Lax';
  }

  var visitorId = storageGet('mva_vid') || cookieGet('mva_vid');
  if (!visitorId) visitorId = randomId();
  if (!storageSet('mva_vid', visitorId)) cookieSet('mva_vid', visitorId, 31536000);

  var now = Date.now();
  var sessionMinutes = Math.max(5, Math.min(240, Number(MVA_CONFIG.sessionMinutes || 30)));
  var sessionId = '';
  var sessionRaw = storageGet('mva_session') || cookieGet('mva_session');
  if (sessionRaw) {
    try {
      var session = JSON.parse(sessionRaw);
      if (session && session.id && Number(session.expires) > now) sessionId = String(session.id);
    } catch (e) {}
  }
  if (!sessionId) sessionId = randomId();

  var newSession = JSON.stringify({ id: sessionId, expires: now + (sessionMinutes * 60 * 1000) });
  if (!storageSet('mva_session', newSession)) cookieSet('mva_session', newSession, sessionMinutes * 60);

  var pageUrl = window.location.href.split('#')[0];
  var payload = JSON.stringify({
    url: pageUrl,
    ref: document.referrer || '',
    visitor_id: visitorId,
    session_id: sessionId,
    token: MVA_CONFIG.token
  });

  try {
    if (navigator.sendBeacon) {
      var blob = new Blob([payload], { type: 'application/json' });
      if (navigator.sendBeacon(MVA_CONFIG.endpoint, blob)) return;
    }
  } catch (e) {}

  try {
    window.fetch(MVA_CONFIG.endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: payload,
      credentials: 'omit',
      keepalive: true,
      cache: 'no-store'
    });
  } catch (e) {}
})();
