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
    cardEl.style.transition = 'none';
    cardEl.style.transform = '';
    cardEl.classList.remove('flipped', 'swiping-left', 'swiping-right');
    
    // Reset buckets
    document.getElementById('bucket-left').classList.remove('active');
    document.getElementById('bucket-right').classList.remove('active');

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

// Fixed Gesture Handling (Tap vs. Swipe)
const card = document.getElementById('card');
const bucketLeft = document.getElementById('bucket-left');
const bucketRight = document.getElementById('bucket-right');

let startX = 0;
let currentX = 0;
let isDragging = false;
let isSwipeGesture = false;

card.addEventListener('touchstart', (e) => {
    startX = e.touches[0].clientX;
    currentX = startX;
    isDragging = true;
    isSwipeGesture = false;
    card.style.transition = 'none';
});

card.addEventListener('touchmove', (e) => {
    if (!isDragging) return;
    currentX = e.touches[0].clientX;
    let diffX = currentX - startX;

    // Trigger drag mode only after passing 10px threshold
    if (Math.abs(diffX) > 10) {
        isSwipeGesture = true;
        card.style.transform = `translateX(${diffX}px) rotate(${diffX / 15}deg)`;

        // Tint and light up bucket based on direction
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

    if (isSwipeGesture && diffX < -100) {
        // Deposited into "Need Practice"
        animateDeposit('left', false);
    } else if (isSwipeGesture && diffX > 100) {
        // Deposited into "Mastered"
        animateDeposit('right', true);
    } else if (!isSwipeGesture) {
        // Instant Tap to Flip
        card.style.transition = 'transform 0.3s ease';
        card.classList.toggle('flipped');
        resetDragState();
    } else {
        // Snap back if threshold not met
        card.style.transition = 'all 0.3s ease';
        card.style.transform = '';
        resetDragState();
    }
});

// Desktop Mouse Support
card.addEventListener('click', () => {
    if (!isSwipeGesture) {
        card.style.transition = 'transform 0.3s ease';
        card.classList.toggle('flipped');
    }
});

function resetDragState() {
    card.classList.remove('swiping-left', 'swiping-right');
    bucketLeft.classList.remove('active');
    bucketRight.classList.remove('active');
}

function animateDeposit(direction, mastered) {
    card.style.transition = 'all 0.3s ease';
    let targetX = direction === 'left' ? -400 : 400;
    card.style.transform = `translateX(${targetX}px) translateY(100px) scale(0.5) rotate(${targetX / 10}deg)`;
    card.style.opacity = '0';

    setTimeout(() => {
        handleSwipe(mastered);
        card.style.opacity = '1';
    }, 300);
}

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