function doGet() {
  return HtmlService.createHtmlOutputFromFile('Page')
    .setTitle('A&P Flashcards')
    .addMetaTag('viewport', 'width=device-width, initial-scale=1');
}

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

function getAllMasterCards() {
  var sheet = SpreadsheetApp.getActiveSpreadsheet().getActiveSheet();
  var data = sheet.getDataRange().getValues();
  var cards = [];

  for (var i = 1; i < data.length; i++) {
    var id = data[i][0];
    var block = String(data[i][1]).trim();
    var subject = String(data[i][2]).trim();
    var q = data[i][3];
    var a = data[i][4];
    var img = data[i][5] || "";

    if (id && q && a) {
      cards.push({
        id: String(id),
        block: block,
        subject: subject,
        q: String(q),
        a: String(a),
        image: String(img)
      });
    }
  }
  return cards;
}