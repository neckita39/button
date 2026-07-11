#!/bin/sh
# «Живой офис» — запуск демо.
# Карта:      http://localhost:8123/            (после выбора варианта — index.html)
# Варианты:   http://localhost:8123/prototypes/variant-a.html (b, c)
# QR-тур:     http://localhost:8123/scan.html   (камера работает только на localhost/https)
# QR-метки:   http://localhost:8123/qr.html     (печать на двери)
cd "$(dirname "$0")"
echo "Живой офис → http://localhost:8123"
python3 -m http.server 8123
