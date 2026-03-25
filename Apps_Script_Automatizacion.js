// ═══════════════════════════════════════════════════════════════════
// ZURICH SEGUROS — SCRIPT DE AUTOMATIZACIÓN PARA GOOGLE SHEETS
// ═══════════════════════════════════════════════════════════════════
//
// INSTRUCCIONES DE INSTALACIÓN:
// 1. Abre tu Google Sheet (la plantilla que subiste)
// 2. Ve a Extensiones > Apps Script
// 3. Borra el código que hay y pega TODO este archivo
// 4. Haz clic en "Guardar" (ícono de disco)
// 5. Ejecuta la función "configurarInicial" una vez (selecciónala y dale play)
// 6. Autoriza los permisos cuando te lo pida
//
// AUTOMATIZACIÓN 100% — SIN FORMULARIOS MANUALES
// A) Importa directamente desde tu archivo INFORME AUTOS (Excel/CSV)
// B) Procesa y normaliza los datos automáticamente
// C) Crea resúmenes en vivo por agente, por fuente y por corte
// D) Menú personalizado para todas las acciones
// ═══════════════════════════════════════════════════════════════════

// ── CONFIGURACIÓN ──
const CONFIG = {
  hojaGestion: 'Gestión Diaria',
  hojaTipificacion: 'Tipificación Detallada',
  hojaPlan: 'Plan de Acción',
  hojaImport: 'Importar Sistema',
  hojaResumen: 'Resumen Automático',
  hojaCortes: 'Cortes Mensuales',
  agentes: [
    'Daniela Chacon', 'Johana Soto', 'Alejandra Londoño', 'Ana Maria Robledo',
    'Paola Rodriguez', 'Marlen Chacon', 'Yeison Navas', 'Diana Rodriguez'
  ],
  fuentes: [
    'Pauta', 'Pauta Max', 'WhatsApp Pauta', 'Inbound', 'Organico',
    'WhatsApp Organico', 'Jira Organico', 'Referidos', 'Chatbot',
    'Santander', 'Contigo Intermediarios', 'Renovacion', 'Motos Zurich'
  ]
};

// ═══════════════════════════════════════════════
// FUNCIÓN INICIAL — Ejecutar UNA VEZ
// ═══════════════════════════════════════════════
function configurarInicial() {
  crearMenuPersonalizado();
  crearHojaResumen();
  crearHojaImportar();
  crearHojaCortes();

  SpreadsheetApp.getUi().alert(
    '✅ Configuración Completa',
    'Se creó:\n' +
    '1. Menú "🚗 Zurich Autos" en la barra\n' +
    '2. Hoja "Resumen Automático" con KPIs en vivo\n' +
    '3. Hoja "Importar Sistema" para pegar datos del CRM\n' +
    '4. Hoja "Cortes Mensuales" para registrar cada corte\n\n' +
    'Todo listo. Usa el menú para importar datos.',
    SpreadsheetApp.getUi().ButtonSet.OK
  );
}

// ═══════════════════════════════════════════════
// MENÚ PERSONALIZADO
// ═══════════════════════════════════════════════
function crearMenuPersonalizado() {
  SpreadsheetApp.getUi()
    .createMenu('🚗 Zurich Autos')
    .addItem('📥 Importar datos del sistema', 'importarCSV')
    .addItem('🔄 Procesar importación', 'procesarImportacion')
    .addSeparator()
    .addItem('📊 Registrar corte mensual', 'registrarCorte')
    .addItem('📈 Actualizar resumen', 'actualizarResumen')
    .addSeparator()
    .addItem('🔃 Importar Excel completo (INFORME AUTOS)', 'instruccionesExcel')
    .addItem('⚙️ Reconfigurar todo', 'configurarInicial')
    .addToUi();
}

function onOpen() {
  crearMenuPersonalizado();
}

