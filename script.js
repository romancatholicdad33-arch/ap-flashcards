// Serve the main HTML interface
function doGet() {
  return HtmlService.createHtmlOutputFromFile('Page')
    .setTitle('A&P Flashcards')
    .addMetaTag('viewport', 'width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no')
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
}

// Save flashcard progress to Google Cloud (User Properties)
function saveUserProgress(progressData) {
  var userProps = PropertiesService.getUserProperties();
  userProps.setProperty('ap_flashcard_progress', JSON.stringify(progressData));
  return true;
}

// Retrieve flashcard progress from Google Cloud
function getUserProgress() {
  var userProps = PropertiesService.getUserProperties();
  var data = userProps.getProperty('ap_flashcard_progress');
  return data ? JSON.parse(data) : {};
}

// Fetch all flashcard data from Google Sheet
function getAllMasterCards() {
  var sheet = SpreadsheetApp.getActiveSpreadsheet().getActiveSheet();
  var data = sheet.getDataRange().getValues();
  var cards = [];

  // Assuming Row 1 is headers: [ID, Block, Subject, Question, Answer, ImageURL]
  for (var i = 1; i < data.length; i++) {
    var row = data[i];
    if (row[0] !== "" && row[0] !== null) {
      cards.push({
        id: row[0],
        block: row[1],
        subject: row[2],
        q: row[3],
        a: row[4],
        image: row[5] || ""
      });
    }
  }
  return cards;
}

// Build mapping of Blocks to Subjects for setup dropdowns/checkboxes
function getBlockAndSubjectData() {
  var sheet = SpreadsheetApp.getActiveSpreadsheet().getActiveSheet();
  var data = sheet.getDataRange().getValues();
  var blockMap = {};

  for (var i = 1; i < data.length; i++) {
    var block = String(data[i][1]).trim();
    var subject = String(data[i][2]).trim();

    if (block && subject) {
      if (!blockMap[block]) {
        blockMap[block] = [];
      }
      if (blockMap[block].indexOf(subject) === -1) {
        blockMap[block].push(subject);
      }
    }
  }
  return blockMap;
}