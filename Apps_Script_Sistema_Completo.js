// ═══════════════════════════════════════════════════════════════════
// ZURICH SEGUROS — APPS SCRIPT PARA SISTEMA DE GESTIÓN AUTOS 2026
// ═══════════════════════════════════════════════════════════════════
//
// ESTE SCRIPT MANEJA 5 HOJAS (una por módulo):
//   1. Inbound_Chatbot
//   2. Pauta_Otros
//   3. Renovaciones
//   4. Ventas
//   5. Calidad_Leads
//
// INSTALACIÓN:
//   1. Crea un Google Sheet con las 5 hojas (pestaña por módulo)
//   2. En cada hoja, pon los encabezados en la fila 1
//   3. Ve a Extensiones > Apps Script
//   4. Pega TODO este código
//   5. Implementa como Web App (Implementar > Nueva implementación)
//      - Tipo: Aplicación web
//      - Acceso: Cualquier persona
//   6. Copia la URL generada y pégala en el Sistema de Gestión
// ═══════════════════════════════════════════════════════════════════

// Hojas válidas del sistema
const VALID_SHEETS = [
  'Inbound_Chatbot',
  'Pauta_Otros',
  'Renovaciones',
  'Ventas',
  'Calidad_Leads'
];

// ───────── ENTRY POINTS ─────────
function doGet(e) {
  return handleRequest(e);
}

function doPost(e) {
  return handleRequest(e);
}

// ───────── REQUEST HANDLER ─────────
var _currentCallback = null; // JSONP callback support

function handleRequest(e) {
  const lock = LockService.getScriptLock();
  lock.tryLock(15000);

  // Store JSONP callback name if present
  _currentCallback = e.parameter.callback || null;

  try {
    const action = e.parameter.action;
    const sheet = e.parameter.sheet || '';

    // Validate sheet name if provided
    if (sheet && !VALID_SHEETS.includes(sheet)) {
      return jsonResponse({ status: 'error', message: 'Hoja no válida: ' + sheet });
    }

    switch (action) {
      case 'ping':
        return jsonResponse({ status: 'ok', message: 'Conexión exitosa', sheets: VALID_SHEETS });

      case 'add':
        return addRow(e);

      case 'getAll':
        return getAllRows(e);

      case 'delete':
        return deleteRow(e);

      case 'getStats':
        return getConsolidatedStats();

      case 'setup':
        return setupSheets();

      default:
        return jsonResponse({ status: 'error', message: 'Acción no reconocida: ' + action });
    }
  } catch (err) {
    return jsonResponse({ status: 'error', message: err.toString() });
  } finally {
    lock.releaseLock();
  }
}

// ───────── ADD ROW ─────────
function addRow(e) {
  const sheetName = e.parameter.sheet;
  if (!sheetName) return jsonResponse({ status: 'error', message: 'Falta el parámetro sheet' });

  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(sheetName);
  if (!sheet) return jsonResponse({ status: 'error', message: 'No existe la hoja: ' + sheetName });

  const data = JSON.parse(e.parameter.data);
  const lastRow = sheet.getLastRow();
  const newId = lastRow > 1 ? Number(sheet.getRange(lastRow, 1).getValue()) + 1 : 1;

  // Build row based on sheet type
  let row = [];

  switch (sheetName) {
    case 'Inbound_Chatbot':
      row = [
        newId,
        data.fecha || '',
        data.agente || '',
        data.nombre || '',
        data.telefono || '',
        data.documento || '',
        data.correo || '',
        data.placa || '',
        data.ciudad || '',
        data.valor || '',
        data.cotizacion || '',
        data.medio || '',
        data.tipificacion || '',
        data.base || '',
        data.observacion || ''
      ];
      break;

    case 'Pauta_Otros':
      row = [
        newId,
        data.fecha || '',
        data.agente || '',
        data.nombre || '',
        data.telefono || '',
        data.documento || '',
        data.correo || '',
        data.placa || '',
        data.ciudad || '',
        data.valor || '',
        data.cotizacion || '',
        data.medio || '',
        data.tipificacion || '',
        data.base || '',
        data.campana || '',
        data.observacion || ''
      ];
      break;

    case 'Renovaciones':
      row = [
        newId,
        data.fecha || '',
        data.agente || '',
        data.nombre || '',
        data.telefono || '',
        data.documento || '',
        data.numPoliza || '',
        data.fechaVencimiento || '',
        data.placa || '',
        data.valorActual || '',
        data.valorRenovacion || '',
        data.seRenovo || '',
        data.medio || '',
        data.razonNoRenov || '',
        data.observacion || ''
      ];
      break;

    case 'Ventas':
      row = [
        newId,
        data.fecha || '',
        data.agente || '',
        data.nombre || '',
        data.telefono || '',
        data.documento || '',
        data.correo || '',
        data.placa || '',
        data.ciudad || '',
        data.valorPrima || '',
        data.canal || '',
        data.fuente || '',
        data.medioPago || '',
        data.numPoliza || '',
        data.tipoSeguro || '',
        data.observacion || ''
      ];
      break;

    case 'Calidad_Leads':
      row = [
        newId,
        data.fecha || '',
        data.agente || '',
        data.fuente || '',
        data.nombre || '',
        data.telefono || '',
        data.documento || '',
        data.categoria || '',
        data.subtipo || '',
        data.intentoContacto || '',
        data.numIntentos || '',
        data.observacion || ''
      ];
      break;

    default:
      return jsonResponse({ status: 'error', message: 'Hoja no soportada' });
  }

  sheet.appendRow(row);
  return jsonResponse({ status: 'ok', id: newId });
}

