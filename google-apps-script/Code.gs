/**
 * CursoPro 5.0 - Google Sheets Backend gratuito
 *
 * Como usar:
 * 1. Crie uma planilha no Google Sheets.
 * 2. Vá em Extensões > Apps Script.
 * 3. Apague o conteúdo padrão e cole este código.
 * 4. Clique em Salvar.
 * 5. Clique em Implantar > Nova implantação.
 * 6. Tipo: App da Web.
 * 7. Executar como: Eu.
 * 8. Quem tem acesso: Qualquer pessoa.
 * 9. Copie a URL /exec e cole no painel admin do CursoPro.
 */

const SHEET_DATA = 'DATA';
const SHEET_EVENTS = 'EVENTOS';
const SHEET_BACKUPS = 'BACKUPS';

function doGet(e) {
  return jsonOutput({
    ok: true,
    message: 'CursoPro API online',
    time: new Date().toISOString()
  });
}

function doPost(e) {
  try {
    const raw = e && e.postData && e.postData.contents ? e.postData.contents : '{}';
    const body = JSON.parse(raw);
    const action = body.action;
    const payload = body.payload || {};

    setupSheets();

    if (action === 'ping') {
      return jsonOutput({
        ok: true,
        message: 'Conexão funcionando',
        time: new Date().toISOString()
      });
    }

    if (action === 'getData') {
      return jsonOutput({
        ok: true,
        data: getStoredData()
      });
    }

    if (action === 'saveData') {
      saveStoredData(payload.data || {});
      logEvent('saveData', 'Dados atualizados pelo site');
      return jsonOutput({
        ok: true,
        message: 'Dados salvos'
      });
    }

    if (action === 'backup') {
      createBackup(payload.data || getStoredData());
      return jsonOutput({
        ok: true,
        message: 'Backup criado'
      });
    }

    return jsonOutput({
      ok: false,
      error: 'Ação inválida: ' + action
    });

  } catch (error) {
    return jsonOutput({
      ok: false,
      error: String(error && error.message ? error.message : error)
    });
  }
}

function setupSheets() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();

  let dataSheet = ss.getSheetByName(SHEET_DATA);
  if (!dataSheet) {
    dataSheet = ss.insertSheet(SHEET_DATA);
    dataSheet.getRange('A1').setValue('key');
    dataSheet.getRange('B1').setValue('value');
    dataSheet.getRange('A2').setValue('cursoProData');
    dataSheet.getRange('B2').setValue('{}');
  }

  let eventsSheet = ss.getSheetByName(SHEET_EVENTS);
  if (!eventsSheet) {
    eventsSheet = ss.insertSheet(SHEET_EVENTS);
    eventsSheet.appendRow(['data', 'tipo', 'descricao']);
  }

  let backupsSheet = ss.getSheetByName(SHEET_BACKUPS);
  if (!backupsSheet) {
    backupsSheet = ss.insertSheet(SHEET_BACKUPS);
    backupsSheet.appendRow(['data', 'json']);
  }
}

function getStoredData() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName(SHEET_DATA);
  const value = sheet.getRange('B2').getValue();

  if (!value) return {};

  try {
    return JSON.parse(value);
  } catch (error) {
    return {};
  }
}

function saveStoredData(data) {
  const lock = LockService.getScriptLock();
  lock.waitLock(10000);

  try {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const sheet = ss.getSheetByName(SHEET_DATA);

    const current = sheet.getRange('B2').getValue();
    if (current) {
      createBackup(JSON.parse(current));
    }

    sheet.getRange('B2').setValue(JSON.stringify(data));
    sheet.getRange('C1').setValue('ultima_atualizacao');
    sheet.getRange('C2').setValue(new Date());

  } finally {
    lock.releaseLock();
  }
}

function createBackup(data) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName(SHEET_BACKUPS);
  const lastRow = sheet.getLastRow();

  sheet.appendRow([new Date(), JSON.stringify(data)]);

  // Mantém só os últimos 30 backups para não pesar a planilha.
  const maxRows = 31; // cabeçalho + 30 backups
  if (lastRow > maxRows) {
    sheet.deleteRows(2, lastRow - maxRows);
  }
}

function logEvent(type, description) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName(SHEET_EVENTS);
  sheet.appendRow([new Date(), type, description]);
}

function jsonOutput(obj) {
  return ContentService
    .createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}
