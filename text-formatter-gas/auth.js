function getUserInfo() {
  const userEmail = Session.getActiveUser().getEmail();
  const isLoggedIn = userEmail && userEmail !== '';
  
  return {
    isLoggedIn: isLoggedIn,
    email: userEmail || '匿名',
    displayName: isLoggedIn ? userEmail.split('@')[0] : 'ゲスト'
  };
}

function registerUser() {
  try {
    const userInfo = getUserInfo();
    if (!userInfo.isLoggedIn) {
      return { success: false, message: 'ログインが必要です' };
    }
    
    const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
    let sheet = ss.getSheetByName('ユーザー');
    
    if (!sheet) {
      sheet = ss.insertSheet('ユーザー');
      sheet.appendRow(['登録日時', 'メールアドレス', '最終プレイ日時', '総プレイ回数', '最高ステージ']);
      sheet.getRange('A1:E1').setFontWeight('bold').setBackground('#667eea').setFontColor('#ffffff');
    }
    
    const data = sheet.getDataRange().getValues();
    let userRow = -1;
    
    for (let i = 1; i < data.length; i++) {
      if (data[i][1] === userInfo.email) {
        userRow = i + 1;
        break;
      }
    }
    
    const now = new Date();
    
    if (userRow === -1) {
      sheet.appendRow([now, userInfo.email, now, 1, 1]);
      return { success: true, message: 'ユーザー登録完了！', isNew: true };
    } else {
      sheet.getRange(userRow, 3).setValue(now);
      const playCount = sheet.getRange(userRow, 4).getValue() + 1;
      sheet.getRange(userRow, 4).setValue(playCount);
      return { success: true, message: 'おかえりなさい！', isNew: false };
    }
  } catch (error) {
    Logger.log('Error in registerUser: ' + error.toString());
    return { success: false, message: 'エラー: ' + error.toString() };
  }
}

function updateUserStats(stage) {
  try {
    const userInfo = getUserInfo();
    if (!userInfo.isLoggedIn) return { success: false };
    
    const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
    const sheet = ss.getSheetByName('ユーザー');
    
    if (!sheet) return { success: false };
    
    const data = sheet.getDataRange().getValues();
    
    for (let i = 1; i < data.length; i++) {
      if (data[i][1] === userInfo.email) {
        const currentMax = data[i][4] || 1;
        if (stage > currentMax) {
          sheet.getRange(i + 1, 5).setValue(stage);
        }
        return { success: true };
      }
    }
    
    return { success: false };
  } catch (error) {
    Logger.log('Error in updateUserStats: ' + error.toString());
    return { success: false };
  }
}

function getLoginUrl() {
  return ScriptApp.getService().getUrl() + '?mode=login';
}

function getLogoutUrl() {
  return 'https://accounts.google.com/Logout';
}
