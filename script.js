let deck = [];
let currentIndex = 0;
let userScores = JSON.parse(localStorage.getItem('ap_mastery')) || {};
let customCards = JSON.parse(localStorage.getItem('ap_custom_cards')) || [];

fetch('deck.json')
    .then(res => res.json())
    .then(data => {
        deck = [...data, ...customCards];
        deck.sort((a, b) => (userScores[a.id] || 0) - (userScores[b.id] || 0));
        showCard();
    });

function showCard() {
    const cardEl = document.getElementById('card');
    cardEl.style.transform = '';
    cardEl.classList.remove('flipped');

    if (currentIndex >= deck.length) {
        document.getElementById('question-text').innerText = "Session Complete!";
        document.getElementById('answer-text').innerText = "You've reviewed all cards.";
        return;
    }
    const card = deck[currentIndex];
    document.getElementById('subject-title').innerText = card.subject;
    document.getElementById('progress').innerText = `Card ${currentIndex + 1} of ${deck.length}`;
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

// Fixed Touch Swiping & Tapping Logic
const card = document.getElementById('card');
let startX = 0;
let currentX = 0;
let isDragging = false;
let hasMoved = false;

card.addEventListener('touchstart', (e) => {
    startX = e.touches[0].clientX;
    currentX = startX;
    isDragging = true;
    hasMoved = false;
});

card.addEventListener('touchmove', (e) => {
    if (!isDragging) return;
    currentX = e.touches[0].clientX;
    let diffX = currentX - startX;
    if (Math.abs(diffX) > 10) {
        hasMoved = true;
        card.style.transform = `translateX(${diffX}px) rotate(${diffX / 20}deg)`;
    }
});

card.addEventListener('touchend', () => {
    if (!isDragging) return;
    isDragging = false;
    let diffX = currentX - startX;

    if (hasMoved && diffX > 100) {
        handleSwipe(true); // Swipe Right -> Mastered
    } else if (hasMoved && diffX < -100) {
        handleSwipe(false); // Swipe Left -> Practice
    } else if (!hasMoved) {
        card.classList.toggle('flipped'); // Clean Tap to Flip
        card.style.transform = '';
    } else {
        card.style.transform = '';
    }
    startX = 0;
    currentX = 0;
});

function handleSwipe(mastered) {
    if (currentIndex >= deck.length) return;
    const activeCard = deck[currentIndex];
    let score = userScores[activeCard.id] || 0;

    if (mastered) {
        userScores[activeCard.id] = score + 1;
    } else {
        userScores[activeCard.id] = 0;
        deck.push(activeCard);
    }

    localStorage.setItem('ap_mastery', JSON.stringify(userScores));
    currentIndex++;
    showCard();
}

// Modal Handlers
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
    deck.push(newCard);
    closeModal();
    showCard();
}