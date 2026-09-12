function doGet() {
  return HtmlService.createHtmlOutputFromFile('Page')
    .setTitle('A&P Flashcards')
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
}

function getSessionQueue(mode, subject, limit) {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheets()[0]; // Uses your primary sheet
  var data = sheet.getDataRange().getValues();
  
  var queue = [];
  var now = new Date();
  
  // Assumes row 1 is headers, data starts at index 1
  // Columns: 0: Front, 1: Back, 2: Subject, 3: Image, 4: DueDate, 5: ReviewCount
  for (var i = 1; i < data.length; i++) {
    var row = data[i];
    var cardSubject = row[2];
    var frontText = row[0];
    var backText = row[1];
    var frontImage = row[3] || "";
    var dueDate = row[4] ? new Date(row[4]) : null;
    var reviewCount = row[5] || 0;
    
    // Subject filter check
    if (subject !== "All" && cardSubject !== subject) {
      continue;
    }
    
    var isNew = (reviewCount === 0 || !dueDate);
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
        rowIndex: i + 1, // 1-based index for Spreadsheet row updates
        subject: cardSubject,
        frontText: frontText,
        backText: backText,
        frontImage: frontImage,
        reviewCount: reviewCount
      });
    }
  }
  
  // Apply card limit
  if (limit !== 'all') {
    var maxCards = parseInt(limit, 10) || 10;
    queue = queue.slice(0, maxCards);
  }
  
  return queue;
}

function updateCardProgress(rowIndex, rating) {
  var sheet = SpreadsheetApp.getActiveSpreadsheet().getSheets()[0];
  var now = new Date();
  
  var reviewCount = sheet.getRange(rowIndex, 6).getValue() || 0;
  reviewCount++;
  
  var daysToAdd = 1;
  if (rating === 'again') {
    daysToAdd = 0; // Review again soon
  } else if (rating === 'hard') {
    daysToAdd = 2;
  } else if (rating === 'easy') {
    daysToAdd = 5;
  }
  
  var nextDueDate = new Date();
  nextDueDate.setDate(now.getDate() + daysToAdd);
  
  sheet.getRange(rowIndex, 5).setValue(nextDueDate); // Column E: Due Date
  sheet.getRange(rowIndex, 6).setValue(reviewCount); // Column F: Review Count
}