// ───────── GET ALL ROWS ─────────
function getAllRows(e) {
  const sheetName = e.parameter.sheet;
  if (!sheetName) return jsonResponse({ status: 'error', message: 'Falta el parámetro sheet' });

  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(sheetName);
  if (!sheet) return jsonResponse({ status: 'error', message: 'No existe la hoja: ' + sheetName });

  const data = sheet.getDataRange().getValues();
  if (data.length <= 1) return jsonResponse({ status: 'ok', data: [] });

  const headers = data[0];
  const rows = [];
  for (let i = 1; i < data.length; i++) {
    const row = {};
    headers.forEach((h, j) => {
      row[h] = data[i][j];
    });
    rows.push(row);
  }

  return jsonResponse({ status: 'ok', data: rows });
}

// ───────── DELETE ROW ─────────
function deleteRow(e) {
  const sheetName = e.parameter.sheet;
  const id = Number(e.parameter.id);
  if (!sheetName) return jsonResponse({ status: 'error', message: 'Falta el parámetro sheet' });

  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(sheetName);
  if (!sheet) return jsonResponse({ status: 'error', message: 'No existe la hoja: ' + sheetName });

  const data = sheet.getDataRange().getValues();
  for (let i = 1; i < data.length; i++) {
    if (Number(data[i][0]) === id) {
      sheet.deleteRow(i + 1);
      return jsonResponse({ status: 'ok' });
    }
  }

  return jsonResponse({ status: 'error', message: 'ID no encontrado: ' + id });
}

// ───────── CONSOLIDATED STATS ─────────
function getConsolidatedStats() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const stats = {};

  // Inbound + Chatbot stats
  try {
    const inbound = ss.getSheetByName('Inbound_Chatbot');
    if (inbound) {
      const data = inbound.getDataRange().getValues();
      stats.inbound = {
        total: data.length - 1,
        ventas: data.filter((r, i) => i > 0 && r[12] === 'Venta').length,
        enProceso: data.filter((r, i) => i > 0 && r[12] === 'En proceso').length,
        noContesta: data.filter((r, i) => i > 0 && r[12] === 'No contesta').length
      };
    }
  } catch (e) { stats.inbound = { total: 0, ventas: 0, enProceso: 0, noContesta: 0 }; }

  // Pauta stats
  try {
    const pauta = ss.getSheetByName('Pauta_Otros');
    if (pauta) {
      const data = pauta.getDataRange().getValues();
      stats.pauta = {
        total: data.length - 1,
        ventas: data.filter((r, i) => i > 0 && r[12] === 'Venta').length,
        enProceso: data.filter((r, i) => i > 0 && r[12] === 'En proceso').length,
        noContesta: data.filter((r, i) => i > 0 && r[12] === 'No contesta').length
      };
    }
  } catch (e) { stats.pauta = { total: 0, ventas: 0, enProceso: 0, noContesta: 0 }; }

  // Renovaciones stats
  try {
    const renov = ss.getSheetByName('Renovaciones');
    if (renov) {
      const data = renov.getDataRange().getValues();
      stats.renovaciones = {
        total: data.length - 1,
        renovadas: data.filter((r, i) => i > 0 && r[11] === 'Sí').length,
        enProceso: data.filter((r, i) => i > 0 && r[11] === 'En proceso').length,
        noRenovadas: data.filter((r, i) => i > 0 && r[11] === 'No').length
      };
    }
  } catch (e) { stats.renovaciones = { total: 0, renovadas: 0, enProceso: 0, noRenovadas: 0 }; }

  // Ventas stats
  try {
    const ventas = ss.getSheetByName('Ventas');
    if (ventas) {
      const data = ventas.getDataRange().getValues();
      stats.ventas = {
        total: data.length - 1,
        primaTotal: data.slice(1).reduce((s, r) => s + (parseFloat(String(r[9]).replace(/\./g, '')) || 0), 0)
      };
      // Ventas por agente
      const byAgent = {};
      data.slice(1).forEach(r => {
        const ag = r[2] || 'Sin agente';
        if (!byAgent[ag]) byAgent[ag] = { count: 0, prima: 0 };
        byAgent[ag].count++;
        byAgent[ag].prima += parseFloat(String(r[9]).replace(/\./g, '')) || 0;
      });
      stats.ventas.porAgente = byAgent;
    }
  } catch (e) { stats.ventas = { total: 0, primaTotal: 0, porAgente: {} }; }

  // Calidad stats
  try {
    const calidad = ss.getSheetByName('Calidad_Leads');
    if (calidad) {
      const data = calidad.getDataRange().getValues();
      stats.calidad = {
        total: data.length - 1,
        noApto: data.filter((r, i) => i > 0 && r[7] === 'NO APTO').length,
        noContacto: data.filter((r, i) => i > 0 && r[7] === 'NO CONTACTO').length,
        noCotiza: data.filter((r, i) => i > 0 && r[7] === 'NO COTIZA').length
      };
    }
  } catch (e) { stats.calidad = { total: 0, noApto: 0, noContacto: 0, noCotiza: 0 }; }

  return jsonResponse({ status: 'ok', stats: stats });
}

