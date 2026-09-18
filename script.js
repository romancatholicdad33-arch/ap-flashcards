function doGet() {
  return HtmlService.createTemplateFromFile('Page')
    .evaluate()
    .setTitle('A&P Flashcards')
    .addMetaTag('viewport', 'width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no');
}

/**
 * Reads Columns B (Block) and C (Subject) to build dynamic mapping
 */
function getBlockAndSubjectData() {
  var sheet = SpreadsheetApp.getActiveSpreadsheet().getActiveSheet();
  var data = sheet.getDataRange().getValues();
  var blockMap = {};
  
  for (var i = 1; i < data.length; i++) {
    var blockVal = data[i][1] ? String(data[i][1]).trim() : "Unassigned";
    var subjectVal = data[i][2] ? String(data[i][2]).trim() : "";
    
    if (!blockMap[blockVal]) {
      blockMap[blockVal] = [];
    }
    if (subjectVal && blockMap[blockVal].indexOf(subjectVal) === -1) {
      blockMap[blockVal].push(subjectVal);
    }
  }
  return blockMap;
}

/**
 * Fetches cards filtered by Mode, Multiple Blocks, Multiple Subjects, and Volume
 */
function getFlashcards(mode, selectedBlocks, selectedSubjects, limit) {
  var sheet = SpreadsheetApp.getActiveSpreadsheet().getActiveSheet();
  var data = sheet.getDataRange().getValues();
  var today = new Date();
  today.setHours(0, 0, 0, 0);

  var cards = [];

  var isAllBlocks = (!selectedBlocks || selectedBlocks.length === 0 || selectedBlocks.indexOf('All') !== -1);
  var isAllSubjects = (!selectedSubjects || selectedSubjects.length === 0 || selectedSubjects.indexOf('All') !== -1);

  for (var i = 1; i < data.length; i++) {
    var row = data[i];
    var id = row[0];
    var block = row[1] ? String(row[1]).trim() : "Unassigned";
    var subject = row[2] ? String(row[2]).trim() : "";
    var q = row[3];
    var a = row[4];
    var image = row[5];
    var interval = parseInt(row[6]) || 0;
    var ease = parseFloat(row[7]) || 2.5;
    var dueDateRaw = row[8];
    
    if (!id || !q) continue;

    // Multi-Block Filter
    if (!isAllBlocks && selectedBlocks.indexOf(block) === -1) {
      continue;
    }

    // Multi-Subject Filter
    if (!isAllSubjects && selectedSubjects.indexOf(subject) === -1) {
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
        block: block,
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
 * Updates columns G (interval), H (ease), and I (dueDate)
 */
function updateCardProgress(id, newInterval, newEase, newDueDateStr) {
  var sheet = SpreadsheetApp.getActiveSpreadsheet().getActiveSheet();
  var data = sheet.getDataRange().getValues();

  for (var i = 1; i < data.length; i++) {
    if (data[i][0] == id) {
      sheet.getRange(i + 1, 7).setValue(newInterval);    // Column G
      sheet.getRange(i + 1, 8).setValue(newEase);        // Column H
      sheet.getRange(i + 1, 9).setValue(newDueDateStr);  // Column I
      return { success: true };
    }
  }
  return { success: false, error: 'Card ID not found' };
}