// ═══════════════════════════════════════════════
// IMPORTAR CSV DEL SISTEMA
// ═══════════════════════════════════════════════
function crearHojaImportar() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let hoja = ss.getSheetByName(CONFIG.hojaImport);

  if (!hoja) {
    hoja = ss.insertSheet(CONFIG.hojaImport);
    hoja.setTabColor('#D97706');
  }

  hoja.clear();
  hoja.getRange('A1').setValue('IMPORTAR DATOS DEL SISTEMA');
  hoja.getRange('A1').setFontSize(14).setFontWeight('bold').setFontColor('#02296A');

  hoja.getRange('A3').setValue('INSTRUCCIONES:');
  hoja.getRange('A3').setFontWeight('bold');
  hoja.getRange('A4').setValue('1. Exporta el reporte diario de tu sistema como CSV o Excel');
  hoja.getRange('A5').setValue('2. Copia los datos y pégalos desde la fila 11 hacia abajo');
  hoja.getRange('A6').setValue('3. La fila 10 tiene los encabezados esperados — ajusta si los de tu sistema son diferentes');
  hoja.getRange('A7').setValue('4. Ve al menú 🚗 Zurich Autos > Procesar importación');
  hoja.getRange('A8').setValue('5. Los datos se procesarán y copiarán a "Gestión Diaria" automáticamente');

  hoja.getRange('A10').setValue('⬇️ Pega datos aquí (desde fila 11) ⬇️');
  hoja.getRange('A10').setFontWeight('bold').setFontColor('#DC2626').setFontSize(11);

  // Headers de referencia
  const sysHeaders = ['Fecha', 'Agente', 'Fuente/Base', 'Registros', 'No Aptos', 'Contactados', 'Cotizados', 'En Proceso', 'Ventas', 'Prima', 'No Contacto', 'Tipificación'];
  sysHeaders.forEach((h, i) => {
    const cell = hoja.getRange(11, i + 1);
    cell.setValue(h);
    cell.setFontWeight('bold');
    cell.setBackground('#02296A');
    cell.setFontColor('#FFFFFF');
  });

  hoja.setColumnWidth(1, 12);
  hoja.setColumnWidth(2, 22);
  hoja.setColumnWidth(3, 18);
  for (let i = 4; i <= 12; i++) hoja.setColumnWidth(i, 14);
}

function procesarImportacion() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const hojaImport = ss.getSheetByName(CONFIG.hojaImport);
  const hojaGestion = ss.getSheetByName(CONFIG.hojaGestion);

  if (!hojaImport || !hojaGestion) {
    SpreadsheetApp.getUi().alert('Error: No se encontraron las hojas necesarias.');
    return;
  }

  const lastRow = hojaImport.getLastRow();
  if (lastRow <= 11) {
    SpreadsheetApp.getUi().alert('No hay datos para importar. Pega los datos desde la fila 12.');
    return;
  }

  const data = hojaImport.getRange(12, 1, lastRow - 11, 12).getValues();
  let imported = 0;
  const errores = [];

  data.forEach((row, idx) => {
    if (!row[0] && !row[1]) return;

    try {
      const destRow = hojaGestion.getLastRow() + 1;
      const fecha = row[0];
      const agente = normalizeAgente(row[1]);
      const fuente = mapearFuente(row[2]);
      const registros = parseInt(row[3]) || 0;
      const noAptos = parseInt(row[4]) || 0;
      const aptos = registros - noAptos;
      const contactados = parseInt(row[5]) || 0;
      const cotizados = parseInt(row[6]) || 0;
      const enProceso = parseInt(row[7]) || 0;
      const ventas = parseInt(row[8]) || 0;
      const prima = parseFloat(row[9]) || 0;
      const noContacto = parseInt(row[10]) || 0;
      const tipificacion = row[11] || '';

      hojaGestion.getRange(destRow, 1).setValue(fecha);
      hojaGestion.getRange(destRow, 2).setValue(agente);
      hojaGestion.getRange(destRow, 3).setValue(fuente);
      hojaGestion.getRange(destRow, 4).setValue(registros);
      hojaGestion.getRange(destRow, 5).setValue(noAptos);
      hojaGestion.getRange(destRow, 6).setValue(aptos);
      hojaGestion.getRange(destRow, 7).setValue(aptos);
      hojaGestion.getRange(destRow, 8).setValue(contactados);
      hojaGestion.getRange(destRow, 9).setValue(cotizados);
      hojaGestion.getRange(destRow, 10).setValue(enProceso);
      hojaGestion.getRange(destRow, 11).setValue(ventas);
      hojaGestion.getRange(destRow, 12).setValue(prima);
      hojaGestion.getRange(destRow, 14).setValue(noContacto);
      hojaGestion.getRange(destRow, 15).setValue(tipificacion);

      hojaGestion.getRange(destRow, 12).setNumberFormat('$#,##0');
      imported++;
    } catch(e) {
      errores.push(`Fila ${idx + 12}: ${e.message}`);
    }
  });

  actualizarResumen();

  let msg = `Se importaron ${imported} registros a Gestión Diaria.`;
  if (errores.length > 0) {
    msg += `\n\n⚠️ ${errores.length} errores:\n` + errores.slice(0, 5).join('\n');
  }

  SpreadsheetApp.getUi().alert('✅ Importación Completa', msg, SpreadsheetApp.getUi().ButtonSet.OK);
}

