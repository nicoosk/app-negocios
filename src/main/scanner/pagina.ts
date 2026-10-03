// Página web que se sirve al celular. Escanea códigos de barra con la cámara y
// los envía al servidor local. Es autocontenida: usa html5-qrcode cargado desde
// /vendor.js y solo depende del token de sesión.
export function generarPaginaEscanner(): string {
  return `<!doctype html>
<html lang="es">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover" />
    <title>Escanear código</title>
    <style>
      * { box-sizing: border-box; }
      body {
        margin: 0; min-height: 100vh; background: #0f172a; color: #e2e8f0;
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
        display: flex; flex-direction: column; align-items: center; gap: 14px; padding: 16px;
      }
      h1 { font-size: 17px; margin: 6px 0 0; font-weight: 600; }
      #lector { width: 100%; max-width: 420px; border-radius: 14px; overflow: hidden; background: #000; }
      #lector video { width: 100% !important; }
      #estado { font-size: 14px; text-align: center; padding: 10px 14px; border-radius: 10px;
        background: #1e293b; width: 100%; max-width: 420px; min-height: 40px; line-height: 20px; }
      #estado.ok { background: #052e16; color: #4ade80; }
      #estado.err { background: #450a0a; color: #f87171; }
      .manual { width: 100%; max-width: 420px; display: flex; gap: 8px; }
      .manual input { flex: 1; padding: 12px; border-radius: 10px; border: 1px solid #334155;
        background: #1e293b; color: #e2e8f0; font-size: 16px; }
      .manual button { padding: 12px 16px; border: 0; border-radius: 10px; background: #2563eb;
        color: white; font-size: 15px; font-weight: 600; }
      .foto { width: 100%; max-width: 420px; padding: 14px; border: 0; border-radius: 12px;
        background: #16a34a; color: white; font-size: 16px; font-weight: 700; }
      .ayuda { font-size: 12px; color: #94a3b8; text-align: center; max-width: 420px; }
    </style>
  </head>
  <body>
    <h1>Escanear código</h1>
    <div id="estado">Iniciando cámara…</div>
    <div id="lector"></div>
    <button id="btnFoto" class="foto">📷 Tomar foto del código</button>
    <input id="foto" type="file" accept="image/*" capture="environment" style="display:none" />
    <div class="manual">
      <input id="manual" inputmode="numeric" autocomplete="off" placeholder="O escribe el código" />
      <button id="enviarManual">Enviar</button>
    </div>
    <p class="ayuda">La cámara en vivo necesita una conexión segura (HTTPS). Si no aparece, usa "Tomar foto del código" o escríbelo a mano.</p>

    <script src="/vendor.js"></script>
    <script>
      var token = new URLSearchParams(location.search).get('t') || '';
      var estado = document.getElementById('estado');
      var bloqueado = false;

      function setEstado(texto, clase) {
        estado.textContent = texto;
        estado.className = clase || '';
      }

      function enviarCodigo(codigo) {
        if (bloqueado || !codigo) return;
        bloqueado = true;
        if (navigator.vibrate) navigator.vibrate(80);
        fetch('/scan', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ codigo: codigo, t: token })
        })
          .then(function (r) { return r.json(); })
          .then(function (d) {
            if (d.ok) setEstado('Enviado: ' + codigo, 'ok');
            else setEstado('Error: ' + (d.error || 'desconocido'), 'err');
          })
          .catch(function () { setEstado('Error de red con el PC', 'err'); })
          .finally(function () {
            setTimeout(function () { bloqueado = false; }, 1200);
          });
      }

      try {
        var es = new EventSource('/eventos?t=' + encodeURIComponent(token));
        es.addEventListener('listo', function () { setEstado('Conectado al PC. Apunta al código.', 'ok'); });
        es.onerror = function () { setEstado('Sin conexión con el PC', 'err'); };
      } catch (e) {}

      var formatos = [
        Html5QrcodeSupportedFormats.EAN_13,
        Html5QrcodeSupportedFormats.EAN_8,
        Html5QrcodeSupportedFormats.UPC_A,
        Html5QrcodeSupportedFormats.UPC_E,
        Html5QrcodeSupportedFormats.UPC_EAN_EXTENSION,
        Html5QrcodeSupportedFormats.CODE_128,
        Html5QrcodeSupportedFormats.CODE_39,
        Html5QrcodeSupportedFormats.CODE_93,
        Html5QrcodeSupportedFormats.ITF,
        Html5QrcodeSupportedFormats.CODABAR,
        Html5QrcodeSupportedFormats.QR_CODE
      ];

      var lector = new Html5Qrcode('lector', { formatsToSupport: formatos, verbose: false });

      function caja(vw) {
        var ancho = Math.floor(vw * 0.9);
        return { width: ancho, height: Math.floor(ancho * 0.45) };
      }

      lector.start(
        { facingMode: 'environment' },
        { fps: 10, qrbox: caja, aspectRatio: 1.0 },
        function (texto) { enviarCodigo(texto); },
        function () {}
      ).then(function () {
        setEstado('Cámara activa. Apunta al código.', 'ok');
      }).catch(function () {
        setEstado('No se pudo abrir la cámara en vivo. Usa "Tomar foto del código".', 'err');
      });

      var btnFoto = document.getElementById('btnFoto');
      var inputFoto = document.getElementById('foto');
      btnFoto.addEventListener('click', function () { inputFoto.click(); });
      inputFoto.addEventListener('change', function () {
        var file = inputFoto.files && inputFoto.files[0];
        if (!file) return;
        setEstado('Leyendo foto…');
        lector.scanFile(file, true)
          .then(function (texto) { enviarCodigo(texto); })
          .catch(function () {
            setEstado('No se detectó un código en la foto. Intenta de nuevo.', 'err');
          })
          .finally(function () { inputFoto.value = ''; });
      });

      function manual() {
        var input = document.getElementById('manual');
        enviarCodigo((input.value || '').trim());
        input.value = '';
      }
      document.getElementById('enviarManual').addEventListener('click', manual);
      document.getElementById('manual').addEventListener('keydown', function (e) {
        if (e.key === 'Enter') manual();
      });
    </script>
  </body>
</html>`
}
