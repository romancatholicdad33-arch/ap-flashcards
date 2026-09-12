function doGet() {
  return HtmlService.createHtmlOutputFromFile('Page');
}

// --- 1. GET SESSION QUEUE ---
function getSessionQueue(mode, targetSubject) {
  var sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName("Sheet1");
  var data = sheet.getDataRange().getValues();
  var cards = [];
  var today = new Date();
  today.setHours(0, 0, 0, 0);

  for (var i = 1; i < data.length; i++) {
    var row = data[i];
    var rowIndex = i + 1; // 1-based row index for sheet updating
    
    // Column mapping based on your A&P Master Deck sheet structure:
    var id = row[0];              // Col A: id
    var subject = row[1];         // Col B: subject
    var frontText = row[2];       // Col C: q (Front)
    var backText = row[3];        // Col D: a (Back)
    var frontImage = row[4];      // Col E: image
    var interval = row[5];        // Col F: interval
    var ease = row[6];            // Col G: ease
    var nextReviewDate = row[7];  // Col H: dueDate

    // Skip empty rows
    if (!frontText) continue;

    // Check if card is due
    var isDue = false;
    if (!nextReviewDate) {
      isDue = true; // New cards are always due
    } else {
      var reviewDate = new Date(nextReviewDate);
      reviewDate.setHours(0, 0, 0, 0);
      if (reviewDate <= today) {
        isDue = true;
      }
    }

    if (isDue) {
      // Optional subject filter
      if (targetSubject && targetSubject !== 'All' && subject !== targetSubject) {
        continue;
      }

      cards.push({
        rowIndex: rowIndex,
        subject: subject,
        frontText: frontText,
        backText: backText,
        frontImage: frontImage,
        backImage: "", 
        interval: interval,
        ease: ease,
        nextReviewDate: nextReviewDate
      });
    }
  }

  return cards;
}