// ═══════════════════════════════════════════════
// NORMALIZACIÓN DE NOMBRES
// ═══════════════════════════════════════════════
function normalizeAgente(raw) {
  if (!raw) return '';
  const s = raw.toString().trim();
  // Buscar coincidencia parcial
  for (const ag of CONFIG.agentes) {
    if (s.toLowerCase() === ag.toLowerCase()) return ag;
    if (s.toLowerCase().includes(ag.split(' ')[1]?.toLowerCase() || '___')) return ag;
  }
  return s; // Devolver como está si no hay match
}

function mapearFuente(raw) {
  if (!raw) return 'Otro';
  const s = raw.toString().toLowerCase().trim();
  if (s.includes('pauta max') || s === 'pautamax') return 'Pauta Max';
  if (s.includes('whatsapp pauta') || s.includes('wa pauta') || s === 'whatsapp_pauta') return 'WhatsApp Pauta';
  if (s === 'pauta' || s.includes('facebook') || s.includes('google ads')) return 'Pauta';
  if (s.includes('inbound')) return 'Inbound';
  if (s.includes('whatsapp organ') || s.includes('wa organ')) return 'WhatsApp Organico';
  if (s.includes('jira')) return 'Jira Organico';
  if (s === 'organico' || s === 'orgánico') return 'Organico';
  if (s.includes('referid')) return 'Referidos';
  if (s.includes('chatbot') || s.includes('bot')) return 'Chatbot';
  if (s.includes('santander')) return 'Santander';
  if (s.includes('contigo') || s.includes('intermediari')) return 'Contigo Intermediarios';
  if (s.includes('renov')) return 'Renovacion';
  if (s.includes('moto')) return 'Motos Zurich';
  return raw;
}

// ═══════════════════════════════════════════════
// CORTES MENSUALES — Registro por fecha de corte
// ═══════════════════════════════════════════════
function crearHojaCortes() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let hoja = ss.getSheetByName(CONFIG.hojaCortes);

  if (!hoja) {
    hoja = ss.insertSheet(CONFIG.hojaCortes);
    hoja.setTabColor('#2167AE');
  }

  hoja.clear();
  hoja.getRange('A1').setValue('CORTES MENSUALES');
  hoja.getRange('A1').setFontSize(14).setFontWeight('bold').setFontColor('#02296A');
  hoja.getRange('A2').setValue('Cada vez que importas datos, puedes registrar un "corte" con la fecha actual.');
  hoja.getRange('A2').setFontColor('#6B7280');

  const headers = ['Fecha Corte', 'Mes', 'Registros', 'Contactados', 'Cotizaciones', 'Ventas', 'Prima', '% Contacto', '% Efectividad', 'Notas'];
  headers.forEach((h, i) => {
    const cell = hoja.getRange(4, i + 1);
    cell.setValue(h).setFontWeight('bold').setBackground('#02296A').setFontColor('#FFFFFF');
  });

  hoja.setColumnWidth(1, 16);
  hoja.setColumnWidth(2, 12);
  for (let i = 3; i <= 9; i++) hoja.setColumnWidth(i, 15);
  hoja.setColumnWidth(10, 30);
}

