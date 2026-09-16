function doGet() {
  return HtmlService.createTemplateFromFile('Page')
    .evaluate()
    .setTitle('A&P Flashcards')
    .addMetaTag('viewport', 'width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no');
}

/**
 * Scans Column B to dynamically pull all unique subjects for the dropdown menu
 */
function getUniqueSubjects() {
  var sheet = SpreadsheetApp.getActiveSpreadsheet().getActiveSheet();
  var data = sheet.getDataRange().getValues();
  var subjects = [];
  
  // Start at index 1 to skip row 1 headers
  for (var i = 1; i < data.length; i++) {
    var subjectVal = data[i][1]; // Column B
    if (subjectVal && subjects.indexOf(subjectVal) === -1) {
      subjects.push(subjectVal);
    }
  }
  return subjects.sort();
}

/**
 * Fetches cards based on mode, subject, and volume, then applies a true shuffle
 */
function getFlashcards(mode, subjectFilter, limit) {
  var sheet = SpreadsheetApp.getActiveSpreadsheet().getActiveSheet();
  var data = sheet.getDataRange().getValues();
  var today = new Date();
  today.setHours(0, 0, 0, 0);

  var cards = [];

  for (var i = 1; i < data.length; i++) {
    var row = data[i];
    var id = row[0];
    var subject = row[1];
    var q = row[2];
    var a = row[3];
    var image = row[4];
    var interval = parseInt(row[5]) || 0;
    var ease = parseFloat(row[6]) || 2.5;
    var dueDateRaw = row[7];
    
    if (!id || !q) continue;

    // Filter by subject
    if (subjectFilter !== 'All' && subject !== subjectFilter) {
      continue;
    }

    var dueDate = dueDateRaw ? new Date(dueDateRaw) : null;
    if (dueDate) dueDate.setHours(0, 0, 0, 0);

    var isNew = (interval === 0 || !dueDateRaw);
    var isDue = (dueDate && dueDate <= today);

    var matchesMode = false;
    if (mode === 'New' && isNew) matchesMode = true;
    else if (mode === 'Due' && isDue) matchesMode = true;
    else if (mode === 'Combined' && (isNew || isDue)) matchesMode = true;

    if (matchesMode) {
      cards.push({
        id: id,
        subject: subject,
        q: q,
        a: a,
        image: image,
        interval: interval,
        ease: ease,
        dueDate: dueDateRaw ? Utilities.formatDate(new Date(dueDateRaw), Session.getScriptTimeZone(), 'M/d/yyyy') : ''
      });
    }
  }

  // True Interleaved Shuffling (Fisher-Yates)
  for (var k = cards.length - 1; k > 0; k--) {
    var j = Math.floor(Math.random() * (k + 1));
    var temp = cards[k];
    cards[k] = cards[j];
    cards[j] = temp;
  }

  // Apply volume limit
  if (limit && limit > 0 && limit < cards.length) {
    cards = cards.slice(0, limit);
  }

  return cards;
}

/**
 * Updates columns F (interval), G (ease), and H (dueDate) for a given card ID
 */
function updateCardProgress(id, newInterval, newEase, newDueDateStr) {
  var sheet = SpreadsheetApp.getActiveSpreadsheet().getActiveSheet();
  var data = sheet.getDataRange().getValues();

  for (var i = 1; i < data.length; i++) {
    if (data[i][0] == id) {
      sheet.getRange(i + 1, 6).setValue(newInterval);    // Column F
      sheet.getRange(i + 1, 7).setValue(newEase);        // Column G
      sheet.getRange(i + 1, 8).setValue(newDueDateStr);  // Column H
      return { success: true };
    }
  }
  return { success: false, error: 'Card ID not found' };
}