/*
 * Стыковка с API интеграции Битрикс24 (коллега отдаёт JSON).
 * Активируется параметром ?api=<url> у index.html / scan.html:
 *   LivingOfficeB24.connect(engine, url) — поллинг раз в 10 сек.
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
 */
(function () {
  'use strict';

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

  function connect(engine, url, intervalMs) {
    var timer = null;
    function poll() {
      fetch(url, { cache: 'no-store' })
        .then(function (r) { return r.json(); })
        .then(function (rows) {
          (Array.isArray(rows) ? rows : rows.rooms || []).forEach(function (row) {
            applyRow(engine, row);
          });
        })
        .catch(function (err) {
          console.warn('[b24] api недоступно, живём на моках:', err.message);
        });
    }
    poll();
    timer = setInterval(poll, intervalMs || 10000);
    return { stop: function () { clearInterval(timer); } };
  }

  window.LivingOfficeB24 = { connect: connect, _toMin: toMin };
})();