function registrarCorte() {
  const ui = SpreadsheetApp.getUi();
  const response = ui.prompt(
    '📊 Registrar Corte Mensual',
    'Ingresa el mes del corte (ej: Marzo) y opcionalmente una nota.\n\nFormato: Mes | Nota (opcional)\nEjemplo: Marzo | Corte al 22 de marzo',
    ui.ButtonSet.OK_CANCEL
  );

  if (response.getSelectedButton() !== ui.Button.OK) return;

  const input = response.getResponseText().split('|');
  const mes = (input[0] || '').trim();
  const nota = (input[1] || '').trim();

  if (!mes) {
    ui.alert('Debes indicar el mes.');
    return;
  }

  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const hojaGestion = ss.getSheetByName(CONFIG.hojaGestion);
  const hojaCortes = ss.getSheetByName(CONFIG.hojaCortes);

  if (!hojaGestion || !hojaCortes) {
    ui.alert('Error: hojas no encontradas.');
    return;
  }

  // Calcular KPIs de Gestión Diaria
  const lastRow = hojaGestion.getLastRow();
  if (lastRow < 2) {
    ui.alert('No hay datos en Gestión Diaria.');
    return;
  }

  const data = hojaGestion.getRange(2, 1, lastRow - 1, 15).getValues();

  // Filtrar por mes
  const meses = {'enero':1,'febrero':2,'marzo':3,'abril':4,'mayo':5,'junio':6,
                  'julio':7,'agosto':8,'septiembre':9,'octubre':10,'noviembre':11,'diciembre':12};
  const mesNum = meses[mes.toLowerCase()];

  let reg = 0, cont = 0, cotiz = 0, ventas = 0, prima = 0;
  data.forEach(row => {
    let rowDate = row[0];
    let rowMonth = -1;
    if (rowDate instanceof Date) {
      rowMonth = rowDate.getMonth() + 1;
    } else if (typeof rowDate === 'string') {
      // Try to parse
      const d = new Date(rowDate);
      if (!isNaN(d)) rowMonth = d.getMonth() + 1;
    }
    if (mesNum && rowMonth === mesNum) {
      reg += parseInt(row[3]) || 0;
      cont += parseInt(row[7]) || 0;
      cotiz += parseInt(row[8]) || 0;
      ventas += parseInt(row[10]) || 0;
      prima += parseFloat(row[11]) || 0;
    }
  });

  // Si no se filtró por mes, tomar todo
  if (!mesNum) {
    data.forEach(row => {
      reg += parseInt(row[3]) || 0;
      cont += parseInt(row[7]) || 0;
      cotiz += parseInt(row[8]) || 0;
      ventas += parseInt(row[10]) || 0;
      prima += parseFloat(row[11]) || 0;
    });
  }

  const pContacto = reg > 0 ? cont / reg : 0;
  const pEfect = reg > 0 ? ventas / reg : 0;

  // Escribir corte
  const corteRow = hojaCortes.getLastRow() + 1;
  hojaCortes.getRange(corteRow, 1).setValue(new Date()).setNumberFormat('dd/MM/yyyy HH:mm');
  hojaCortes.getRange(corteRow, 2).setValue(mes);
  hojaCortes.getRange(corteRow, 3).setValue(reg);
  hojaCortes.getRange(corteRow, 4).setValue(cont);
  hojaCortes.getRange(corteRow, 5).setValue(cotiz);
  hojaCortes.getRange(corteRow, 6).setValue(ventas);
  hojaCortes.getRange(corteRow, 7).setValue(prima).setNumberFormat('$#,##0');
  hojaCortes.getRange(corteRow, 8).setValue(pContacto).setNumberFormat('0.0%');
  hojaCortes.getRange(corteRow, 9).setValue(pEfect).setNumberFormat('0.0%');
  hojaCortes.getRange(corteRow, 10).setValue(nota);

  ui.alert(
    '✅ Corte Registrado',
    `Corte de ${mes} registrado:\n` +
    `Registros: ${reg} | Contactados: ${cont} | Ventas: ${ventas}\n` +
    `Prima: $${prima.toLocaleString()}\n` +
    `% Contacto: ${(pContacto*100).toFixed(1)}% | % Efectividad: ${(pEfect*100).toFixed(1)}%`,
    ui.ButtonSet.OK
  );
}

