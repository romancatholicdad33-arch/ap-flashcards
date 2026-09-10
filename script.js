// script.js - Updated for Direct GitHub Images & Instant iOS Tap Response
const GOOGLE_SHEET_CSV_URL = 'https://docs.google.com/spreadsheets/d/e/2PACX-1vSze_p4QmL1qGlhNLBs_0cZ4pDaYjj0vmvKms06KdtFuQzlQjXC2zURSJFsbRthVPSq2q71wnf7qeEQ/pub?output=csv';

let fullDeck = [];
let activeDeck = [];
let currentIndex = 0;
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

// Lightweight CSV parser handling commas inside quotes
function parseCSV(text) {
    const lines = text.trim().split('\n');
    if (lines.length < 2) return [];
    
    const headers = parseCSVLine(lines[0]);
    const results = [];

    for (let i = 1; i < lines.length; i++) {
        if (!lines[i].trim()) continue;
        const rowValues = parseCSVLine(lines[i]);
        const row = {};
        headers.forEach((header, idx) => {
            row[header] = rowValues[idx] || '';
        });
        results.push(row);
    }
    return results;
}

function parseCSVLine(line) {
    const values = [];
    let current = '';
    let inQuotes = false;

    for (let i = 0; i < line.length; i++) {
        const char = line[i];
        if (char === '"' && line[i + 1] === '"') {
            current += '"';
            i++;
        } else if (char === '"') {
            inQuotes = !inQuotes;
        } else if (char === ',' && !inQuotes) {
            values.push(current.trim());
            current = '';
        } else {
            current += char;
        }
    }
    values.push(current.trim());
    return values;
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

function startSession() {
    const checkboxes = document.querySelectorAll('#subject-checkboxes input:checked');
    const selectedSubjects = Array.from(checkboxes).map(cb => cb.value);

    let filtered = fullDeck.filter(card => selectedSubjects.includes(card.subject || "General"));
    filtered.sort((a, b) => (userScores[a.id] || 0) - (userScores[b.id] || 0));

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
    cardEl.classList.remove('flipped', 'swiping-left', 'swiping-right');
    
    document.getElementById('bucket-left').classList.remove('active');
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

// Touch Swiping & Direct Tap Logic
const card = document.getElementById('card');
const bucketLeft = document.getElementById('bucket-left');
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

    // Only initiate swipe if horizontal movement clearly exceeds vertical scroll
    if (Math.abs(diffX) > 10 && Math.abs(diffX) > Math.abs(diffY)) {
        hasMoved = true;
        card.style.transform = `translateX(${diffX}px) rotate(${diffX / 15}deg)`;

        if (diffX < 0) {
            card.classList.add('swiping-left');
            card.classList.remove('swiping-right');
            bucketLeft.classList.add('active');
            bucketRight.classList.remove('active');
        } else {
            card.classList.add('swiping-right');
            card.classList.remove('swiping-left');
            bucketRight.classList.add('active');
            bucketLeft.classList.remove('active');
        }
    }
}, { passive: true });

card.addEventListener('touchend', () => {
    if (!isDragging) return;
    isDragging = false;
    let diffX = currentX - startX;

    // Direct Tap: If fingers didn't drag horizontally, flip immediately
    if (!hasMoved && Math.abs(diffX) < 10) {
        card.style.transition = 'transform 0.25s ease';
        card.classList.toggle('flipped');
        resetState();
        return;
    }

    // Swipe Thresholds
    if (diffX < -90) {
        depositCard('left', false);
    } else if (diffX > 90) {
        depositCard('right', true);
    } else {
        card.style.transition = 'transform 0.25s ease';
        card.style.transform = '';
        resetState();
    }
});

function resetState() {
    card.classList.remove('swiping-left', 'swiping-right');
    bucketLeft.classList.remove('active');
    bucketRight.classList.remove('active');
}

function depositCard(direction, mastered) {
    card.style.transition = 'all 0.3s ease';
    let targetX = direction === 'left' ? -350 : 350;
    
    card.style.transform = `translateX(${targetX}px) translateY(120px) scale(0.3) rotate(${targetX / 10}deg)`;
    card.style.opacity = '0';

    showToast(mastered ? "Deposited into Mastered ✅" : "Deposited into Needs Practice ❌");

    setTimeout(() => {
        handleSwipe(mastered);
    }, 300);
}

function showToast(msg) {
    toast.innerText = msg;
    toast.classList.add('show');
    setTimeout(() => {
        toast.classList.remove('show');
    }, 1200);
}

function handleSwipe(mastered) {
    if (currentIndex >= activeDeck.length) return;
    const activeCard = activeDeck[currentIndex];
    let score = userScores[activeCard.id] || 0;

    if (mastered) {
        userScores[activeCard.id] = score + 1;
    } else {
        userScores[activeCard.id] = 0;
        activeDeck.push(activeCard);
    }

    localStorage.setItem('ap_mastery', JSON.stringify(userScores));
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