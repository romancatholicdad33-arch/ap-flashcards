function doGet() {
  return HtmlService.createHtmlOutputFromFile('Page');
}

function getSessionQueue(mode, targetSubject, limit) {
  var sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName("Sheet1");
  if (!sheet) return [];
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

    if (!frontText || String(frontText).trim() === "") continue;

    var isDue = false;
    
    if (mode === 'new') {
      if (interval === "" || interval === null || Number(interval) === 0) {
        isDue = true;
      }
    } else {
      if (!nextReviewDate || String(nextReviewDate).trim() === "" || interval === "" || interval === null) {
        isDue = true;
      } else {
        var reviewDate = new Date(nextReviewDate);
        if (!isNaN(reviewDate.getTime())) {
          reviewDate.setHours(0, 0, 0, 0);
          if (reviewDate <= today) {
            isDue = true;
          }
        } else {
          isDue = true;
        }
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
        interval: interval !== "" ? Number(interval) : 0,
        ease: ease !== "" ? Number(ease) : 2.5,
        nextReviewDate: nextReviewDate
      });
    }
  }

  if (limit && limit !== 'all' && limit !== 'Full') {
    var maxCount = parseInt(limit, 10);
    if (!isNaN(maxCount) && cards.length > maxCount) {
      cards = cards.slice(0, maxCount);
    }
  }

  return cards;
}

function updateCardProgress(rowIndex, rating) {
  var sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName("Sheet1");
  if (!sheet) return { success: false };
  
  var intervalCell = sheet.getRange(rowIndex, 6); // Col F
  var easeCell = sheet.getRange(rowIndex, 7);     // Col G
  var dueDateCell = sheet.getRange(rowIndex, 8);  // Col H

  var currentInterval = Number(intervalCell.getValue()) || 0;
  var currentEase = Number(easeCell.getValue()) || 2.5;

  var newInterval, newEase;

  if (rating === 'again') {
    newInterval = 0;
    newEase = Math.max(1.3, currentEase - 0.2);
  } else if (rating === 'hard') {
    newInterval = Math.max(1, Math.round(currentInterval * 1.2));
    newEase = Math.max(1.3, currentEase - 0.15);
  } else if (rating === 'easy') {
    if (currentInterval === 0) {
      newInterval = 4;
    } else {
      newInterval = Math.round(currentInterval * currentEase);
    }
    newEase = currentEase + 0.15;
  }

  var nextDate = new Date();
  nextDate.setDate(nextDate.getDate() + newInterval);

  intervalCell.setValue(newInterval);
  easeCell.setValue(Math.round(newEase * 100) / 100);
  dueDateCell.setValue(nextDate);

  return { success: true };
}