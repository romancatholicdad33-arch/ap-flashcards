// script.js - Randomized Shuffling, 3-Tier Spaced Cooldown, & Multiline CSV Parser
const GOOGLE_SHEET_CSV_URL = 'https://docs.google.com/spreadsheets/d/e/2PACX-1vSze_p4QmL1qGlhNLBs_0cZ4pDaYjj0vmvKms06KdtFuQzlQjXC2zURSJFsbRthVPSq2q71wnf7qeEQ/pub?output=csv';

let fullDeck = [];
let activeDeck = [];
let currentIndex = 0;
// userScores tracks object data: { streak: number }
let userScores = JSON.parse(localStorage.getItem('ap_mastery')) || {};
let customCards = JSON.parse(localStorage.getItem('ap_custom_cards')) || [];

// Fetch published CSV from Google Sheets
fetch(GOOGLE_SHEET_CSV_URL)
    .then(res => res.text())
    .then(csvText => {
        fullDeck = [...parseCSV(csvText), ...customCards];
        buildSubjectCheckboxes();
        startSession();
    })
    .catch(err => console.error("Error loading sheet:", err));

// Robust CSV Parser that handles quoted fields with internal newlines (multi-line cells)
function parseCSV(text) {
    let p = 0, c = '';
    let row = [''];
    let rows = [row];
    let inQuotes = false;
    
    while (p < text.length) {
        c = text[p];
        if (inQuotes) {
            if (c === '"') {
                if (text[p + 1] === '"') {
                    row[row.length - 1] += '"';
                    p++;
                } else {
                    inQuotes = false;
                }
            } else {
                row[row.length - 1] += c;
            }
        } else {
            if (c === '"') {
                inQuotes = true;
            } else if (c === ',') {
                row.push('');
            } else if (c === '\r') {
                // Skip carriage returns
            } else if (c === '\n') {
                row = [''];
                rows.push(row);
            } else {
                row[row.length - 1] += c;
            }
        }
        p++;
    }
    
    const cleanRows = rows.filter(r => r.length > 1 || (r.length === 1 && r[0].trim() !== ''));
    if (cleanRows.length < 2) return [];

    const headers = cleanRows[0].map(h => h.trim());
    const results = [];

    for (let i = 1; i < cleanRows.length; i++) {
        const rowValues = cleanRows[i];
        const rowObj = {};
        headers.forEach((header, idx) => {
            rowObj[header] = (rowValues[idx] !== undefined) ? rowValues[idx].trim() : '';
        });
        results.push(rowObj);
    }
    return results;
}

function buildSubjectCheckboxes() {
    const subjects = [...new Set(fullDeck.map(card => card.subject || "General"))];
    const container = document.getElementById('subject-checkboxes');
    container.innerHTML = '';

    subjects.forEach(subject => {
        const item = document.createElement('label');
        item.className = 'checkbox-item';
        item.innerHTML = `<input type="checkbox" value="${subject}" checked> ${subject}`;
        container.appendChild(item);
    });
}

// Fisher-Yates Shuffle algorithm for true randomization
function shuffleArray(array) {
    for (let i = array.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [array[i], array[j]] = [array[j], array[i]];
    }
    return array;
}

function startSession() {
    const checkboxes = document.querySelectorAll('#subject-checkboxes input:checked');
    const selectedSubjects = Array.from(checkboxes).map(cb => cb.value);

    let filtered = fullDeck.filter(card => selectedSubjects.includes(card.subject || "General"));
    
    // Randomize the order of cards initially
    shuffleArray(filtered);

    const limitVal = document.getElementById('card-limit-select').value;
    if (limitVal !== 'all') {
        const limit = parseInt(limitVal, 10);
        activeDeck = filtered.slice(0, limit);
    } else {
        activeDeck = filtered;
    }

    currentIndex = 0;
    showCard();
}

function showCard() {
    const cardEl = document.getElementById('card');
    cardEl.style.transition = 'none';
    cardEl.style.transform = '';
    cardEl.style.opacity = '1';
    cardEl.classList.remove('flipped', 'swiping-left', 'swiping-right', 'swiping-down');
    
    document.getElementById('bucket-left').classList.remove('active');
    document.getElementById('bucket-center').classList.remove('active');
    document.getElementById('bucket-right').classList.remove('active');

    if (activeDeck.length === 0 || currentIndex >= activeDeck.length) {
        document.getElementById('subject-title').innerText = "Session Complete";
        document.getElementById('progress').innerText = `0 of 0`;
        document.getElementById('question-text').innerText = "Session Complete!";
        document.getElementById('answer-text').innerText = "Adjust 'Study Options' to start another round.";
        document.getElementById('card-image').style.display = 'none';
        return;
    }

    const card = activeDeck[currentIndex];
    document.getElementById('subject-title').innerText = card.subject || "General";
    document.getElementById('subject-title-front').innerText = card.subject || "General";
    document.getElementById('progress').innerText = `Card ${currentIndex + 1} of ${activeDeck.length}`;
    document.getElementById('question-text').innerText = card.q;
    document.getElementById('answer-text').innerText = card.a;
    
    const imgEl = document.getElementById('card-image');
    if (card.image && card.image.trim() !== '') {
        imgEl.src = card.image.trim();
        imgEl.style.display = 'block';
    } else {
        imgEl.style.display = 'none';
    }
}

// Touch Swiping & 3-Way Gestures (Left = Hard, Down = Good, Right = Easy)
const card = document.getElementById('card');
const bucketLeft = document.getElementById('bucket-left');
const bucketCenter = document.getElementById('bucket-center');
const bucketRight = document.getElementById('bucket-right');
const toast = document.getElementById('toast');

let startX = 0;
let startY = 0;
let currentX = 0;
let currentY = 0;
let isDragging = false;
let hasMoved = false;

