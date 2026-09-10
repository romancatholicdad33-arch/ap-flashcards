let fullDeck = [];
let activeDeck = [];
let currentIndex = 0;
let userScores = JSON.parse(localStorage.getItem('ap_mastery')) || {};
let customCards = JSON.parse(localStorage.getItem('ap_custom_cards')) || [];

fetch('deck.json')
    .then(res => res.json())
    .then(data => {
        fullDeck = [...data, ...customCards];
        buildSubjectCheckboxes();
        startSession();
    });

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
    // 1. Get selected subjects
    const checkboxes = document.querySelectorAll('#subject-checkboxes input:checked');
    const selectedSubjects = Array.from(checkboxes).map(cb => cb.value);

    // 2. Filter deck by subject
    let filtered = fullDeck.filter(card => selectedSubjects.includes(card.subject || "General"));

    // 3. Sort by Leitner score (lowest mastery first)
    filtered.sort((a, b) => (userScores[a.id] || 0) - (userScores[b.id] || 0));

    // 4. Apply card limit
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
    if (card.image) {
        imgEl.src = card.image;
        imgEl.style.display = 'block';
    } else {
        imgEl.style.display = 'none';
    }
}

// Touch Swiping Logic
const card = document.getElementById('card');
const bucketLeft = document.getElementById('bucket-left');
const bucketRight = document.getElementById('bucket-right');
const toast = document.getElementById('toast');

let startX = 0;
let currentX = 0;
let isDragging = false;
let startTime = 0;

card.addEventListener('touchstart', (e) => {
    startX = e.touches[0].clientX;
    currentX = startX;
    isDragging = true;
    startTime = Date.now();
    card.style.transition = 'none';
});

card.addEventListener('touchmove', (e) => {
    if (!isDragging) return;
    currentX = e.touches[0].clientX;
    let diffX = currentX - startX;

    if (Math.abs(diffX) > 8) {
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
});

card.addEventListener('touchend', () => {
    if (!isDragging) return;
    isDragging = false;
    let diffX = currentX - startX;
    let duration = Date.now() - startTime;

    if (Math.abs(diffX) < 10 && duration < 300) {
        card.style.transition = 'transform 0.3s ease';
        card.classList.toggle('flipped');
        resetState();
        return;
    }

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

// Desktop Click Support
card.addEventListener('click', (e) => {
    if (Math.abs(currentX - startX) < 10) {
        card.style.transition = 'transform 0.3s ease';
        card.classList.toggle('flipped');
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

// Modal & Filter Handlers
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