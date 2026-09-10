let deck = [];
let currentIndex = 0;
let userScores = JSON.parse(localStorage.getItem('ap_mastery')) || {};

// Fetch shared deck file
fetch('deck.json')
    .then(res => res.json())
    .then(data => {
        deck = data;
        // Sort lowest mastery scores to the front
        deck.sort((a, b) => (userScores[a.id] || 0) - (userScores[b.id] || 0));
        showCard();
    });

function showCard() {
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
    
    document.getElementById('card').classList.remove('flipped');
}

// Tap card to flip
document.getElementById('card').addEventListener('click', () => {
    document.getElementById('card').classList.toggle('flipped');
});

// Leitner score processing
function handleSwipe(mastered) {
    const card = deck[currentIndex];
    let score = userScores[card.id] || 0;

    if (mastered) {
        userScores[card.id] = score + 1; // Increase score -> Shows less often next time
    } else {
        userScores[card.id] = 0; // Reset score -> Re-queues card
        deck.push(card); // Re-insert into active session
    }

    localStorage.setItem('ap_mastery', JSON.stringify(userScores));
    currentIndex++;
    showCard();
}