function doGet() {
  return HtmlService.createHtmlOutputFromFile('Page');
}

function getSessionQueue(mode, targetSubject) {
  try {
    var sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName("Sheet1");
    if (!sheet) {
      throw new Error("Sheet 'Sheet1' not found.");
    }
    
    var data = sheet.getDataRange().getValues();
    var cards = [];
    var today = new Date();
    today.setHours(0, 0, 0, 0);

    for (var i = 1; i < data.length; i++) {
      var row = data[i];
      var rowIndex = i + 1;
      
      var id = row[0];              // Col A: id
      var subject = row[1];         // Col B: subject
      var frontText = row[2];       // Col C: q (Front)
      var backText = row[3];        // Col D: a (Back)
      var frontImage = row[4];      // Col E: image
      var interval = row[5];        // Col F: interval
      var ease = row[6];            // Col G: ease
      var nextReviewDate = row[7];  // Col H: dueDate

      // Skip empty question rows
      if (!frontText || String(frontText).trim() === "") continue;

      // Check if card is due
      var isDue = false;
      if (!nextReviewDate || String(nextReviewDate).trim() === "") {
        isDue = true; // New cards are always due
      } else {
        var reviewDate = new Date(nextReviewDate);
        reviewDate.setHours(0, 0, 0, 0);
        if (reviewDate <= today) {
          isDue = true;
        }
      }

      if (isDue) {
        if (targetSubject && targetSubject !== 'All' && subject !== targetSubject) {
          continue;
        }

        cards.push({
          rowIndex: rowIndex,
          subject: subject || "General",
          frontText: frontText,
          backText: backText || "",
          frontImage: frontImage || "",
          backImage: "",
          interval: interval || 0,
          ease: ease || 2.5,
          nextReviewDate: nextReviewDate
        });
      }
    }

    return cards;
  } catch (error) {
    Logger.log("Error in getSessionQueue: " + error.message);
    throw error;
  }
}