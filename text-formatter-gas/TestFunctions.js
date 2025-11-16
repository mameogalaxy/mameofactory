function testGetStageRanking() {
  try {
    Logger.log('Testing getStageRanking...');
    const result = getStageRanking();
    Logger.log('Result: ' + JSON.stringify(result));
    Logger.log('Success! Found ' + result.length + ' records');
    return result;
  } catch (error) {
    Logger.log('ERROR: ' + error.toString());
    Logger.log('Stack: ' + error.stack);
    throw error;
  }
}

function testGetSquatRanking() {
  try {
    Logger.log('Testing getSquatRanking...');
    const result = getSquatRanking();
    Logger.log('Result: ' + JSON.stringify(result));
    Logger.log('Success! Found ' + result.length + ' records');
    return result;
  } catch (error) {
    Logger.log('ERROR: ' + error.toString());
    Logger.log('Stack: ' + error.stack);
    throw error;
  }
}

function testDoGet() {
  try {
    Logger.log('Testing doGet with page=ranking...');
    const e = { parameter: { page: 'ranking' } };
    const result = doGet(e);
    Logger.log('Success! HTML output created');
    return result;
  } catch (error) {
    Logger.log('ERROR: ' + error.toString());
    Logger.log('Stack: ' + error.stack);
    throw error;
  }
}

function testDoGetTest() {
  try {
    Logger.log('Testing doGet with page=test...');
    const e = { parameter: { page: 'test' } };
    const result = doGet(e);
    Logger.log('Success! HTML output created');
    return result;
  } catch (error) {
    Logger.log('ERROR: ' + error.toString());
    Logger.log('Stack: ' + error.stack);
    throw error;
  }
}
