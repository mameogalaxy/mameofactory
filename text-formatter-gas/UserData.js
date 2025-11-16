function hashPassword(password) {
  return Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, password)
    .map(byte => (byte < 0 ? byte + 256 : byte).toString(16).padStart(2, '0'))
    .join('');
}

function registerNewUser(username, email, password) {
  try {
    const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
    let sheet = ss.getSheetByName('ユーザーデータ');
    
    if (!sheet) {
      sheet = ss.insertSheet('ユーザーデータ');
      sheet.appendRow(['ユーザー名', 'メールアドレス', 'パスワードハッシュ', '登録日時', '最終ログイン', 'モンスターデータ', '今日の回数', 'トータル回数', 'ブロンズ宝箱', 'シルバー宝箱', 'ゴールド宝箱', '最終プレイ日', 'ミッション日付', 'ログインミッション', 'プレイミッション', 'タイムミッション']);
      sheet.getRange('A1:P1').setFontWeight('bold').setBackground('#06b6d4').setFontColor('#ffffff');
    }
    
    const data = sheet.getDataRange().getValues();
    for (let i = 1; i < data.length; i++) {
      if (data[i][0] === username) {
        return { success: false, message: 'このユーザー名は既に使用されています' };
      }
      if (data[i][1] === email) {
        return { success: false, message: 'このメールアドレスは既に登録されています' };
      }
    }
    
    const hashedPassword = hashPassword(password);
    const now = new Date();
    const initialMonsterData = JSON.stringify({
      owned: [],
      active: ''
    });
    
    sheet.appendRow([username, email, hashedPassword, now, now, initialMonsterData, 0, 0, 0, 0, 0, now.toDateString(), now.toDateString(), false, false, false]);
    
    return {
      success: true,
      message: 'ユーザー登録完了！',
      autoLogin: true,
      userData: {
        username: username,
        email: email,
        monsterData: initialMonsterData,
        todayCount: 0,
        totalCount: 0,
        bronzeTreasure: 0,
        silverTreasure: 0,
        goldTreasure: 0,
        lastPlayDate: now.toDateString()
      }
    };
  } catch (error) {
    Logger.log('Error in registerNewUser: ' + error.toString());
    return { success: false, message: 'エラー: ' + error.toString() };
  }
}

function loginUser(username, email, password) {
  try {
    const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
    const sheet = ss.getSheetByName('ユーザーデータ');
    
    if (!sheet) {
      return { success: false, message: 'ユーザーデータが見つかりません' };
    }
    
    const hashedPassword = hashPassword(password);
    const data = sheet.getDataRange().getValues();
    
    for (let i = 1; i < data.length; i++) {
      if (data[i][0] === username && data[i][1] === email && data[i][2] === hashedPassword) {
        const now = new Date();
        const today = now.toDateString();
        const lastPlayDate = data[i][11] ? new Date(data[i][11]).toDateString() : '';
        
        let todayCount = data[i][6] || 0;
        if (lastPlayDate !== today) {
          todayCount = 0;
        }
        
        sheet.getRange(i + 1, 5).setValue(now);
        
        const bronzeTreasure = typeof data[i][8] !== 'undefined' ? data[i][8] : 0;
        const silverTreasure = typeof data[i][9] !== 'undefined' ? data[i][9] : 0;
        const goldTreasure = typeof data[i][10] !== 'undefined' ? data[i][10] : 0;
        
        return {
          success: true,
          message: 'ログイン成功！',
          userData: {
            username: data[i][0],
            email: email,
            monsterData: data[i][5] || JSON.stringify({ owned: [{ id: 'slime', level: 1, exp: 0 }], active: 'slime' }),
            todayCount: todayCount,
            totalCount: data[i][7] || 0,
            bronzeTreasure: bronzeTreasure,
            silverTreasure: silverTreasure,
            goldTreasure: goldTreasure,
            lastPlayDate: lastPlayDate,
            missionDate: data[i][12] ? new Date(data[i][12]).toDateString() : '',
            loginClaimed: data[i][13] || false,
            playsClaimed: data[i][14] || false,
            timeClaimed: data[i][15] || false
          }
        };
      }
    }
    
    return { success: false, message: 'ユーザー名、メールアドレス、またはパスワードが間違っています' };
  } catch (error) {
    Logger.log('Error in loginUser: ' + error.toString());
    return { success: false, message: 'エラー: ' + error.toString() };
  }
}

function saveMissionClaim(email, missionType) {
  const lock = LockService.getScriptLock();
  try {
    lock.waitLock(10000);
    const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
    const sheet = ss.getSheetByName('ユーザーデータ');
    if (!sheet) return { success: false };
    const data = sheet.getDataRange().getValues();
    const today = new Date().toDateString();
    for (let i = 1; i < data.length; i++) {
      if (data[i][1] === email) {
        const missionDate = data[i][12] ? new Date(data[i][12]).toDateString() : '';
        if (missionDate !== today) {
          sheet.getRange(i + 1, 13).setValue(today);
          sheet.getRange(i + 1, 14).setValue(false);
          sheet.getRange(i + 1, 15).setValue(false);
          sheet.getRange(i + 1, 16).setValue(false);
        }
        const col = missionType === 'login' ? 14 : missionType === 'plays' ? 15 : 16;
        sheet.getRange(i + 1, col).setValue(true);
        return { success: true };
      }
    }
    return { success: false };
  } catch (error) {
    return { success: false };
  } finally {
    lock.releaseLock();
  }
}

function saveUserData(email, monsterData, todayCount, bronzeTreasure, silverTreasure, goldTreasure) {
  const lock = LockService.getScriptLock();
  try {
    lock.waitLock(10000);
    
    const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
    const sheet = ss.getSheetByName('ユーザーデータ');
    
    if (!sheet) {
      return { success: false, message: 'ユーザーデータが見つかりません' };
    }
    
    const data = sheet.getDataRange().getValues();
    const now = new Date();
    const today = now.toDateString();
    
    for (let i = 1; i < data.length; i++) {
      if (data[i][1] === email) {
        const lastPlayDate = data[i][11] ? new Date(data[i][11]).toDateString() : '';
        const savedTodayCount = data[i][6] || 0;
        const savedTotalCount = data[i][7] || 0;
        
        let newTodayCount = todayCount;
        let newTotalCount = savedTotalCount;
        
        if (lastPlayDate !== today) {
          newTotalCount = savedTotalCount + todayCount;
        } else {
          const addedCount = todayCount - savedTodayCount;
          if (addedCount > 0) {
            newTotalCount = savedTotalCount + addedCount;
          }
        }
        
        sheet.getRange(i + 1, 6).setValue(monsterData);
        sheet.getRange(i + 1, 7).setValue(newTodayCount);
        sheet.getRange(i + 1, 8).setValue(newTotalCount);
        sheet.getRange(i + 1, 9).setValue(bronzeTreasure);
        sheet.getRange(i + 1, 10).setValue(silverTreasure);
        sheet.getRange(i + 1, 11).setValue(goldTreasure);
        sheet.getRange(i + 1, 12).setValue(today);
        
        return { success: true, message: 'データ保存完了', totalCount: newTotalCount };
      }
    }
    
    return { success: false, message: 'ユーザーが見つかりません' };
  } catch (error) {
    Logger.log('Error in saveUserData: ' + error.toString());
    return { success: false, message: 'エラー: ' + error.toString() };
  } finally {
    lock.releaseLock();
  }
}