card.addEventListener('touchstart', (e) => {
    startX = e.touches[0].clientX;
    startY = e.touches[0].clientY;
    currentX = startX;
    currentY = startY;
    isDragging = true;
    hasMoved = false;
    card.style.transition = 'none';
}, { passive: true });

card.addEventListener('touchmove', (e) => {
    if (!isDragging) return;
    currentX = e.touches[0].clientX;
    currentY = e.touches[0].clientY;
    
    let diffX = currentX - startX;
    let diffY = currentY - startY;

    // Check if dragging downward vs horizontally
    if (diffY > 15 && diffY > Math.abs(diffX)) {
        hasMoved = true;
        card.style.transform = `translateY(${diffY}px) rotate(${diffY / 30}deg)`;
        card.classList.add('swiping-down');
        card.classList.remove('swiping-left', 'swiping-right');
        
        bucketCenter.classList.add('active');
        bucketLeft.classList.remove('active');
        bucketRight.classList.remove('active');
    } else if (Math.abs(diffX) > 15 && Math.abs(diffX) >= diffY) {
        hasMoved = true;
        card.style.transform = `translateX(${diffX}px) rotate(${diffX / 15}deg)`;

        if (diffX < 0) {
            card.classList.add('swiping-left');
            card.classList.remove('swiping-right', 'swiping-down');
            bucketLeft.classList.add('active');
            bucketCenter.classList.remove('active');
            bucketRight.classList.remove('active');
        } else {
            card.classList.add('swiping-right');
            card.classList.remove('swiping-left', 'swiping-down');
            bucketRight.classList.add('active');
            bucketCenter.classList.remove('active');
            bucketLeft.classList.remove('active');
        }
    }
}, { passive: true });

card.addEventListener('touchend', () => {
    if (!isDragging) return;
    isDragging = false;
    let diffX = currentX - startX;
    let diffY = currentY - startY;

    if (!hasMoved && Math.abs(diffX) < 10 && Math.abs(diffY) < 10) {
        card.style.transition = 'transform 0.25s ease';
        card.classList.toggle('flipped');
        resetState();
        return;
    }

    if (diffY > 80 && diffY > Math.abs(diffX)) {
        depositCard('down', 'good');
    } else if (diffX < -80) {
        depositCard('left', 'hard');
    } else if (diffX > 80) {
        depositCard('right', 'easy');
    } else {
        card.style.transition = 'transform 0.25s ease';
        card.style.transform = '';
        resetState();
    }
});

function resetState() {
    card.classList.remove('swiping-left', 'swiping-right', 'swiping-down');
    bucketLeft.classList.remove('active');
    bucketCenter.classList.remove('active');
    bucketRight.classList.remove('active');
}

function depositCard(direction, rating) {
    card.style.transition = 'all 0.3s ease';
    
    if (direction === 'down') {
        card.style.transform = `translateY(350px) scale(0.3) rotate(10deg)`;
        showToast("Logged as Good ⚠️");
    } else if (direction === 'left') {
        card.style.transform = `translateX(-350px) translateY(120px) scale(0.3) rotate(-25deg)`;
        showToast("Logged as Hard ❌");
    } else {
        card.style.transform = `translateX(350px) translateY(120px) scale(0.3) rotate(25deg)`;
        showToast("Logged as Easy ✅");
    }
    
    card.style.opacity = '0';

    setTimeout(() => {
        handleRating(rating);
    }, 300);
}

function showToast(msg) {
    toast.innerText = msg;
    toast.classList.add('show');
    setTimeout(() => {
        toast.classList.remove('show');
    }, 1200);
}

function handleRating(rating) {
    if (currentIndex >= activeDeck.length) return;
    const activeCard = activeDeck[currentIndex];
    
    let cardData = userScores[activeCard.id];
    if (typeof cardData !== 'object' || cardData === null) {
        cardData = { streak: typeof cardData === 'number' ? cardData : 0 };
    }

    let insertOffset = 3;

    if (rating === 'hard') {
        cardData.streak = 0;
        insertOffset = 2; // Re-insert very close for immediate drill
    } else if (rating === 'good') {
        cardData.streak += 1;
        insertOffset = Math.min(cardData.streak * 2 + 4, activeDeck.length - currentIndex); // Moderate gap
    } else if (rating === 'easy') {
        cardData.streak += 2;
        insertOffset = Math.min(cardData.streak * 3 + 8, activeDeck.length - currentIndex); // Deep spaced gap
    }

    userScores[activeCard.id] = cardData;
    localStorage.setItem('ap_mastery', JSON.stringify(userScores));

    // Re-queue card further down based on Spaced Cooldown logic
    activeDeck.splice(currentIndex + insertOffset, 0, activeCard);
    currentIndex++;
    showCard();
}

function openFilterModal() { document.getElementById('filter-modal').style.display = 'flex'; }
function closeFilterModal() { document.getElementById('filter-modal').style.display = 'none'; }

function applyFilters() {
    closeFilterModal();
    startSession();
}

function openModal() { document.getElementById('card-modal').style.display = 'flex'; }
function closeModal() { document.getElementById('card-modal').style.display = 'none'; }

function saveNewCard() {
    const subject = document.getElementById('new-subject').value;
    const q = document.getElementById('new-q').value;
    const a = document.getElementById('new-a').value;
    const image = document.getElementById('new-img').value;

    if (!q || !a) return;

    const newCard = { id: Date.now().toString(), subject: subject || "General", q, a, image };
    customCards.push(newCard);
    localStorage.setItem('ap_custom_cards', JSON.stringify(customCards));
    fullDeck.push(newCard);
    buildSubjectCheckboxes();
    closeModal();
    startSession();
}