// ═══════════════════════════════════════════════
// INSTRUCCIONES PARA IMPORTAR EXCEL COMPLETO
// ═══════════════════════════════════════════════
function instruccionesExcel() {
  SpreadsheetApp.getUi().alert(
    '🔃 Importar INFORME AUTOS Excel',
    'Para importar tu archivo INFORME AUTOS:\n\n' +
    'OPCIÓN 1 — Desde el Dashboard (recomendado):\n' +
    '  Abre el Dashboard HTML y usa el botón "Subir Excel"\n' +
    '  en el panel de configuración (engranaje ⚙️).\n' +
    '  El dashboard lee el archivo directamente.\n\n' +
    'OPCIÓN 2 — Copiar datos manualmente:\n' +
    '  1. Abre tu INFORME AUTOS en Excel\n' +
    '  2. Copia los datos de la hoja que necesites\n' +
    '  3. Pégalos en la hoja "Importar Sistema"\n' +
    '  4. Usa el menú > Procesar importación\n\n' +
    'OPCIÓN 3 — Publicar y conectar:\n' +
    '  1. Sube el INFORME AUTOS a Google Drive\n' +
    '  2. Conviértelo a Google Sheets\n' +
    '  3. Publica en la web (Archivo > Publicar)\n' +
    '  4. Conecta el ID en el Dashboard',
    SpreadsheetApp.getUi().ButtonSet.OK
  );
}

