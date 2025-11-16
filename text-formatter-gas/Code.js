const SPREADSHEET_ID = '180zH4Ba5OTXMCN5abNQQsICWACn6IKTNQ0q8Wo8jmuc';
const SCRIPT_URL = ScriptApp.getService().getUrl();

function getAuthUrl() {
  return SCRIPT_URL + '?mode=auth';
}

function getAnonymousUrl() {
  return SCRIPT_URL;
}

function doGet(e) {
  try {
    const mode = e.parameter.mode;
    
    if (mode === 'auth') {
      try {
        const userEmail = Session.getActiveUser().getEmail();
        registerUser();
        return HtmlService.createHtmlOutput(
          '<html><head><meta charset="utf-8"><style>body{font-family:sans-serif;text-align:center;padding:50px;background:#e8f5e9}</style></head>' +
          '<body><h2>✅ ログイン成功！</h2><p>ゲームに戻ります</p>' +
          '<button onclick="goBack()" style="padding:15px 30px;font-size:1.2rem;cursor:pointer;background:#4CAF50;color:#fff;border:none;border-radius:8px">ゲームに戻る</button>' +
          '<script>function goBack(){if(window.opener){window.opener.postMessage({type:"loginSuccess"},"*");setTimeout(function(){window.close();},500);}else{window.location.href="' + SCRIPT_URL + '";}}</script>' +
          '</body></html>'
        );
      } catch(e) {
        return HtmlService.createHtmlOutput('<h1>エラー: ' + e.toString() + '</h1>');
      }
    }
    
    const page = e.parameter.page || 'game';
    Logger.log('Page requested: ' + page);
    
    if (page === 'items') {
      Logger.log('Returning items page');
      return HtmlService.createTemplateFromFile('items').evaluate()
        .setTitle('アイテムボックス - AI筋トレRPG')
        .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
    }
    
    if (page === 'ranking') {
      Logger.log('Returning ranking page');
      return HtmlService.createHtmlOutputFromFile('ranking')
        .setTitle('AI筋トレRPG ランキング')
        .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
    }
    
    if (page === 'test') {
      Logger.log('Returning test page');
      return HtmlService.createHtmlOutputFromFile('test')
        .setTitle('Test Page')
        .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
    }
    
    Logger.log('Returning game page');
    return HtmlService.createTemplateFromFile('game').evaluate()
      .setTitle('AI筋トレRPG')
      .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL)
      .addMetaTag('viewport', 'width=device-width, initial-scale=1');
  } catch (error) {
    Logger.log('Error in doGet: ' + error.toString());
    return HtmlService.createHtmlOutput('<h1>Error: ' + error.toString() + '</h1>');
  }
}

function saveScore(playerName, stage, totalSquats) {
  try {
    const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
    let sheet = ss.getSheetByName('スコア');
    
    if (!sheet) {
      sheet = ss.insertSheet('スコア');
      sheet.appendRow(['日時', 'プレイヤー名', 'メールアドレス', 'ステージ', 'スクワット回数']);
      sheet.getRange('A1:E1').setFontWeight('bold').setBackground('#667eea').setFontColor('#ffffff');
    }
    
    const timestamp = new Date();
    const userEmail = Session.getActiveUser().getEmail() || '匿名';
    sheet.appendRow([timestamp, playerName, userEmail, stage, totalSquats]);
    
    updateUserStats(stage);
    
    return { success: true, message: 'スコアを保存しました！' };
  } catch (error) {
    Logger.log('Error in saveScore: ' + error.toString());
    return { success: false, message: 'エラー: ' + error.toString() };
  }
}

function getStageRanking() {
  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  const sheet = ss.getSheetByName('スコア');
  
  if (!sheet) return [];
  
  const lastRow = sheet.getLastRow();
  if (lastRow <= 1) return [];
  
  const data = sheet.getRange(2, 1, lastRow - 1, 5).getValues();
  const scores = [];
  
  for (let i = 0; i < data.length; i++) {
    if (data[i][1]) {
      scores.push({
        date: data[i][0],
        name: data[i][1],
        email: data[i][2],
        stage: data[i][3],
        squats: data[i][4]
      });
    }
  }
  
  scores.sort(function(a, b) {
    return b.stage - a.stage || b.squats - a.squats;
  });
  
  return scores.slice(0, 50);
}

function getSquatRanking() {
  try {
    const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
    const sheet = ss.getSheetByName('スコア');
    
    if (!sheet) return [];
    
    const data = sheet.getDataRange().getValues();
    if (data.length <= 1) return [];
    
    const scores = data.slice(1).map(row => ({
      date: row[0],
      name: row[1],
      email: row[2],
      stage: row[3],
      squats: row[4]
    }));
    
    scores.sort((a, b) => b.squats - a.squats || b.stage - a.stage);
    
    return scores.slice(0, 50);
  } catch (error) {
    Logger.log('Error in getSquatRanking: ' + error.toString());
    return [];
  }
}
