/**
 * CursoPro 5.1 - Google Sheets Backend gratuito sem CORS
 *
 * Esta versão evita erro de CORS usando:
 * - doGet + JSONP para leitura/teste
 * - doPost via formulário invisível para salvar
 */

const SHEET_DATA = 'DATA';
const SHEET_EVENTS = 'EVENTOS';
const SHEET_BACKUPS = 'BACKUPS';

function doGet(e) {
  setupSheets();

  const params = e && e.parameter ? e.parameter : {};
  const action = params.action || 'ping';
  const callback = params.callback || '';

  let result;

  try {
    if (action === 'ping') {
      result = {
        ok: true,
        message: 'CursoPro API online sem CORS',
        time: new Date().toISOString()
      };
    } else if (action === 'getData') {
      result = {
        ok: true,
        data: getStoredData()
      };
    } else {
      result = {
        ok: false,
        error: 'Ação GET inválida: ' + action
      };
    }
  } catch (error) {
    result = {
      ok: false,
      error: String(error && error.message ? error.message : error)
    };
  }

  if (callback) {
    return ContentService
      .createTextOutput(callback + '(' + JSON.stringify(result) + ');')
      .setMimeType(ContentService.MimeType.JAVASCRIPT);
  }

  return jsonOutput(result);
}

function doPost(e) {
  setupSheets();

  try {
    const params = e && e.parameter ? e.parameter : {};
    let action = params.action;
    let payload = {};

    if (params.payload) {
      payload = JSON.parse(params.payload);
    } else if (e && e.postData && e.postData.contents) {
      const body = JSON.parse(e.postData.contents);
      action = body.action;
      payload = body.payload || {};
    }

    if (action === 'saveData') {
      saveStoredData(payload.data || {});
      logEvent('saveData', 'Dados atualizados pelo site');
      return jsonOutput({ ok: true, message: 'Dados salvos' });
    }

    if (action === 'backup') {
      createBackup(payload.data || getStoredData());
      return jsonOutput({ ok: true, message: 'Backup criado' });
    }

    return jsonOutput({ ok: false, error: 'Ação POST inválida: ' + action });

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
      try {
        createBackup(JSON.parse(current));
      } catch (err) {}
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

  const maxRows = 31;
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