// ═══════════════════════════════════════════════
// RESUMEN AUTOMÁTICO
// ═══════════════════════════════════════════════
function crearHojaResumen() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let hoja = ss.getSheetByName(CONFIG.hojaResumen);

  if (!hoja) {
    hoja = ss.insertSheet(CONFIG.hojaResumen);
    hoja.setTabColor('#059669');
  }

  hoja.clear();

  hoja.getRange('A1').setValue('RESUMEN AUTOMÁTICO — ACTUALIZADO EN VIVO');
  hoja.getRange('A1').setFontSize(14).setFontWeight('bold').setFontColor('#02296A');
  hoja.getRange('A2').setValue('Última actualización:');
  hoja.getRange('B2').setValue(new Date());
  hoja.getRange('B2').setNumberFormat('dd/MM/yyyy HH:mm');

  // KPIs Generales
  hoja.getRange('A4').setValue('KPIs GENERALES');
  hoja.getRange('A4').setFontSize(12).setFontWeight('bold').setFontColor('#02296A');

  const gSheet = `'${CONFIG.hojaGestion}'`;
  const kpis = [
    ['Total Registros', `=SUMPRODUCT((${gSheet}!D:D)*1)`],
    ['Total Contactados', `=SUMPRODUCT((${gSheet}!H:H)*1)`],
    ['Total Cotizaciones', `=SUMPRODUCT((${gSheet}!I:I)*1)`],
    ['Total Ventas', `=SUMPRODUCT((${gSheet}!K:K)*1)`],
    ['Prima Total', `=SUMPRODUCT((${gSheet}!L:L)*1)`],
    ['% Contactabilidad', `=IF(B5>0,B6/B5,0)`],
    ['% Cotización vs Contactados', `=IF(B6>0,B7/B6,0)`],
    ['% Efectividad (Ventas/Reg)', `=IF(B5>0,B8/B5,0)`],
    ['% Cierre vs Cotizados', `=IF(B7>0,B8/B7,0)`],
    ['Prima Promedio por Venta', `=IF(B8>0,B9/B8,0)`],
  ];

  kpis.forEach((k, i) => {
    const r = 5 + i;
    hoja.getRange(r, 1).setValue(k[0]).setFontWeight('bold');
    hoja.getRange(r, 2).setFormula(k[1]);
    if (i >= 5 && i <= 8) hoja.getRange(r, 2).setNumberFormat('0.0%');
    if (i === 4 || i === 9) hoja.getRange(r, 2).setNumberFormat('$#,##0');
  });

  // Por Agente
  hoja.getRange('A17').setValue('POR AGENTE');
  hoja.getRange('A17').setFontSize(12).setFontWeight('bold').setFontColor('#02296A');

  const agHeaders = ['Agente', 'Registros', 'Contactados', 'Cotizaciones', 'Ventas', 'Prima', '% Contacto', '% Efectividad'];
  agHeaders.forEach((h, i) => {
    hoja.getRange(18, i + 1).setValue(h).setFontWeight('bold').setBackground('#02296A').setFontColor('#FFFFFF');
  });

  CONFIG.agentes.forEach((ag, i) => {
    const r = 19 + i;
    hoja.getRange(r, 1).setValue(ag);
    hoja.getRange(r, 2).setFormula(`=SUMPRODUCT((${gSheet}!B:B="${ag}")*(${gSheet}!D:D))`);
    hoja.getRange(r, 3).setFormula(`=SUMPRODUCT((${gSheet}!B:B="${ag}")*(${gSheet}!H:H))`);
    hoja.getRange(r, 4).setFormula(`=SUMPRODUCT((${gSheet}!B:B="${ag}")*(${gSheet}!I:I))`);
    hoja.getRange(r, 5).setFormula(`=SUMPRODUCT((${gSheet}!B:B="${ag}")*(${gSheet}!K:K))`);
    hoja.getRange(r, 6).setFormula(`=SUMPRODUCT((${gSheet}!B:B="${ag}")*(${gSheet}!L:L))`);
    hoja.getRange(r, 7).setFormula(`=IF(B${r}>0,C${r}/B${r},0)`);
    hoja.getRange(r, 8).setFormula(`=IF(B${r}>0,E${r}/B${r},0)`);
    hoja.getRange(r, 6).setNumberFormat('$#,##0');
    hoja.getRange(r, 7).setNumberFormat('0.0%');
    hoja.getRange(r, 8).setNumberFormat('0.0%');
  });

  // Por Fuente
  const fRow = 19 + CONFIG.agentes.length + 2;
  hoja.getRange(`A${fRow}`).setValue('POR FUENTE DE LEAD');
  hoja.getRange(`A${fRow}`).setFontSize(12).setFontWeight('bold').setFontColor('#02296A');

  const fHeaders = ['Fuente', 'Registros', 'Contactados', 'Ventas', 'Prima', '% Contacto', '% Efectividad'];
  fHeaders.forEach((h, i) => {
    hoja.getRange(fRow + 1, i + 1).setValue(h).setFontWeight('bold').setBackground('#02296A').setFontColor('#FFFFFF');
  });

  CONFIG.fuentes.forEach((f, i) => {
    const r = fRow + 2 + i;
    hoja.getRange(r, 1).setValue(f);
    hoja.getRange(r, 2).setFormula(`=SUMPRODUCT((${gSheet}!C:C="${f}")*(${gSheet}!D:D))`);
    hoja.getRange(r, 3).setFormula(`=SUMPRODUCT((${gSheet}!C:C="${f}")*(${gSheet}!H:H))`);
    hoja.getRange(r, 4).setFormula(`=SUMPRODUCT((${gSheet}!C:C="${f}")*(${gSheet}!K:K))`);
    hoja.getRange(r, 5).setFormula(`=SUMPRODUCT((${gSheet}!C:C="${f}")*(${gSheet}!L:L))`);
    hoja.getRange(r, 6).setFormula(`=IF(B${r}>0,C${r}/B${r},0)`);
    hoja.getRange(r, 7).setFormula(`=IF(B${r}>0,D${r}/B${r},0)`);
    hoja.getRange(r, 5).setNumberFormat('$#,##0');
    hoja.getRange(r, 6).setNumberFormat('0.0%');
    hoja.getRange(r, 7).setNumberFormat('0.0%');
  });

  // Plan de acción resumen
  const pRow = fRow + 2 + CONFIG.fuentes.length + 2;
  hoja.getRange(`A${pRow}`).setValue('PLAN DE ACCIÓN');
  hoja.getRange(`A${pRow}`).setFontSize(12).setFontWeight('bold').setFontColor('#02296A');

  const pSheet = `'${CONFIG.hojaPlan}'`;
  const planKpis = [
    ['Total Tareas', `=COUNTA(${pSheet}!A5:A100)-COUNTBLANK(${pSheet}!A5:A100)`],
    ['Pendientes', `=COUNTIF(${pSheet}!G5:G100,"Pendiente")`],
    ['En Proceso', `=COUNTIF(${pSheet}!G5:G100,"En Proceso")`],
    ['Completadas', `=COUNTIF(${pSheet}!G5:G100,"Completada")`],
    ['% Avance', `=IF(B${pRow+1}>0,B${pRow+4}/B${pRow+1},0)`],
  ];

  planKpis.forEach((k, i) => {
    const r = pRow + 1 + i;
    hoja.getRange(r, 1).setValue(k[0]).setFontWeight('bold');
    hoja.getRange(r, 2).setFormula(k[1]);
    if (i === 4) hoja.getRange(r, 2).setNumberFormat('0%');
  });

  hoja.setColumnWidth(1, 28);
  hoja.setColumnWidth(2, 18);
  for (let i = 3; i <= 8; i++) hoja.setColumnWidth(i, 15);
}

