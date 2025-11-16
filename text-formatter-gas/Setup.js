function setupSheet() {
  const ss = SpreadsheetApp.openById('180zH4Ba5OTXMCN5abNQQsICWACn6IKTNQ0q8Wo8jmuc');
  let sheet = ss.getSheetByName('スコア');
  
  if (!sheet) {
    sheet = ss.insertSheet('スコア');
  }
  
  if (sheet.getLastRow() === 0) {
    sheet.appendRow(['日時', 'プレイヤー名', 'メールアドレス', 'ステージ', 'スクワット回数']);
    sheet.getRange('A1:E1').setFontWeight('bold').setBackground('#667eea').setFontColor('#ffffff');
    sheet.setFrozenRows(1);
    sheet.setColumnWidths(1, 5, 150);
  }
}
