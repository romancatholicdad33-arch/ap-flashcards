function doGet() {
  return HtmlService.createHtmlOutputFromFile('Page')
    .setTitle('A&P Flashcards')
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
}

function getSessionQueue(mode, subject, limit) {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheets()[0];
  var data = sheet.getDataRange().getValues();
  
  var queue = [];
  var now = new Date();
  
  for (var i = 1; i < data.length; i++) {
    var row = data[i];
    var cardId = row[0];        // Column A: id
    var cardSubject = row[1];   // Column B: subject
    var frontText = row[2];     // Column C: q (Question)
    var backText = row[3];      // Column D: a (Answer)
    var frontImage = row[4] ? String(row[4]).trim() : ""; // Column E: image
    var interval = row[5] || 0; // Column F: interval
    var dueDate = row[7] ? new Date(row[7]) : null;        // Column H: dueDate
    
    // Skip empty rows
    if (!frontText && !backText) continue;
    
    // Subject filter check
    if (subject !== "All" && cardSubject !== subject) {
      continue;
    }
    
    var isNew = (interval === 0 || !dueDate);
    var isDue = (dueDate && dueDate <= now);
    
    var includeCard = false;
    if (mode === 'new' && isNew) {
      includeCard = true;
    } else if (mode === 'due' && isDue) {
      includeCard = true;
    } else if (mode === 'combined') {
      if (isNew || isDue) {
        includeCard = true;
      }
    }
    
    if (includeCard) {
      queue.push({
        rowIndex: i + 1,
        cardId: cardId,
        subject: cardSubject,
        frontText: frontText,
        backText: backText,
        frontImage: frontImage,
        interval: interval
      });
    }
  }
  
  // Randomize queue order
  queue = shuffleArray(queue);
  
  // Apply limit after shuffling
  if (limit !== 'all') {
    var maxCards = parseInt(limit, 10) || 10;
    queue = queue.slice(0, maxCards);
  }
  
  return queue;
}

function shuffleArray(array) {
  for (var i = array.length - 1; i > 0; i--) {
    var j = Math.floor(Math.random() * (i + 1));
    var temp = array[i];
    array[i] = array[j];
    array[j] = temp;
  }
  return array;
}

function updateCardProgress(rowIndex, rating) {
  var sheet = SpreadsheetApp.getActiveSpreadsheet().getSheets()[0];
  var now = new Date();
  
  var interval = sheet.getRange(rowIndex, 6).getValue() || 0;
  interval++;
  
  var daysToAdd = 1;
  if (rating === 'again') {
    daysToAdd = 0;
  } else if (rating === 'hard') {
    daysToAdd = 2;
  } else if (rating === 'easy') {
    daysToAdd = 5;
  }
  
  var nextDueDate = new Date();
  nextDueDate.setDate(now.getDate() + daysToAdd);
  
  sheet.getRange(rowIndex, 6).setValue(interval); // Update interval (Column F)
  sheet.getRange(rowIndex, 8).setValue(nextDueDate); // Update dueDate (Column H)
}