/*
 * Конфиг фронта «Живого офиса» (классический скрипт, глобал window.LivingOfficeConfig).
 * Здесь живут настройки стыковки с бэкендом button — правится без сборки.
 *
 *   apiPort / apiPath — где слушает бэкенд (хост берётся с адреса страницы);
 *   apiUrl            — полный адрес, если бэкенд на ДРУГОМ хосте
 *                       (перебивает apiPort/apiPath);
 *   pollMs            — период опроса живых данных.
 *
 * Параметр страницы ?api=<url> перебивает всё, ?api=off — принудительно моки.
 */
window.LivingOfficeConfig = {
  apiPort: 3000,
  apiPath: '/livemap',
  // apiUrl: 'http://backend.example.com:8000/livemap',
  pollMs: 5000
};
