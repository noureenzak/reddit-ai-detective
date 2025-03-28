class App {
  constructor() {
    // DOM element references
    this.mysteryQuestion = document.getElementById('mystery-question');
    this.clockElement = document.getElementById('clock');
    this.answerInput = document.getElementById('answer-input');
    this.submitButton = document.getElementById('submit-answer');
    this.resultMessage = document.getElementById('result-message');
    this.leaderboardList = document.getElementById('leaderboard-list');
    this.hintButton = document.getElementById('hint-button');
    this.hintDisplay = document.getElementById('hint-display');
    
    // Game state
    this.attempts = 1;
    this.currentMystery = null;
    this.leaderboard = [];
    this.isTestMode = window.location.hostname === 'localhost';
    this.hintsUsed = 0;
    this.hasSolved = false; // Track if user has solved the mystery

    // Event listeners
    addEventListener('message', (ev) => this.#onMessage(ev));
    addEventListener('load', () => {
      postWebViewMessage({ type: 'webViewReady' });
    });

    // Initialize test mode if running locally
    if (this.isTestMode) {
      this.initializeTestData();
    }

    // Submit button handler
    this.submitButton.addEventListener('click', () => this.handleSubmit());
    
    // Enter key submission
    this.answerInput.addEventListener('keypress', (e) => {
      if (e.key === 'Enter') {
        this.handleSubmit();
      }
    });

    // Hint button handler
    this.hintButton.addEventListener('click', () => this.requestHint());

    // Start clock updates
    this.updateClock();
    setInterval(() => this.updateClock(), 1000);
  }

  initializeTestData() {
    this.currentMystery = {
      question: "I speak without a mouth and hear without ears. I have no body, but I come alive with wind. What am I?",
      answer: "echo",
      hints: [
        "I'm often heard in mountains and canyons",
        "I repeat what you say",
        "I'm a reflection of sound"
      ]
    };
    
    this.leaderboard = [
      { username: "Sherlock", attempts: 1, hintsUsed: 0 },
      { username: "Watson", attempts: 2, hintsUsed: 1 },
      { username: "Poirot", attempts: 3, hintsUsed: 2 }
    ];
    
    this.mysteryQuestion.innerText = this.currentMystery.question;
    this.updateLeaderboard(this.leaderboard);
  }

  handleSubmit() {
    if (this.hasSolved) {
      this.showMessage('You already solved today\'s mystery!', 'info');
      return;
    }

    const answer = this.answerInput.value.trim();
    if (!answer) {
      this.showMessage('Please enter an answer!', 'error');
      return;
    }

    if (this.isTestMode) {
      this.handleTestSubmission(answer);
    } else {
      postWebViewMessage({
        type: 'submitAnswer',
        data: { 
          answer, 
          attempts: this.attempts, 
          hintsUsed: this.hintsUsed,
          timestamp: Date.now()
        }
      });
    }
    
    this.answerInput.value = '';
  }

  requestHint() {
    if (this.hasSolved) {
      this.showMessage('You already solved the mystery!', 'info');
      return;
    }

    if (this.isTestMode) {
      if (!this.currentMystery?.hints || this.hintsUsed >= this.currentMystery.hints.length) return;
      
      this.hintsUsed++;
      this.hintDisplay.innerText = `Hint ${this.hintsUsed}/${this.currentMystery.hints.length}: ${this.currentMystery.hints[this.hintsUsed - 1]}`;
      this.hintDisplay.className = 'hint-message';
    } else {
      postWebViewMessage({ type: 'requestHint' });
    }
  }

  #onMessage = (ev) => {
    if (ev.data.type !== 'devvit-message') return;
    const { message } = ev.data.data;

    if (this.isTestMode) return;

    switch (message.type) {
      case 'initialData':
        this.currentMystery = message.data.currentMystery;
        this.leaderboard = message.data.leaderboard;
        this.mysteryQuestion.innerText = this.currentMystery.question;
        this.updateLeaderboard(this.leaderboard);
        break;
        
      case 'answerResult':
        this.handleAnswerResult(message.data);
        break;
        
      case 'hintProvided':
        this.hintsUsed = message.data.hintNumber;
        this.hintDisplay.innerText = `Hint ${message.data.hintNumber}/${message.data.totalHints}: ${message.data.hint}`;
        this.hintDisplay.className = 'hint-message';
        break;
    }
  };

  handleTestSubmission(answer) {
    const isCorrect = answer.toLowerCase() === this.currentMystery.answer.toLowerCase();
    
    if (isCorrect) {
      this.hasSolved = true;
      const username = `Detective${Math.floor(Math.random() * 1000)}`;
      
      // Check if user already exists
      const existingIndex = this.leaderboard.findIndex(entry => entry.username === username);
      
      if (existingIndex >= 0) {
        // Update if better score
        if (this.attempts < this.leaderboard[existingIndex].attempts) {
          this.leaderboard[existingIndex] = {
            username,
            attempts: this.attempts,
            hintsUsed: this.hintsUsed
          };
        }
      } else {
        // Add new entry
        this.leaderboard.push({
          username,
          attempts: this.attempts,
          hintsUsed: this.hintsUsed
        });
      }
      
      this.leaderboard.sort((a, b) => a.attempts - b.attempts || (a.hintsUsed || 0) - (b.hintsUsed || 0));
      this.leaderboard = this.leaderboard.slice(0, 10);
      
      this.showMessage('Brilliant deduction! 🎉', 'success');
      this.updateLeaderboard(this.leaderboard);
    } else {
      this.showMessage(`Incorrect. Attempts: ${this.attempts}`, 'error');
      this.attempts++;
    }
  }

  handleAnswerResult(data) {
    if (data.correct) {
      this.hasSolved = true;
      this.showMessage('Brilliant deduction! 🎉', 'success');
      this.updateLeaderboard(data.leaderboard);
    } else {
      this.showMessage(`Incorrect. Attempts: ${this.attempts}`, 'error');
      this.attempts++;
    }
  }

  showMessage(text, type = 'info') {
    this.resultMessage.innerText = text;
    this.resultMessage.className = `message ${type}`;
    
    setTimeout(() => {
      this.resultMessage.innerText = '';
      this.resultMessage.className = '';
    }, 3000);
  }

  updateClock() {
    const now = new Date();
    const midnight = new Date();
    midnight.setHours(24, 0, 0, 0);
  
    const diff = midnight - now;
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    const seconds = Math.floor((diff % (1000 * 60)) / 1000);
  
    document.getElementById('hours').innerHTML = `${hours.toString().padStart(2, '0')}<span>Hours</span>`;
    document.getElementById('minutes').innerHTML = `${minutes.toString().padStart(2, '0')}<span>Minutes</span>`;
    document.getElementById('seconds').innerHTML = `${seconds.toString().padStart(2, '0')}<span>Seconds</span>`;
  }
  
  updateLeaderboard(leaderboard) {
    this.leaderboardList.innerHTML = leaderboard
      .map((entry, index) => `
        <li class="leaderboard-entry">
          <span class="rank">#${index + 1}</span>
          <span class="username">${entry.username}</span>
          <span class="attempts">${entry.attempts} ${entry.attempts === 1 ? 'attempt' : 'attempts'}</span>
          ${entry.hintsUsed ? `<span class="hints">(${entry.hintsUsed} hint${entry.hintsUsed === 1 ? '' : 's'})</span>` : ''}
        </li>
      `)
      .join('');
  }
}

function postWebViewMessage(msg) {
  console.log('Sending message:', msg);
  parent.postMessage(msg, '*');
}

new App();