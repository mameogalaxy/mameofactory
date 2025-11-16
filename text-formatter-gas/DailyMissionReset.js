function resetDailyMissions() {
  const lock = LockService.getScriptLock();
  try {
    lock.waitLock(30000);
    
    const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
    const sheet = ss.getSheetByName('ユーザーデータ');
    
    if (!sheet) {
      Logger.log('ユーザーデータシートが見つかりません');
      return;
    }
    
    const data = sheet.getDataRange().getValues();
    const today = new Date().toDateString();
    let resetCount = 0;
    
    for (let i = 1; i < data.length; i++) {
      const missionDate = data[i][12] ? new Date(data[i][12]).toDateString() : '';
      
      if (missionDate !== today) {
        sheet.getRange(i + 1, 13).setValue(today);
        sheet.getRange(i + 1, 14).setValue(false);
        sheet.getRange(i + 1, 15).setValue(false);
        sheet.getRange(i + 1, 16).setValue(false);
        resetCount++;
      }
    }
    
    Logger.log('デイリーミッションリセット完了: ' + resetCount + '人のユーザー');
    return { success: true, resetCount: resetCount };
    
  } catch (error) {
    Logger.log('Error in resetDailyMissions: ' + error.toString());
    return { success: false, error: error.toString() };
  } finally {
    lock.releaseLock();
  }
}

function setupDailyTrigger() {
  deleteDailyTriggers();
  
  ScriptApp.newTrigger('resetDailyMissions')
    .timeBased()
    .atHour(0)
    .everyDays(1)
    .create();
  
  Logger.log('デイリートリガー設定完了: 毎日午前0時に実行');
}

function deleteDailyTriggers() {
  const triggers = ScriptApp.getProjectTriggers();
  for (let i = 0; i < triggers.length; i++) {
    if (triggers[i].getHandlerFunction() === 'resetDailyMissions') {
      ScriptApp.deleteTrigger(triggers[i]);
    }
  }
}

function testDailyReset() {
  const result = resetDailyMissions();
  Logger.log('テスト実行結果: ' + JSON.stringify(result));
}
