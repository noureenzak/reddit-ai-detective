import { Devvit, useState, useWebView } from '@devvit/public-api';
import type { DevvitMessage, WebViewMessage } from './message.js';
import mysteries from './mysteries.json';

Devvit.configure({
  redditAPI: true,
  redis: true,
});

Devvit.addCustomPostType({
  name: 'Daily Mystery Challenge',
  height: 'tall',
  render: (context) => {
    const [username] = useState(async () => {
      return (await context.reddit.getCurrentUsername()) ?? 'anon';
    });

    const [currentMystery, setCurrentMystery] = useState(async () => {
      const lastMysteryId = await context.redis.get('lastMysteryId');
      const mystery = mysteries.find((m) => m.id === Number(lastMysteryId)) || mysteries[0];
      return mystery;
    });

    const [leaderboard, setLeaderboard] = useState(async () => {
      const leaderboardData = await context.redis.get('leaderboard');
      return leaderboardData ? JSON.parse(leaderboardData) : [];
    });

    const webView = useWebView<WebViewMessage, DevvitMessage>({
      url: 'page.html',
      async onMessage(message, webView) {
        console.log('Received message in Devvit:', message); // Debugging
        switch (message.type) {
          case 'webViewReady':
            webView.postMessage({
              type: 'initialData',
              data: {
                username: username,
                currentMystery: currentMystery,
                leaderboard: leaderboard,
              },
            });
            break;
          case 'submitAnswer':
            const { answer, timestamp } = message.data;
            const isCorrect = validateAnswer(answer, currentMystery.answer);
            if (isCorrect) {
              const userEntry = {
                username: username,
                attempts: message.data.attempts,
                timestamp: timestamp,
              };
              const updatedLeaderboard = updateLeaderboard(leaderboard, userEntry);
              await context.redis.set('leaderboard', JSON.stringify(updatedLeaderboard));
              setLeaderboard(updatedLeaderboard);
              webView.postMessage({
                type: 'answerResult',
                data: { correct: true, leaderboard: updatedLeaderboard },
              });
            } else {
              webView.postMessage({
                type: 'answerResult',
                data: { correct: false, attempts: message.data.attempts + 1 },
              });
            }
            break;
          default:
            throw new Error(`Unknown message type: ${message satisfies never}`);
        }
      },
      onUnmount() {
        context.ui.showToast('Web view closed!');
      },
    });

    return (
      <vstack grow padding="small">
        <vstack grow alignment="middle center">
          <text size="xlarge" weight="bold" color="#FFA500">
            Daily Mystery Challenge 🕵️‍♂️
          </text>
          <spacer />
          <button onPress={() => webView.mount()}>Solve the Mystery!</button>
        </vstack>
      </vstack>
    );
  },
});

function validateAnswer(userAnswer: string, correctAnswer: string): boolean {
  const userWords = userAnswer.toLowerCase().split(' ');
  const correctWords = correctAnswer.toLowerCase().split(' ');
  const matchPercentage =
    userWords.filter((word) => correctWords.includes(word)).length / correctWords.length;
  return matchPercentage >= 0.8; // 80% match
}

function updateLeaderboard(leaderboard: any[], userEntry: any): any[] {
  const existingEntry = leaderboard.find((entry) => entry.username === userEntry.username);
  if (existingEntry) {
    if (userEntry.attempts < existingEntry.attempts || (userEntry.attempts === existingEntry.attempts && userEntry.timestamp < existingEntry.timestamp)) {
      Object.assign(existingEntry, userEntry);
    }
  } else {
    leaderboard.push(userEntry);
  }
  leaderboard.sort((a, b) => a.attempts - b.attempts || a.timestamp - b.timestamp);
  return leaderboard.slice(0, 10); // Keep top 10
}

export default Devvit;