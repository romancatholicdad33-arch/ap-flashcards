// --- 1. GET FINITE SESSION QUEUE ---
function getSessionQueue(mode, selectedSubject) {
  var sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName("Sheet1");
  var data = sheet.getDataRange().getValues();
  var today = new Date();
  today.setHours(0,0,0,0);
  
  var queue = [];
  
  // Loop through rows (skip header row 1)
  for (var i = 1; i < data.length; i++) {
    var row = data[i];
    var subject = row[1]; // Col B
    var rawDueDate = row[7]; // Col H (dueDate)
    
    // If dueDate is blank (newly added backlog), default to today
    var nextReview = rawDueDate ? new Date(rawDueDate) : new Date();
    nextReview.setHours(0,0,0,0);
    
    var isDue = nextReview <= today;
    
    if (isDue) {
      if (mode === "Blocked" && subject === selectedSubject) {
        queue.push(formatCardData(row, i + 1));
      } else if (mode === "Cumulative") {
        queue.push(formatCardData(row, i + 1));
      }
    }
  }
  
  // Apply interleaving shuffle if in cumulative mode
  if (mode === "Cumulative") {
    queue = shuffleInterleaved(queue);
  }
  
  return {
    totalDue: queue.length,
    cards: queue // Finite deck for hard stop
  };
}

// Map sheet columns to card properties (Image is explicitly on the front)
function formatCardData(row, rowIndex) {
  return {
    rowIndex: rowIndex,
    id: row[0],         // Col A
    subject: row[1],    // Col B
    frontText: row[2],  // Col C (q)
    backText: row[3],   // Col D (a)
    frontImage: row[4], // Col E (image -> rendered on FRONT)
    interval: row[5] || 0, // Col F
    ease: row[6] || 2.5    // Col G
  };
}

// --- 2. THE THREE-TIER REVIEW PROCESSOR ---
function processCardReview(rowIndex, rating) {
  var sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName("Sheet1");
  var interval = Number(sheet.getRange(rowIndex, 6).getValue()) || 0;
  var ease = Number(sheet.getRange(rowIndex, 7).getValue()) || 2.5;
  
  var today = new Date();
  var nextReviewDate = new Date();
  
  if (rating === "Red") {
    // RED: Reset interval, heavy penalty, keep dueDate as TODAY for next session later today
    interval = 1;
    ease = Math.max(1.3, ease - 0.20);
    nextReviewDate = today; 
    
  } else if (rating === "Orange") {
    // ORANGE: Standard baseline growth (Desirable difficulty)
    if (interval === 0) interval = 1;
    interval = Math.max(2, Math.round(interval * ease));
    ease = Math.max(1.3, ease - 0.05);
    nextReviewDate.setDate(today.getDate() + interval);
    
  } else if (rating === "Green") {
    // GREEN: Super-charged mastery multiplier
    if (interval === 0) interval = 1;
    var masteryBonus = 1.4; 
    interval = Math.max(3, Math.round(interval * ease * masteryBonus));
    ease = ease + 0.15;
    nextReviewDate.setDate(today.getDate() + interval);
  }
  
  // Automatically write calculations back to Sheet tracking columns (F, G, H)
  sheet.getRange(rowIndex, 6).setValue(interval);
  sheet.getRange(rowIndex, 7).setValue(ease);
  sheet.getRange(rowIndex, 8).setValue(nextReviewDate);
}

// --- 3. INTERLEAVING SHUFFLE HELPER ---
function shuffleInterleaved(array) {
  var currentIndex = array.length, temporaryValue, randomIndex;
  while (currentIndex !== 0) {
    randomIndex = Math.floor(Math.random() * currentIndex);
    currentIndex -= 1;
    temporaryValue = array[currentIndex];
    array[currentIndex] = array[randomIndex];
    array[randomIndex] = temporaryValue;
  }
  return array;
}