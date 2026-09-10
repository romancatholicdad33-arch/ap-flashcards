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
    cardEl.style.opacity = '1';
    cardEl.classList.remove('flipped', 'swiping-left', 'swiping-right');
    
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

    // Tap Detection: Minimal drag distance + short duration
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
    
    // Animate card dropping into the bottom bucket
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