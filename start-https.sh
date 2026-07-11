#!/bin/sh
# «Живой офис» — HTTPS-запуск для телефона (камере нужен secure context).
# С телефона: https://<IP-этой-машины>:8444/scan.html
# Сертификат самоподписанный — браузер один раз ругнётся, жми «всё равно открыть».
cd "$(dirname "$0")"

CERTDIR=.cert
if [ ! -f "$CERTDIR/cert.pem" ]; then
  mkdir -p "$CERTDIR"
  openssl req -x509 -newkey rsa:2048 -nodes -days 365 \
    -keyout "$CERTDIR/key.pem" -out "$CERTDIR/cert.pem" \
    -subj "/CN=living-office" >/dev/null 2>&1
  echo "Сертификат создан: $CERTDIR/"
fi

IP=$(ipconfig getifaddr en0 2>/dev/null || echo "<IP-машины>")
echo "Живой офис (HTTPS) → https://$IP:8444"
echo "QR-тур с телефона  → https://$IP:8444/scan.html"

python3 - <<'PY'
import http.server, ssl

srv = http.server.ThreadingHTTPServer(('0.0.0.0', 8444),
                                      http.server.SimpleHTTPRequestHandler)
ctx = ssl.SSLContext(ssl.PROTOCOL_TLS_SERVER)
ctx.load_cert_chain('.cert/cert.pem', '.cert/key.pem')
srv.socket = ctx.wrap_socket(srv.socket, server_side=True)
srv.serve_forever()
PY
