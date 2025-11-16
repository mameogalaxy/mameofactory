function migrateMissionColumns() {
  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  const sheet = ss.getSheetByName('ユーザーデータ');
  
  if (!sheet) {
    Logger.log('ユーザーデータシートが見つかりません');
    return;
  }
  
  const headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
  
  // 既に列があるかチェック
  if (headers.indexOf('ミッション日付') === -1) {
    sheet.getRange(1, 13).setValue('ミッション日付');
    sheet.getRange(1, 14).setValue('ログインミッション');
    sheet.getRange(1, 15).setValue('プレイミッション');
    sheet.getRange(1, 16).setValue('タイムミッション');
    
    sheet.getRange('A1:P1').setFontWeight('bold').setBackground('#06b6d4').setFontColor('#ffffff');
    
    const lastRow = sheet.getLastRow();
    if (lastRow > 1) {
      const today = new Date().toDateString();
      for (let i = 2; i <= lastRow; i++) {
        sheet.getRange(i, 13).setValue(today);
        sheet.getRange(i, 14).setValue(false);
        sheet.getRange(i, 15).setValue(false);
        sheet.getRange(i, 16).setValue(false);
      }
    }
    
    Logger.log('ミッション列を追加しました');
  } else {
    Logger.log('ミッション列は既に存在します');
  }
}
