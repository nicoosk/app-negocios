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
      #lector { width: 100%; max-width: 420px; max-height: 55vh; border-radius: 14px;
        overflow: hidden; background: #000; }
      #lector video { width: 100% !important; height: auto !important; }
      #preview { width: 100%; max-width: 420px; max-height: 35vh; object-fit: contain;
        border-radius: 12px; background: #000; display: none; }
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
      details { width: 100%; max-width: 420px; }
      summary { cursor: pointer; color: #94a3b8; font-size: 12px; padding: 4px 0; }
      #log { margin: 8px 0 0; padding: 10px; max-height: 32vh; overflow: auto; text-align: left;
        background: #0b1220; color: #93c5fd; font-size: 11px; line-height: 1.5;
        border-radius: 10px; white-space: pre-wrap; word-break: break-word;
        font-family: ui-monospace, SFMono-Regular, Menlo, monospace; }
    </style>
  </head>
  <body>
    <h1>Escanear código</h1>
    <div id="estado">Iniciando cámara…</div>
    <div id="lector"></div>
    <img id="preview" alt="Foto del código" />
    <button id="btnFoto" class="foto">📷 Tomar foto del código</button>
    <input id="foto" type="file" accept="image/*" capture="environment" style="display:none" />
    <div class="manual">
      <input id="manual" inputmode="numeric" autocomplete="off" placeholder="O escribe el código" />
      <button id="enviarManual">Enviar</button>
    </div>
    <p class="ayuda">La cámara en vivo necesita una conexión segura (HTTPS). Si no aparece, usa "Tomar foto del código" o escríbelo a mano.</p>

    <details id="debug">
      <summary>Registro técnico (toca para ver)</summary>
      <pre id="log"></pre>
    </details>

    <script src="/vendor.js"></script>
    <script>
      var token = new URLSearchParams(location.search).get('t') || '';
      var estado = document.getElementById('estado');
      var bloqueado = false;

      var lineas = [];
      var logEl = document.getElementById('log');
      function addLog(mensaje) {
        var ahora = new Date();
        var hh = ('0' + ahora.getHours()).slice(-2);
        var mm = ('0' + ahora.getMinutes()).slice(-2);
        var ss = ('0' + ahora.getSeconds()).slice(-2);
        lineas.push(hh + ':' + mm + ':' + ss + '  ' + mensaje);
        if (lineas.length > 300) lineas = lineas.slice(-300);
        logEl.textContent = lineas.join('\\n');
        logEl.scrollTop = logEl.scrollHeight;
      }

      function describir(e) {
        if (e === null || e === undefined) return String(e);
        if (typeof e === 'string') return e;
        if (e.name || e.message) return (e.name ? e.name + ': ' : '') + (e.message || '');
        try { return JSON.stringify(e); } catch (_) { return String(e); }
      }

      (function () {
        var original = { log: console.log, warn: console.warn, error: console.error };
        ['log', 'warn', 'error'].forEach(function (nivel) {
          console[nivel] = function () {
            var partes = Array.prototype.map.call(arguments, function (a) {
              return typeof a === 'string' ? a : describir(a);
            });
            addLog('[' + nivel + '] ' + partes.join(' '));
            original[nivel].apply(console, arguments);
          };
        });
      })();

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
            if (d.ok) { setEstado('Enviado: ' + codigo, 'ok'); addLog('Enviado al PC: ' + codigo); }
            else setEstado('Error: ' + (d.error || 'desconocido'), 'err');
          })
          .catch(function (e) { setEstado('Error de red con el PC', 'err'); addLog('Error de red: ' + describir(e)); })
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

      // Forzamos ZXing para live (evita BarcodeDetector nativo poco fiable con 1D).
      var lector = new Html5Qrcode('lector', {
        formatsToSupport: formatos,
        verbose: true,
        experimentalFeatures: { useBarCodeDetectorIfSupported: false }
      });

      try {
        addLog('navegador: ' + navigator.userAgent);
        addLog('protocolo: ' + location.protocol + ' | contexto seguro: ' + (window.isSecureContext ? 'sí' : 'no'));
        addLog('cámara en vivo disponible: ' + (navigator.mediaDevices && navigator.mediaDevices.getUserMedia ? 'sí' : 'no'));
        addLog('BarcodeDetector disponible: ' + ('BarcodeDetector' in window ? 'sí' : 'no'));
        if ('BarcodeDetector' in window && window.BarcodeDetector.getSupportedFormats) {
          window.BarcodeDetector.getSupportedFormats()
            .then(function (f) { addLog('BarcodeDetector formatos: ' + f.join(', ')); })
            .catch(function (e) { addLog('getSupportedFormats falló: ' + describir(e)); });
        }
      } catch (e) { addLog('diagnóstico falló: ' + describir(e)); }

      // Decodificación con el BarcodeDetector nativo del navegador, si existe.
      // Suele ser lo más fiable para códigos 1D en fotos.
      async function decodificarNativo(file) {
        if (!('BarcodeDetector' in window)) return null;
        var soportados = [];
        if (window.BarcodeDetector.getSupportedFormats) {
          soportados = await window.BarcodeDetector.getSupportedFormats();
        }
        var deseados = ['ean_13', 'ean_8', 'upc_a', 'upc_e', 'code_128', 'code_39', 'code_93', 'itf', 'codabar', 'qr_code'];
        var usar = deseados.filter(function (f) { return soportados.indexOf(f) !== -1; });
        if (!usar.length) { addLog('BarcodeDetector sin formatos útiles'); return null; }

        var bitmap = await createImageBitmap(file);
        var max = 1600;
        var escala = Math.min(1, max / Math.max(bitmap.width, bitmap.height));
        var ancho = Math.round(bitmap.width * escala);
        var alto = Math.round(bitmap.height * escala);
        var canvas = document.createElement('canvas');
        canvas.width = ancho;
        canvas.height = alto;
        canvas.getContext('2d').drawImage(bitmap, 0, 0, ancho, alto);
        if (bitmap.close) bitmap.close();
        addLog('nativo: canvas ' + ancho + 'x' + alto + ' formatos [' + usar.join(',') + ']');

        var detector = new window.BarcodeDetector({ formats: usar });
        var encontrados = await detector.detect(canvas);
        addLog('nativo: detectados ' + encontrados.length);
        if (!encontrados.length) return null;
        encontrados.forEach(function (c) { addLog('nativo: ' + c.format + ' = ' + c.rawValue); });
        return encontrados[0].rawValue;
      }

      // Reescala la foto para no procesar imágenes enormes (mejora ZXing).
      async function escalar(file, max) {
        var bitmap = await createImageBitmap(file);
        var escala = Math.min(1, max / Math.max(bitmap.width, bitmap.height));
        addLog('foto original: ' + bitmap.width + 'x' + bitmap.height + ' escala ' + escala.toFixed(2));
        if (escala >= 1) { if (bitmap.close) bitmap.close(); return file; }
        var canvas = document.createElement('canvas');
        canvas.width = Math.round(bitmap.width * escala);
        canvas.height = Math.round(bitmap.height * escala);
        canvas.getContext('2d').drawImage(bitmap, 0, 0, canvas.width, canvas.height);
        if (bitmap.close) bitmap.close();
        var blob = await new Promise(function (resolver) { canvas.toBlob(resolver, 'image/jpeg', 0.92); });
        return new File([blob], 'foto.jpg', { type: 'image/jpeg' });
      }

      async function decodificarFoto(file) {
        try {
          var nativo = await decodificarNativo(file);
          if (nativo) return nativo;
        } catch (e) {
          addLog('decoder nativo falló: ' + describir(e));
        }
        var reducida = await escalar(file, 1600);
        addLog('probando ZXing (scanFile)…');
        return await lector.scanFile(reducida, false);
      }

      function caja(vw) {
        var ancho = Math.floor(vw * 0.9);
        return { width: ancho, height: Math.floor(ancho * 0.45) };
      }

      if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
        lector.start(
          { facingMode: 'environment' },
          { fps: 10, qrbox: caja, aspectRatio: 1.0 },
          function (texto) { enviarCodigo(texto); },
          function () {}
        ).then(function () {
          setEstado('Cámara activa. Apunta al código.', 'ok');
        }).catch(function (err) {
          addLog('start falló: ' + describir(err));
          setEstado('No se pudo abrir la cámara. Usa "Tomar foto del código".', 'err');
        });
      } else {
        addLog('getUserMedia no disponible (se requiere HTTPS)');
        setEstado('Cámara en vivo no disponible. Usa "Tomar foto del código".', 'err');
      }

      var btnFoto = document.getElementById('btnFoto');
      var inputFoto = document.getElementById('foto');
      var preview = document.getElementById('preview');
      btnFoto.addEventListener('click', function () { inputFoto.click(); });
      inputFoto.addEventListener('change', function () {
        var file = inputFoto.files && inputFoto.files[0];
        if (!file) return;
        addLog('archivo: ' + (file.name || 'sin nombre') + ' ' + Math.round(file.size / 1024) + 'KB ' + (file.type || ''));
        if (preview.src) URL.revokeObjectURL(preview.src);
        preview.src = URL.createObjectURL(file);
        preview.style.display = 'block';
        setEstado('Leyendo foto…');
        decodificarFoto(file)
          .then(function (texto) { addLog('código final: ' + texto); enviarCodigo(texto); })
          .catch(function (e) {
            addLog('sin código: ' + describir(e));
            setEstado('No se detectó ningún código. Revisa el registro técnico.', 'err');
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
