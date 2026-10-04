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
    <p class="ayuda" id="ayuda">Si el navegador avisa que la conexión no es segura (el certificado es propio del PC), toca "Mostrar detalles" y luego "Visitar este sitio". Para no verlo de nuevo, <a href="/certificado.crt">instala el certificado</a>. Si la cámara en vivo no aparece, usa "Tomar foto del código" o escríbelo a mano.</p>

    <details id="debug">
      <summary>Registro técnico (toca para ver)</summary>
      <pre id="log"></pre>
    </details>

    <script src="/vendor.js"></script>
    <script src="/zxing.js"></script>
    <script>
      window.zbarPromesa = new Promise(function (resolver) { window.zbarListo = resolver; });
    </script>
    <script type="module">
      import * as zbar from '/zbar.mjs';
      window.zbarWasm = zbar;
      window.zbarListo(zbar);
    </script>
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

      // Prepara la foto en un canvas (aplica orientación EXIF y reescala).
      async function fotoACanvas(file, max) {
        var bitmap;
        try {
          bitmap = await createImageBitmap(file, { imageOrientation: 'from-image' });
        } catch (e) {
          bitmap = await createImageBitmap(file);
        }
        var escala = Math.min(1, max / Math.max(bitmap.width, bitmap.height));
        var ancho = Math.round(bitmap.width * escala);
        var alto = Math.round(bitmap.height * escala);
        var canvas = document.createElement('canvas');
        canvas.width = ancho;
        canvas.height = alto;
        var ctx = canvas.getContext('2d');
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, ancho, alto);
        ctx.drawImage(bitmap, 0, 0, ancho, alto);
        addLog('foto: ' + bitmap.width + 'x' + bitmap.height + ' -> canvas ' + ancho + 'x' + alto);
        if (bitmap.close) bitmap.close();
        return canvas;
      }

      function rotar(origen, grados) {
        if (grados === 0) return origen;
        var lienzo = document.createElement('canvas');
        if (grados === 90 || grados === 270) {
          lienzo.width = origen.height;
          lienzo.height = origen.width;
        } else {
          lienzo.width = origen.width;
          lienzo.height = origen.height;
        }
        var ctx = lienzo.getContext('2d');
        ctx.translate(lienzo.width / 2, lienzo.height / 2);
        ctx.rotate(grados * Math.PI / 180);
        ctx.drawImage(origen, -origen.width / 2, -origen.height / 2);
        return lienzo;
      }

      // Decodifica con el ZXing que trae html5-qrcode, usando TRY_HARDER,
      // dos binarizaciones y rotaciones. Es lo más fiable para barcodes 1D.
      function decodificarConZXing(canvas) {
        var hints = new Map();
        hints.set(ZXing.DecodeHintType.POSSIBLE_FORMATS, [
          ZXing.BarcodeFormat.EAN_13,
          ZXing.BarcodeFormat.EAN_8,
          ZXing.BarcodeFormat.UPC_A,
          ZXing.BarcodeFormat.UPC_E,
          ZXing.BarcodeFormat.CODE_128,
          ZXing.BarcodeFormat.CODE_39,
          ZXing.BarcodeFormat.CODE_93,
          ZXing.BarcodeFormat.ITF,
          ZXing.BarcodeFormat.CODABAR,
          ZXing.BarcodeFormat.QR_CODE
        ]);
        hints.set(ZXing.DecodeHintType.TRY_HARDER, true);
        var binarizadores = [
          function (f) { return new ZXing.BinaryBitmap(new ZXing.HybridBinarizer(f)); },
          function (f) { return new ZXing.BinaryBitmap(new ZXing.GlobalHistogramBinarizer(f)); }
        ];
        var angulos = [0, 90, 180, 270];
        var ultimoError = null;
        for (var a = 0; a < angulos.length; a++) {
          var lienzo = rotar(canvas, angulos[a]);
          for (var b = 0; b < binarizadores.length; b++) {
            try {
              var lector = new ZXing.MultiFormatReader(false, hints);
              var bitmap = binarizadores[b](new ZXing.HTMLCanvasElementLuminanceSource(lienzo));
              var resultado = lector.decode(bitmap);
              addLog('zxing ok (ángulo ' + angulos[a] + ')');
              return resultado.text;
            } catch (e) { ultimoError = e; }
          }
        }
        try {
          var invertido = new ZXing.InvertedLuminanceSource(
            new ZXing.HTMLCanvasElementLuminanceSource(canvas));
          var lectorInv = new ZXing.MultiFormatReader(false, hints);
          var resInv = lectorInv.decode(new ZXing.BinaryBitmap(new ZXing.HybridBinarizer(invertido)));
          addLog('zxing ok (invertido)');
          return resInv.text;
        } catch (e) { ultimoError = e; }
        throw ultimoError || new Error('sin coincidencias');
      }

      function esperarConTimeout(promesa, ms) {
        return Promise.race([
          promesa,
          new Promise(function (resolver) { setTimeout(function () { resolver(null); }, ms); })
        ]);
      }

      async function decodificarConZBar(canvas, zbar) {
        var imageData = canvas.getContext('2d').getImageData(0, 0, canvas.width, canvas.height);
        var angulos = [0, 90];
        for (var a = 0; a < angulos.length; a++) {
          var datos = imageData;
          if (angulos[a] !== 0) {
            var lienzo = rotar(canvas, angulos[a]);
            datos = lienzo.getContext('2d').getImageData(0, 0, lienzo.width, lienzo.height);
          }
          var simbolos = await zbar.scanImageData(datos);
          addLog('zbar (ángulo ' + angulos[a] + '): ' + simbolos.length + ' símbolo(s)');
          if (simbolos.length) {
            simbolos.forEach(function (s) { addLog('zbar: ' + s.typeName + ' = ' + s.decode()); });
            return simbolos[0].decode();
          }
        }
        return null;
      }

      async function decodificarFoto(file) {
        var canvas = await fotoACanvas(file, 1600);
        var zbar = await esperarConTimeout(window.zbarPromesa, 5000);
        if (zbar && zbar.scanImageData) {
          try {
            addLog('decodificando con ZBar…');
            var porZbar = await decodificarConZBar(canvas, zbar);
            if (porZbar) return porZbar;
            addLog('zbar no encontró nada, probando ZXing…');
          } catch (e) {
            addLog('zbar falló: ' + describir(e));
          }
        } else {
          addLog('zbar no disponible, probando ZXing…');
        }
        if (typeof ZXing !== 'undefined') {
          return decodificarConZXing(canvas);
        }
        addLog('ZXing no disponible, usando html5-qrcode');
        var blob = await new Promise(function (r) { canvas.toBlob(r, 'image/jpeg', 0.95); });
        return await lector.scanFile(new File([blob], 'foto.jpg', { type: 'image/jpeg' }), false);
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
