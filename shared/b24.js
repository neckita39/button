/*
 * Стыковка с API интеграции Битрикс24 (бэкенд button, GET /livemap).
 * По умолчанию карта живёт на РЕАЛЬНЫХ данных: адрес бэкенда собирается из
 * shared/config.js (window.LivingOfficeConfig: apiPort/apiPath либо apiUrl).
 * Параметр ?api=<url> задаёт другой адрес, ?api=off (off|mock|0) — принудительно
 * мок-режим. LivingOfficeB24.connect(engine, url) — поллинг раз в pollMs (5 сек).
 *
 * Ожидаемый ответ (любой из двух форматов):
 * 1) Полное расписание:
 *    [{ "room": "krasnaya", "events": [{ "id": "...", "title": "...",
 *       "organizer": "...", "attendees": ["..."], "start": "14:45",
 *       "end": "15:45", "checkedInAt": "14:47"|null,
 *       "released": null|"noshow"|"early", "releasedAt": "14:51"|null }] }]
 * 2) Упрощённый статус («кто занял и до какого времени»):
 *    [{ "room": "krasnaya", "busy": true, "by": "Оля К.",
 *       "title": "Синк", "until": "15:45" }]
 *
 * Боевой ответ бэкенда button — объект { now, graceMin, rooms:[…] }, где
 * now — серверное (портальное) время в минутах от полуночи: им синхронизируем
 * часы движка (engine.syncClock), чтобы live-статусы совпали с реальностью.
 * Время событий — минуты от полуночи или "HH:MM"/ISO (см. toMin).
 */
(function () {
  'use strict';

  // Адрес бэкенда — из shared/config.js; хост по умолчанию тот же, что у страницы
  // (file:// → localhost). Полный CFG.apiUrl перебивает порт/путь.
  var CFG = window.LivingOfficeConfig || {};
  var API_PORT = CFG.apiPort || 3000;
  var API_PATH = CFG.apiPath || '/livemap';
  var DEFAULT_API = CFG.apiUrl
    || ((location.protocol === 'http:' || location.protocol === 'https:')
      ? location.protocol + '//' + location.hostname + ':' + API_PORT + API_PATH
      : 'http://localhost:' + API_PORT + API_PATH);

  // Адрес живых данных из query-строки: ?api=off|mock|0 → null (моки),
  // ?api=<url> → свой адрес, без параметра → DEFAULT_API (реальные данные).
  function resolveApi(search) {
    var v = new URLSearchParams(search != null ? search : location.search).get('api');
    if (v === 'off' || v === 'mock' || v === '0') return null;
    return v || DEFAULT_API;
  }

  function toMin(v) {
    if (v == null) return null;
    if (typeof v === 'number') return v;                     // уже минуты
    var m = String(v).match(/(\d{1,2}):(\d{2})/);            // "HH:MM" или ISO
    return m ? (+m[1]) * 60 + (+m[2]) : null;
  }

  function mapEvent(e, i) {
    return {
      id: e.id || 'api-' + i,
      title: e.title || 'Встреча',
      organizer: e.organizer || (e.attendees && e.attendees[0]) || '—',
      attendees: e.attendees || (e.by ? [e.by] : []),
      start: toMin(e.start),
      end: toMin(e.end != null ? e.end : e.until),
      checkedInAt: toMin(e.checkedInAt),
      released: e.released || null,
      releasedAt: toMin(e.releasedAt)
    };
  }

  function applyRow(engine, row) {
    var roomId = row.room || row.roomId || row.id;
    if (!roomId) return;
    if (row.events) {
      engine.setSchedule(roomId, row.events.map(mapEvent));
    } else if (row.busy) {
      // упрощённый формат: одна текущая встреча, подтверждённая
      var now = engine.now();
      engine.setSchedule(roomId, [mapEvent({
        title: row.title, by: row.by, attendees: row.attendees,
        start: Math.floor(now) - 1, until: row.until,
        checkedInAt: Math.floor(now) - 1
      }, 0)]);
    } else {
      engine.setSchedule(roomId, []);
    }
  }

  // Синхронизация часов движка: сервер прислал now (минуты от полуночи) — берём его;
  // иначе фолбэк на локальные настенные часы браузера (демо: портал и ноут в одном TZ).
  function syncClock(engine, rows) {
    if (!engine.syncClock) return;                       // старый движок без live-режима
    if (rows && !Array.isArray(rows) && typeof rows.now === 'number') {
      engine.syncClock(rows.now);
    } else {
      var d = new Date();
      engine.syncClock(d.getHours() * 60 + d.getMinutes() + d.getSeconds() / 60);
    }
  }

  function connect(engine, url, intervalMs) {
    var timer = null;
    function poll() {
      fetch(url, { cache: 'no-store' })
        .then(function (r) { return r.json(); })
        .then(function (rows) {
          syncClock(engine, rows);                        // сперва часы, затем расписание
          (Array.isArray(rows) ? rows : rows.rooms || []).forEach(function (row) {
            applyRow(engine, row);
          });
        })
        .catch(function (err) {
          console.warn('[b24] api недоступно, живём на моках:', err.message);
        });
    }
    poll();
    timer = setInterval(poll, intervalMs || CFG.pollMs || 5000);
    return { stop: function () { clearInterval(timer); } };
  }

  window.LivingOfficeB24 = {
    connect: connect,
    resolveApi: resolveApi,
    DEFAULT_API: DEFAULT_API,
    _toMin: toMin
  };
})();
