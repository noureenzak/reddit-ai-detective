class App {
  constructor() {
    this.mysteryQuestion = document.getElementById('mystery-question');
    this.clockElement = document.getElementById('clock');
    this.answerInput = document.getElementById('answer-input');
    this.submitButton = document.getElementById('submit-answer');
    this.resultMessage = document.getElementById('result-message');
    this.leaderboardList = document.getElementById('leaderboard-list');
    this.attempts = 1;

    addEventListener('message', this.#onMessage);
    addEventListener('load', () => {
      postWebViewMessage({ type: 'webViewReady' });
    });

    this.submitButton.addEventListener('click', () => {
      const answer = this.answerInput.value.trim();
      if (answer) {
        console.log('Submitting answer:', answer); // Debugging
        postWebViewMessage({
          type: 'submitAnswer',
          data: { answer, attempts: this.attempts, timestamp: Date.now() },
        });
      } else {
        console.log('Answer is empty'); // Debugging
      }
    });

    this.updateClock();
    setInterval(() => this.updateClock(), 1000);
  }

  #onMessage = (ev) => {
    if (ev.data.type !== 'devvit-message') return;
    const { message } = ev.data.data;
    console.log('Received message:', message); // Debugging

    switch (message.type) {
      case 'initialData':
        this.mysteryQuestion.innerText = message.data.currentMystery.question;
        this.updateLeaderboard(message.data.leaderboard);
        break;
      case 'answerResult':
        if (message.data.correct) {
          this.resultMessage.innerText = 'Correct! 🎉';
          this.updateLeaderboard(message.data.leaderboard);
        } else {
          this.attempts++;
          this.resultMessage.innerText = `Incorrect. Attempts: ${this.attempts}`;
        }
        break;
      default:
        break;
    }
  };

  updateClock() {
    const now = new Date();
    const hours = 24 - now.getHours();
    const minutes = 60 - now.getMinutes();
    const seconds = 60 - now.getSeconds();
    this.clockElement.innerText = `Time left: ${hours}h ${minutes}m ${seconds}s`;
  }

  updateLeaderboard(leaderboard) {
    this.leaderboardList.innerHTML = leaderboard
      .map((entry) => `<li>${entry.username} - ${entry.attempts} attempts</li>`)
      .join('');
  }
}

function postWebViewMessage(msg) {
  console.log('Sending message:', msg); // Debugging
  parent.postMessage(msg, '*');
}

new App();