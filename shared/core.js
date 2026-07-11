/*
 * «Живой офис» — общее ядро: конфиг крыла, изометрия, движок симуляции.
 * Классический скрипт (без ES-модулей — открываемся и с file://).
 * Глобал: window.LivingOffice
 */
(function () {
  'use strict';

  var GRACE_MIN = 6;          // минут на NFC-подтверждение от начала встречи
  var SIM_START_MIN = 14 * 60 + 46;  // симуляция стартует в 14:46
  var WORKDAY = { start: 9 * 60, end: 19 * 60 };

  /* ---------- Крыло-заглушка (метры). Заменится на реальный план. ---------- */

  /* Реальное крыло по наброску (координаты — клетки эскиза).
     Комнаты — стеклянные цветные кубы: accent = цвет стекла в жизни,
     статус показываем светом/аурой, НЕ перекраской куба. */
  var ROOMS = [
    { id: 'tushinsky', name: 'Кабинет Тушинского', cap: 6,
      features: ['ТВ'], accent: '#c94fb6', photo: 'photos/tushinsky.jpg',
      rect: { x: 6,    y: 1.5,  w: 5.5,  h: 10  }, door: { x: 8.5,  y: 11.5 } },
    { id: 'krasnaya', name: 'Красная', cap: 3,
      features: ['Диван'], accent: '#e03a4e', photo: 'photos/krasnaya.jpg',
      rect: { x: 11.5, y: 7,    w: 2.2,  h: 4.5 }, door: { x: 11.5, y: 10.3 } },
    { id: 'golubaya-left', name: 'Голубая левая', cap: 4,
      features: ['Диван'], accent: '#3d6fd8', photo: 'photos/golubaya-left.jpg',
      rect: { x: 18.7, y: 0,    w: 5.5,  h: 6.5 }, door: { x: 23.2, y: 6.5 } },
    { id: 'golubaya-right', name: 'Голубая правая', cap: 4,
      features: ['Диван'], accent: '#2e9bd6', photo: 'photos/golubaya-right.jpg',
      rect: { x: 24.2, y: 0,    w: 4.4,  h: 6.5 }, door: { x: 26,   y: 6.5 } },
    { id: 'ryzhikov', name: 'Кабинет Рыжикова', cap: 10,
      features: ['Флипчарт', 'Диван'], accent: '#2fb08a', photo: 'photos/ryzhikov.jpg',
      rect: { x: 28.6, y: 0,    w: 10.4, h: 29  }, door: { x: 28.6, y: 9.7 } },
    { id: 'zelenaya', name: 'Зелёная', cap: 8,
      features: ['Стол на 8'], accent: '#59b93c', photo: 'photos/zelenaya.jpg',
      rect: { x: 2.7,  y: 13.5, w: 6.3,  h: 5.5 }, door: { x: 9,    y: 15.2 } },
    { id: 'zheltaya', name: 'Жёлтая', cap: 5,
      features: ['ТВ', 'Пуфики'], accent: '#e8c22e', photo: 'photos/zheltaya.jpg',
      rect: { x: 22,   y: 21.3, w: 5.2,  h: 7.7 }, door: { x: 23,   y: 21.3 } }
  ];

  /* Фан-зоны — не бронируются, живут на карте для настроения. */
  var FUNZONES = [
    { id: 'massage',  name: 'Массаж',  emoji: '💆', photo: 'photos/massage.jpg',
      note: 'Массажное кресло — не бронируется, просто приходи',
      rect: { x: 12.2, y: 1.6, w: 1.7, h: 1.4 } },
    { id: 'tennis',   name: 'Теннис',  emoji: '🏓', photo: 'photos/tennis.jpg',
      note: 'Настольный теннис — не бронируется, просто приходи',
      rect: { x: 13.5, y: 7,   w: 3.2, h: 2.4 } },
    { id: 'football', name: 'Футбол',  emoji: '⚽', photo: 'photos/football.jpg',
      note: 'Настольный футбол — не бронируется, просто приходи',
      rect: { x: 17.4, y: 3.6, w: 1.5, h: 2.2 } }
  ];

  /* Габариты крыла (клетки эскиза) — общий пол. */
  var FLOOR = { x: 0, y: 0, w: 39, h: 29 };

  /* ---------- Расписание-мок (минуты от полуночи) ---------- */

  function makeSchedule() {
    return {
      tushinsky: [
        ev('t1', 'Планёрка разработки', 'Игорь С.', ['Игорь С.', 'Женя Л.', 'Оля К.'], 630, 690, { checkedInAt: 632 }),
        ev('t2', 'Архитектурный комитет', 'Игорь С.', ['Игорь С.', 'Дима Р.', 'Павел Т.', 'Настя В.'], 840, 930, { checkedInAt: 843 }),
        ev('t3', 'Собес: бэкенд', 'HR', ['HR', 'Игорь С.'], 960, 1020, {})
      ],
      krasnaya: [
        ev('k1', 'Синк по интеграции', 'Оля К.', ['Оля К.', 'Дима Р.', 'Настя В.'], 885, 945, {}),
        ev('k2', 'Созвон с партнёром', 'Павел Т.', ['Павел Т.'], 1050, 1080, {})
      ],
      'golubaya-left': [
        ev('gl1', '1:1 Дима / Настя', 'Дима Р.', ['Дима Р.', 'Настя В.'], 870, 930, { checkedInAt: 872 }),
        ev('gl2', 'Планирование релиза', 'Оля К.', ['Оля К.', 'Женя Л.'], 990, 1050, {})
      ],
      'golubaya-right': [
        ev('gr1', 'Демо для клиента', 'Женя Л.', ['Женя Л.', 'Павел Т.'], 660, 720, { released: 'noshow', releasedAt: 666 }),
        ev('gr2', 'Созвон с подрядчиком', 'Настя В.', ['Настя В.'], 930, 960, {})
      ],
      ryzhikov: [
        ev('r1', 'Утренняя планёрка', 'Сергей Р.', ['Сергей Р.', 'Игорь С.'], 570, 630, { checkedInAt: 570 }),
        ev('r2', 'Совет директоров', 'Сергей Р.', ['Сергей Р.', 'Финансы'], 660, 780, { checkedInAt: 662 }),
        ev('r3', 'Стратсессия', 'Сергей Р.', ['Сергей Р.', 'Оля К.', 'Павел Т.'], 810, 960, { checkedInAt: 812 }),
        ev('r4', 'Итоги недели', 'Сергей Р.', ['Сергей Р.'], 1020, 1110, {})
      ],
      zelenaya: [
        ev('z1', 'Демо спринта', 'Женя Л.', ['Женя Л.', 'Оля К.', 'Дима Р.'], 780, 900, { checkedInAt: 782, released: 'early', releasedAt: 876 }),
        ev('z2', 'Груминг бэклога', 'Павел Т.', ['Павел Т.', 'Настя В.'], 960, 1020, {})
      ],
      zheltaya: [
        ev('y1', 'Статус-колл', 'Оля К.', ['Оля К.', 'Дима Р.'], 570, 600, { released: 'noshow', releasedAt: 576 }),
        ev('y2', 'Ретро команды', 'Игорь С.', ['Игорь С.', 'Женя Л.'], 1020, 1080, {})
      ]
    };
  }

  function ev(id, title, organizer, attendees, start, end, extra) {
    return Object.assign({
      id: id, title: title, organizer: organizer, attendees: attendees,
      start: start, end: end, checkedInAt: null, released: null, releasedAt: null
    }, extra);
  }

  /* Предзаполнение счётчика спасённого времени: gr1 (+54 мин), y1 (+24 мин),
     z1 отпущена раньше (+24 мин) — итого 1 ч 42 мин до старта демо.
     Демо-момент: k1 в «Красной» ждёт NFC до 14:51 и освобождается (+54 мин). */

  /* ---------- Изометрия ---------- */

  function project(x, y, s) {
    return { x: (x - y) * s, y: (x + y) * s * 0.5 };
  }

  function rectCorners(r) {
    return [
      { x: r.x,       y: r.y },
      { x: r.x + r.w, y: r.y },
      { x: r.x + r.w, y: r.y + r.h },
      { x: r.x,       y: r.y + r.h }
    ];
  }

  /* Призма комнаты: top — крыша/пол на высоте h (экранный сдвиг вверх),
     right — стена вдоль x+w, front — стена вдоль y+h. */
  function prism(rect, s, h) {
    var c = rectCorners(rect).map(function (p) { return project(p.x, p.y, s); });
    var t = c.map(function (p) { return { x: p.x, y: p.y - h }; });
    return {
      floor: c,
      top: t,
      right: [t[1], t[2], c[2], c[1]],
      front: [t[3], t[2], c[2], c[3]]
    };
  }

  function pts(list) {
    return list.map(function (p) { return p.x.toFixed(1) + ',' + p.y.toFixed(1); }).join(' ');
  }

  function bounds(rects, s, h) {
    var minX = 1e9, minY = 1e9, maxX = -1e9, maxY = -1e9;
    rects.forEach(function (r) {
      rectCorners(r).forEach(function (p) {
        var q = project(p.x, p.y, s);
        minX = Math.min(minX, q.x); maxX = Math.max(maxX, q.x);
        minY = Math.min(minY, q.y - h); maxY = Math.max(maxY, q.y);
      });
    });
    return { x: minX, y: minY, w: maxX - minX, h: maxY - minY };
  }

  function center(rect, s) {
    return project(rect.x + rect.w / 2, rect.y + rect.h / 2, s);
  }

  /* ---------- Форматирование ---------- */

  function fmtTime(min) {
    var h = Math.floor(min / 60), m = Math.floor(min % 60);
    return h + ':' + (m < 10 ? '0' : '') + m;
  }

  function fmtDur(min) {
    min = Math.round(min);
    var h = Math.floor(min / 60), m = min % 60;
    if (h && m) return h + ' ч ' + m + ' мин';
    if (h) return h + ' ч';
    return m + ' мин';
  }

  function fmtClock(simSec) {
    var t = Math.floor(simSec), h = Math.floor(t / 3600), m = Math.floor(t / 60) % 60, s = t % 60;
    function p(n) { return (n < 10 ? '0' : '') + n; }
    return p(h) + ':' + p(m) + ':' + p(s);
  }

  function initials(name) {
    return name.split(/[\s/]+/).slice(0, 2).map(function (w) { return (w[0] || '').toUpperCase(); }).join('');
  }

  function hue(name) {
    var x = 0;
    for (var i = 0; i < name.length; i++) x = (x * 31 + name.charCodeAt(i)) % 360;
    return x;
  }

  /* ---------- Движок ---------- */

  function createEngine(opts) {
    opts = opts || {};
    var graceMin = opts.graceMin || GRACE_MIN;
    var listeners = {};
    var schedule = makeSchedule();
    var simSec = SIM_START_MIN * 60;
    var speed = 1;              // сим-секунд за реальную секунду
    var feed = [];
    var lastStatuses = {};
    var lastMinute = -1;
    var raf = null, lastTs = null;

    function on(evName, cb) {
      (listeners[evName] = listeners[evName] || []).push(cb);
      return function () {
        listeners[evName] = listeners[evName].filter(function (f) { return f !== cb; });
      };
    }
    function emit(evName, data) {
      (listeners[evName] || []).forEach(function (cb) { cb(data); });
    }

    function nowMin() { return simSec / 60; }

    function roomEvents(roomId) { return schedule[roomId] || []; }

    function currentEvent(roomId) {
      var n = nowMin();
      return roomEvents(roomId).find(function (e) {
        return !e.released && e.start <= n && n < e.end;
      }) || null;
    }

    function nextEvent(roomId) {
      var n = nowMin();
      return roomEvents(roomId)
        .filter(function (e) { return !e.released && e.start > n; })
        .sort(function (a, b) { return a.start - b.start; })[0] || null;
    }

    /* Последний релиз, чей исходный интервал ещё не кончился — для бейджа
       «освободили раньше» у свободной комнаты. */
    function releasedInfo(roomId) {
      var n = nowMin();
      var e = roomEvents(roomId).find(function (x) {
        return x.released && x.releasedAt <= n && n < x.end;
      });
      if (!e) return null;
      return {
        type: e.released, at: e.releasedAt, event: e,
        minutesEarly: Math.round(e.end - e.releasedAt)
      };
    }

    function summary(roomId) {
      var evs = roomEvents(roomId);
      var meetings = evs.filter(function (e) { return e.released !== 'noshow'; });
      var booked = meetings.reduce(function (a, e) { return a + (e.end - e.start); }, 0);
      if (!evs.length) return 'Сегодня броней нет — свободна весь день';
      var share = booked / (WORKDAY.end - WORKDAY.start);
      if (share >= 0.7) return 'Занята почти весь день';
      var cnt = meetings.length;
      var word = cnt === 1 ? 'встреча' : (cnt < 5 ? 'встречи' : 'встреч');
      return 'Сегодня ' + cnt + ' ' + word + ' — занята ' + fmtDur(booked);
    }

    function getState(roomId) {
      var n = nowMin();
      var cur = currentEvent(roomId);
      var nxt = nextEvent(roomId);
      var status, deadline = null, occupants = [];
      if (cur && cur.checkedInAt != null) {
        status = 'occupied';
        occupants = cur.attendees;
      } else if (cur) {
        status = 'awaiting';
        deadline = cur.start + graceMin;
      } else {
        status = 'free';
      }
      return {
        status: status,
        current: cur,
        next: nxt,
        deadline: deadline,
        deadlineSec: deadline != null ? Math.max(0, deadline * 60 - simSec) : null,
        freeUntil: status === 'free' ? (nxt ? nxt.start : WORKDAY.end) : null,
        releasedInfo: status === 'free' ? releasedInfo(roomId) : null,
        occupants: occupants,
        schedule: roomEvents(roomId).slice(),
        summary: summary(roomId)
      };
    }

    function savedMinutes() {
      var total = 0;
      Object.keys(schedule).forEach(function (roomId) {
        schedule[roomId].forEach(function (e) {
          if (e.released && e.releasedAt != null) total += Math.max(0, e.end - e.releasedAt);
        });
      });
      return Math.round(total);
    }

    function pushFeed(entry) {
      entry.time = entry.time != null ? entry.time : nowMin();
      feed.unshift(entry);
      if (feed.length > 40) feed.pop();
      emit('feed', entry);
    }

    function roomById(id) {
      return ROOMS.find(function (r) { return r.id === id; });
    }

    function releaseNoShow(roomId, e) {
      e.released = 'noshow';
      e.releasedAt = nowMin();
      var room = roomById(roomId);
      pushFeed({
        kind: 'release-noshow', roomId: roomId,
        text: '«' + room.name + '» освобождена: никто не пришёл к «' + e.title + '»'
      });
      emit('toast', {
        kind: 'b24', title: 'Битрикс24',
        text: 'Переговорка «' + room.name + '» удалена из события «' + e.title + '» · +' + fmtDur(e.end - e.releasedAt) + ' свободного времени'
      });
      emit('saved', savedMinutes());
    }

    function checkIn(roomId) {
      var e = currentEvent(roomId);
      if (!e || e.checkedInAt != null) return false;
      e.checkedInAt = nowMin();
      var room = roomById(roomId);
      pushFeed({
        kind: 'checkin', roomId: roomId,
        text: 'Метка отсканирована в «' + room.name + '» — «' + e.title + '» подтверждена'
      });
      return true;
    }

    function releaseEarly(roomId) {
      var e = currentEvent(roomId);
      if (!e || e.checkedInAt == null) return false;
      e.released = 'early';
      e.releasedAt = nowMin();
      var room = roomById(roomId);
      pushFeed({
        kind: 'release-early', roomId: roomId,
        text: '«' + room.name + '» отпустили на ' + fmtDur(e.end - e.releasedAt) + ' раньше'
      });
      emit('saved', savedMinutes());
      return true;
    }

    function tick(ts) {
      if (lastTs == null) lastTs = ts;
      var dt = Math.min(0.2, (ts - lastTs) / 1000);
      lastTs = ts;
      simSec += dt * speed;

      // просроченные grace-дедлайны
      Object.keys(schedule).forEach(function (roomId) {
        var e = currentEvent(roomId);
        if (e && e.checkedInAt == null && nowMin() >= e.start + graceMin) {
          releaseNoShow(roomId, e);
        }
      });

      // изменения статусов
      ROOMS.forEach(function (r) {
        var st = getState(r.id);
        var prev = lastStatuses[r.id];
        if (prev !== st.status) {
          lastStatuses[r.id] = st.status;
          emit('change', { roomId: r.id, state: st, prev: prev || null });
        }
      });

      var m = Math.floor(nowMin());
      if (m !== lastMinute) { lastMinute = m; emit('minute', { minute: m }); }

      emit('tick', { simSec: simSec, minute: nowMin() });
      raf = requestAnimationFrame(tick);
    }

    function seedFeed() {
      feed = [];
      var seeded = [];
      Object.keys(schedule).forEach(function (roomId) {
        schedule[roomId].forEach(function (e) {
          var room = roomById(roomId);
          if (e.released === 'noshow') {
            seeded.push({ time: e.releasedAt, kind: 'release-noshow', roomId: roomId,
              text: '«' + room.name + '» освобождена: никто не пришёл к «' + e.title + '»' });
          } else if (e.released === 'early') {
            seeded.push({ time: e.releasedAt, kind: 'release-early', roomId: roomId,
              text: '«' + room.name + '» отпустили на ' + fmtDur(e.end - e.releasedAt) + ' раньше' });
          } else if (e.checkedInAt != null && e.checkedInAt <= nowMin()) {
            seeded.push({ time: e.checkedInAt, kind: 'checkin', roomId: roomId,
              text: 'Метка отсканирована в «' + room.name + '» — «' + e.title + '» подтверждена' });
          }
        });
      });
      seeded.sort(function (a, b) { return b.time - a.time; });
      feed = seeded.slice(0, 12);
    }

    function reset() {
      schedule = makeSchedule();
      simSec = SIM_START_MIN * 60;
      lastStatuses = {};
      lastMinute = -1;
      seedFeed();
      emit('saved', savedMinutes());
      emit('reset', {});
    }

    seedFeed();
    raf = requestAnimationFrame(tick);

    return {
      rooms: ROOMS,
      funzones: FUNZONES,
      floor: FLOOR,
      workday: WORKDAY,
      graceMin: graceMin,
      on: on,
      now: nowMin,
      nowSec: function () { return simSec; },
      getState: getState,
      getFeed: function () { return feed.slice(); },
      getSavedMinutes: savedMinutes,
      setSpeed: function (x) { speed = x; emit('speed', x); },
      getSpeed: function () { return speed; },
      checkIn: checkIn,
      releaseEarly: releaseEarly,
      setSchedule: function (roomId, events) { schedule[roomId] = events; },
      reset: reset,
      destroy: function () { cancelAnimationFrame(raf); }
    };
  }

  /* ---------- Демо-панель (клавиша D / В) ---------- */

  function mountDemoPanel(engine) {
    var el = document.createElement('div');
    el.id = 'lo-demo-panel';
    el.style.cssText = 'position:fixed;right:14px;bottom:14px;z-index:9999;display:none;' +
      'background:rgba(15,17,26,.92);color:#e8eaf2;padding:12px 14px;border-radius:12px;' +
      'font:12px/1.6 ui-monospace,Menlo,monospace;box-shadow:0 8px 30px rgba(0,0,0,.45);' +
      'backdrop-filter:blur(6px);min-width:210px';
    el.innerHTML =
      '<div style="opacity:.65;margin-bottom:6px">ДЕМО · время <span id="lo-dp-clock"></span></div>' +
      '<div style="display:flex;gap:6px;margin-bottom:8px">' +
        ['1', '30', '120'].map(function (x) {
          return '<button data-speed="' + x + '" style="flex:1;cursor:pointer;border:1px solid #3a3f55;' +
            'background:#232738;color:inherit;border-radius:7px;padding:4px 0">×' + x + '</button>';
        }).join('') +
      '</div>' +
      '<button id="lo-dp-checkin" style="width:100%;cursor:pointer;border:1px solid #3a3f55;background:#232738;' +
        'color:inherit;border-radius:7px;padding:5px 0;margin-bottom:6px">Отсканировать метку в «Красной»</button>' +
      '<button id="lo-dp-reset" style="width:100%;cursor:pointer;border:1px solid #3a3f55;background:#181b28;' +
        'color:#9aa0b5;border-radius:7px;padding:5px 0">Сброс сценария</button>';
    document.body.appendChild(el);

    el.querySelectorAll('[data-speed]').forEach(function (b) {
      b.addEventListener('click', function () { engine.setSpeed(+b.dataset.speed); mark(); });
    });
    function mark() {
      el.querySelectorAll('[data-speed]').forEach(function (b) {
        b.style.background = +b.dataset.speed === engine.getSpeed() ? '#3d4a78' : '#232738';
      });
    }
    mark();
    el.querySelector('#lo-dp-checkin').addEventListener('click', function () { engine.checkIn('krasnaya'); });
    el.querySelector('#lo-dp-reset').addEventListener('click', function () { engine.reset(); });
    engine.on('tick', function (t) {
      var c = el.querySelector('#lo-dp-clock');
      if (el.style.display !== 'none') c.textContent = fmtClock(t.simSec);
    });
    document.addEventListener('keydown', function (e) {
      if (e.key === 'd' || e.key === 'D' || e.key === 'в' || e.key === 'В') {
        el.style.display = el.style.display === 'none' ? 'block' : 'none';
      }
    });
    return el;
  }

  window.LivingOffice = {
    ROOMS: ROOMS,
    FUNZONES: FUNZONES,
    FLOOR: FLOOR,
    GRACE_MIN: GRACE_MIN,
    WORKDAY: WORKDAY,
    createEngine: createEngine,
    mountDemoPanel: mountDemoPanel,
    iso: { project: project, prism: prism, pts: pts, bounds: bounds, center: center, rectCorners: rectCorners },
    fmt: { time: fmtTime, dur: fmtDur, clock: fmtClock, initials: initials, hue: hue }
  };
})();