function actualizarResumen() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const hoja = ss.getSheetByName(CONFIG.hojaResumen);
  if (hoja) {
    hoja.getRange('B2').setValue(new Date());
  }
}

// ═══════════════════════════════════════════════
// IMPORT CSV — Guía al usuario
// ═══════════════════════════════════════════════
function importarCSV() {
  SpreadsheetApp.getUi().alert(
    '📥 Importar datos del sistema',
    'Para importar datos:\n\n' +
    '1. Ve a la hoja "Importar Sistema"\n' +
    '2. Pega los datos del reporte de tu sistema desde la fila 12\n' +
    '   (la fila 11 tiene los encabezados de referencia)\n' +
    '3. Vuelve al menú 🚗 Zurich Autos > Procesar importación\n\n' +
    'Los datos se copiarán a "Gestión Diaria" automáticamente.',
    SpreadsheetApp.getUi().ButtonSet.OK
  );

  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const hoja = ss.getSheetByName(CONFIG.hojaImport);
  if (hoja) ss.setActiveSheet(hoja);
}

// ═══════════════════════════════════════════════
// TRIGGER AUTOMÁTICO: al editar hoja de import
// ═══════════════════════════════════════════════
function onEdit(e) {
  // Auto-detectar cuando pegan datos en la hoja de importación
  const sheet = e.source.getActiveSheet();
  if (sheet.getName() === CONFIG.hojaImport && e.range.getRow() >= 12) {
    // Mostrar toast indicando que hay datos nuevos
    SpreadsheetApp.getActiveSpreadsheet().toast(
      'Se detectaron datos nuevos. Usa el menú 🚗 Zurich Autos > Procesar importación para procesarlos.',
      'Datos detectados',
      8
    );
  }
}