// ───────── SETUP SHEETS ─────────
function setupSheets() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();

  // Headers por hoja
  const sheetsConfig = {
    'Inbound_Chatbot': ['ID', 'FECHA', 'AGENTE', 'NOMBRE', 'TELEFONO', 'DOCUMENTO', 'CORREO', 'PLACA', 'CIUDAD', 'VALOR POLIZA', 'COTIZACION', 'MEDIO', 'TIPIFICACION', 'BASE', 'OBSERVACION'],
    'Pauta_Otros': ['ID', 'FECHA', 'AGENTE', 'NOMBRE', 'TELEFONO', 'DOCUMENTO', 'CORREO', 'PLACA', 'CIUDAD', 'VALOR POLIZA', 'COTIZACION', 'MEDIO', 'TIPIFICACION', 'BASE', 'CAMPANA', 'OBSERVACION'],
    'Renovaciones': ['ID', 'FECHA', 'AGENTE', 'NOMBRE', 'TELEFONO', 'DOCUMENTO', 'NUM POLIZA', 'FECHA VENCIMIENTO', 'PLACA', 'VALOR ACTUAL', 'VALOR RENOVACION', 'SE RENOVO', 'MEDIO', 'RAZON NO RENOV', 'OBSERVACION'],
    'Ventas': ['ID', 'FECHA', 'AGENTE', 'NOMBRE', 'TELEFONO', 'DOCUMENTO', 'CORREO', 'PLACA', 'CIUDAD', 'VALOR PRIMA', 'CANAL', 'FUENTE', 'MEDIO PAGO', 'NUM POLIZA', 'TIPO SEGURO', 'OBSERVACION'],
    'Calidad_Leads': ['ID', 'FECHA', 'AGENTE', 'FUENTE', 'NOMBRE', 'TELEFONO', 'DOCUMENTO', 'CATEGORIA', 'SUBTIPO', 'INTENTO CONTACTO', 'NUM INTENTOS', 'OBSERVACION']
  };

  const created = [];

  Object.keys(sheetsConfig).forEach(name => {
    let sheet = ss.getSheetByName(name);
    if (!sheet) {
      sheet = ss.insertSheet(name);
      created.push(name);
    }

    // Check if headers exist
    const firstCell = sheet.getRange(1, 1).getValue();
    if (!firstCell || firstCell !== 'ID') {
      const headers = sheetsConfig[name];
      const headerRange = sheet.getRange(1, 1, 1, headers.length);
      headerRange.setValues([headers]);
      headerRange.setFontWeight('bold');
      headerRange.setBackground('#02296A');
      headerRange.setFontColor('#FFFFFF');
      sheet.setFrozenRows(1);

      // Auto-resize columns
      headers.forEach((h, i) => {
        sheet.setColumnWidth(i + 1, Math.max(h.length * 10, 100));
      });
    }
  });

  return jsonResponse({
    status: 'ok',
    message: created.length > 0
      ? 'Se crearon las hojas: ' + created.join(', ')
      : 'Todas las hojas ya existían',
    sheets: Object.keys(sheetsConfig)
  });
}

// ───────── UTILITY ─────────
function jsonResponse(obj) {
  var jsonStr = JSON.stringify(obj);

  // JSONP support: if callback parameter was provided, wrap response
  if (_currentCallback) {
    return ContentService
      .createTextOutput(_currentCallback + '(' + jsonStr + ')')
      .setMimeType(ContentService.MimeType.JAVASCRIPT);
  }

  return ContentService
    .createTextOutput(jsonStr)
    .setMimeType(ContentService.MimeType.JSON);
}
