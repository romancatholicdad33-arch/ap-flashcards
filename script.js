function doGet() {
  return HtmlService.createHtmlOutputFromFile('Page');
}

function getSessionQueue(mode, targetSubject, limit) {
  var sheet = SpreadsheetApp.getActiveSpreadsheet().getActiveSheet();
  var lastRow = sheet.getLastRow();
  if (lastRow < 2) return [];
  
  var data = sheet.getRange(2, 1, lastRow - 1, 8).getValues();
  var cards = [];

  for (var i = 0; i < data.length; i++) {
    var row = data[i];
    var rowIndex = i + 2; 
    
    var id = row[0];
    var subject = String(row[1] || "").trim();
    var frontText = String(row[2] || "").trim();
    var backText = String(row[3] || "").trim();
    var frontImage = String(row[4] || "").trim();
    var interval = row[5];
    var ease = row[6];
    var nextReviewDate = row[7];

    // If a row is a multi-line continuation (e.g. missing an ID or question text), skip it cleanly
    if (!frontText || frontText === "") {
      continue;
    }

    // Filter by subject dropdown if selected
    if (targetSubject && targetSubject !== 'All' && subject.toLowerCase() !== targetSubject.toLowerCase()) {
      if (!subject.toLowerCase().includes(targetSubject.toLowerCase())) {
        continue;
      }
    }

    // Mode check for new cards
    if (mode === 'new') {
      if (interval !== "" && interval !== null && Number(interval) !== 0) {
        continue;
      }
    }

    cards.push({
      rowIndex: rowIndex,
      subject: subject || "General",
      frontText: frontText,
      backText: backText,
      frontImage: frontImage.startsWith("http") ? frontImage : "",
      interval: interval !== "" ? Number(interval) : 0,
      ease: ease !== "" ? Number(ease) : 2.5,
      nextReviewDate: nextReviewDate
    });
  }

  // FAILSAFE: If filters return 0, grab all valid rows regardless of multi-line formatting
  if (cards.length === 0 && data.length > 0) {
    for (var i = 0; i < data.length; i++) {
      var row = data[i];
      var fText = String(row[2] || row[3] || "").trim();
      if (fText !== "") {
        cards.push({
          rowIndex: i + 2,
          subject: String(row[1] || "General"),
          frontText: fText,
          backText: String(row[3] || ""),
          frontImage: "",
          interval: 0,
          ease: 2.5,
          nextReviewDate: ""
        });
      }
    }
  }

  // Apply card limit selector
  if (limit && limit !== 'all' && limit !== 'Full') {
    var maxCount = parseInt(limit, 10);
    if (!isNaN(maxCount) && cards.length > maxCount) {
      cards = cards.slice(0, maxCount);
    }
  }

  return cards;
}

function updateCardProgress(rowIndex, rating) {
  var sheet = SpreadsheetApp.getActiveSpreadsheet().getActiveSheet();
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