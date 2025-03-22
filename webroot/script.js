/**
 * Main App class for the Daily Mystery Challenge
 */
class App {
  constructor() {
    // DOM element references
    this.mysteryQuestion = document.getElementById('mystery-question');
    this.clockElement = document.getElementById('clock');
    this.answerInput = document.getElementById('answer-input');
    this.submitButton = document.getElementById('submit-answer');
    this.resultMessage = document.getElementById('result-message');
    this.leaderboardList = document.getElementById('leaderboard-list');
    
    // Game state
    this.attempts = 1;
    this.currentMystery = null;
    this.leaderboard = [];
    this.isTestMode = window.location.hostname === 'localhost';

    // Event listeners
    addEventListener('message', this.#onMessage);
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

    // Start clock updates
    this.updateClock();
    setInterval(() => this.updateClock(), 1000);
  }

  /**
   * Initialize test data for local development
   */
  initializeTestData() {
    this.currentMystery = {
      question: "I speak without a mouth and hear without ears. I have no body, but I come alive with wind. What am I?",
      answer: "echo"
    };
    
    this.leaderboard = [
      { username: "Sherlock", attempts: 1 },
      { username: "Watson", attempts: 2 },
      { username: "Poirot", attempts: 3 }
    ];
    
    this.mysteryQuestion.innerText = this.currentMystery.question;
    this.updateLeaderboard(this.leaderboard);
  }

  /**
   * Handle answer submission
   */
  handleSubmit() {
    const answer = this.answerInput.value.trim();
    if (!answer) {
      this.showMessage('Please enter an answer!', 'error');
      return;
    }

    console.log('Submitting answer:', answer);
    
    if (this.isTestMode) {
      this.handleTestSubmission(answer);
    } else {
      postWebViewMessage({
        type: 'submitAnswer',
        data: { 
          answer, 
          attempts: this.attempts, 
          timestamp: Date.now() 
        }
      });
    }
    
    // Clear input after submission
    this.answerInput.value = '';
  }

  /**
   * Handle message events from Reddit/test environment
   */
  #onMessage = (ev) => {
    if (ev.data.type !== 'devvit-message') return;
    const { message } = ev.data.data;
    console.log('Received message:', message);

    if (this.isTestMode) {
      return; // Messages handled by handleTestSubmission in test mode
    }

    switch (message.type) {
      case 'initialData':
        this.mysteryQuestion.innerText = message.data.currentMystery.question;
        this.updateLeaderboard(message.data.leaderboard);
        break;
      case 'answerResult':
        this.handleAnswerResult(message.data);
        break;
      default:
        console.log('Unknown message type:', message.type);
        break;
    }
  };

  /**
   * Handle test mode answer submission
   */
  handleTestSubmission(answer) {
    const isCorrect = answer.toLowerCase() === this.currentMystery.answer;
    
    if (isCorrect) {
      const newEntry = {
        username: `Detective${Math.floor(Math.random() * 1000)}`,
        attempts: this.attempts
      };
      
      this.leaderboard.push(newEntry);
      this.leaderboard.sort((a, b) => a.attempts - b.attempts);
      this.leaderboard = this.leaderboard.slice(0, 10); // Keep top 10
      
      this.showMessage('Brilliant deduction! 🎉', 'success');
      this.updateLeaderboard(this.leaderboard);
    } else {
      this.attempts++;
      this.showMessage(`Incorrect. Attempts: ${this.attempts}`, 'error');
    }
  }

  /**
   * Handle answer result from server
   */
  handleAnswerResult(data) {
    if (data.correct) {
      this.showMessage('Brilliant deduction! 🎉', 'success');
      this.updateLeaderboard(data.leaderboard);
    } else {
      this.attempts++;
      this.showMessage(`Incorrect. Attempts: ${this.attempts}`, 'error');
    }
  }

  /**
   * Display message to user
   */
  showMessage(text, type = 'info') {
    this.resultMessage.innerText = text;
    this.resultMessage.className = `message ${type}`;
    
    // Clear message after 3 seconds
    setTimeout(() => {
      this.resultMessage.innerText = '';
      this.resultMessage.className = '';
    }, 3000);
  }

  /**
   * Update countdown clock
   */
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
  

  /**
   * Update leaderboard display
   */
  updateLeaderboard(leaderboard) {
    this.leaderboardList.innerHTML = leaderboard
      .map((entry, index) => `
        <li class="leaderboard-entry">
          <span class="rank">#${index + 1}</span>
          <span class="username">${entry.username}</span>
          <span class="attempts">${entry.attempts} ${entry.attempts === 1 ? 'attempt' : 'attempts'}</span>
        </li>
      `)
      .join('');
  }
}

/**
 * Post message to Reddit webview
 */
function postWebViewMessage(msg) {
  console.log('Sending message:', msg);
  parent.postMessage(msg, '*');
}

// Initialize the app
new App();