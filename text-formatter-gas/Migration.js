function migrateUserDataSheet() {
  try {
    const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
    const sheet = ss.getSheetByName('ユーザーデータ');
    
    if (!sheet) {
      return { success: false, message: 'ユーザーデータシートが見つかりません' };
    }
    
    const headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
    
    // 既に新しい形式か確認
    if (headers[8] === 'ブロンズ宝箱' && headers[9] === 'シルバー宝箱' && headers[10] === 'ゴールド宝箱') {
      return { success: true, message: '既に新しい形式です' };
    }
    
    // 古い形式の場合、移行を実行
    if (headers[8] === '宝箱数') {
      // J列とK列を挿入
      sheet.insertColumnsAfter(9, 2);
      
      // ヘッダーを更新
      sheet.getRange(1, 9).setValue('ブロンズ宝箱');
      sheet.getRange(1, 10).setValue('シルバー宝箱');
      sheet.getRange(1, 11).setValue('ゴールド宝箱');
      sheet.getRange(1, 12).setValue('最終プレイ日');
      
      // 既存の宝箱数をブロンズに移動し、シルバーとゴールドを0で初期化
      const lastRow = sheet.getLastRow();
      if (lastRow > 1) {
        // シルバーとゴールドを0で埋める
        const zeroValues = [];
        for (let i = 2; i <= lastRow; i++) {
          zeroValues.push([0, 0]);
        }
        sheet.getRange(2, 10, lastRow - 1, 2).setValues(zeroValues);
      }
      
      // ヘッダー行のスタイルを更新
      sheet.getRange('A1:L1').setFontWeight('bold').setBackground('#06b6d4').setFontColor('#ffffff');
      
      return { success: true, message: '移行完了！' };
    }
    
    return { success: false, message: '不明な形式です' };
  } catch (error) {
    Logger.log('Error in migrateUserDataSheet: ' + error.toString());
    return { success: false, message: 'エラー: ' + error.toString() };
  }
}
