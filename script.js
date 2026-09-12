function doGet() {
  return HtmlService.createHtmlOutputFromFile('Page');
}

function getSessionQueue(mode, targetSubject, limit) {
  var sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName("Sheet1");
  if (!sheet) return [];
  var data = sheet.getDataRange().getValues();
  var cards = [];

  for (var i = 1; i < data.length; i++) {
    var row = data[i];
    var rowIndex = i + 1;
    
    var id = row[0];              
    var subject = row[1];         
    var frontText = row[2];       
    var backText = row[3];        
    var frontImage = row[4];      
    var interval = row[5];        // Col F
    var ease = row[6];            // Col G
    var nextReviewDate = row[7];  // Col H

    if (!frontText || String(frontText).trim() === "") continue;

    if (targetSubject && targetSubject !== 'All' && subject !== targetSubject) {
      continue;
    }

    var includeCard = true;

    if (mode === 'new') {
      // Only include if interval is empty, blank, or 0
      if (interval !== "" && interval !== null && Number(interval) !== 0) {
        includeCard = false;
      }
    } else {
      // Due & Cumulative: Pulls everything available
      includeCard = true;
    }

    if (includeCard) {
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
  var sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName("Sheet1");
  if (!sheet) return { success: false };
  
  var intervalCell = sheet.getRange(rowIndex, 6); 
  var easeCell = sheet.getRange(rowIndex, 7);     
  var dueDateCell = sheet.getRange(rowIndex, 8);  

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