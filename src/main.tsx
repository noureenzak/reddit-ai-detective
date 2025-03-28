// src\main.tsx
import { Devvit, useState, useWebView } from '@devvit/public-api';
import './createPost';
import type { DevvitMessage, WebViewMessage } from './message.js';

// Fix for JSON import in NodeNext module system
import mysteriesData from './mysteries.json' with { type: 'json' };
const mysteries: Array<{
  id: number;
  question: string;
  answer: string;
  hints: string[];
}> = mysteriesData;

Devvit.configure({
  redditAPI: true,
  redis: true,
});

// Helper to get today's mystery
function getTodaysMystery(): {
  question: string;
  answer: string;
  hints: string[];
} {
  const dayOfYear = Math.floor(
    (Date.now() - new Date(new Date().getFullYear(), 0, 0).getTime()) / 
    (1000 * 60 * 60 * 24)
  );
  return mysteries[dayOfYear % mysteries.length];
}

Devvit.addCustomPostType({
  name: 'Mystery Solver Game',
  height: 'tall',
  render: (context) => {
    const [username] = useState(async () => {
      return (await context.reddit.getCurrentUsername()) ?? 'anon';
    });

    const [currentMystery] = useState(async () => {
      const today = new Date().toDateString();
      const storedMystery = await context.redis.get(`mystery_${context.postId}`);
      
      if (storedMystery) {
        const parsed = JSON.parse(storedMystery);
        if (parsed.date === today) return parsed;
      }
      
      const todaysMystery = { ...getTodaysMystery(), date: today };
      await context.redis.set(
        `mystery_${context.postId}`, 
        JSON.stringify(todaysMystery)
      );
      return todaysMystery;
    });

    const [leaderboard, setLeaderboard] = useState(async () => {
      const board = await context.redis.get(`leaderboard_${context.postId}`);
      return board ? JSON.parse(board) : [];
    });

    const [hintIndex, setHintIndex] = useState(0);

    const webView = useWebView<WebViewMessage, DevvitMessage>({
      url: 'page.html',

      async onMessage(message, webView) {
        const mystery = await currentMystery;
        const currentUsername = await username;
        const currentLeaderboard = await leaderboard;

        switch (message.type) {
          case 'webViewReady':
            webView.postMessage({
              type: 'initialData',
              data: {
                username: currentUsername,
                currentMystery: mystery,
                leaderboard: currentLeaderboard,
              },
            });
            break;

          case 'requestHint':
            const currentHintIndex = Math.min(hintIndex + 1, mystery.hints.length);
            setHintIndex(currentHintIndex);
            
            webView.postMessage({
              type: 'hintProvided',
              data: {
                hint: mystery.hints[currentHintIndex - 1],
                hintNumber: currentHintIndex,
                totalHints: mystery.hints.length
              }
            });
            break;

          case 'submitAnswer':
            const isCorrect = message.data.answer.toLowerCase() === mystery.answer.toLowerCase();
            
            if (isCorrect) {
              // Check if user already exists in leaderboard
              const existingUserIndex = currentLeaderboard.findIndex(
                entry => entry.username === currentUsername
              );

              let updatedLeaderboard;
              if (existingUserIndex >= 0) {
                // Update existing entry if better score
                const existingEntry = currentLeaderboard[existingUserIndex];
                if (message.data.attempts < existingEntry.attempts) {
                  updatedLeaderboard = [...currentLeaderboard];
                  updatedLeaderboard[existingUserIndex] = {
                    username: currentUsername,
                    attempts: message.data.attempts,
                    hintsUsed: message.data.hintsUsed,
                    time: Date.now()
                  };
                } else {
                  // Keep existing better score
                  updatedLeaderboard = currentLeaderboard;
                }
              } else {
                // Add new entry
                const newEntry = {
                  username: currentUsername,
                  attempts: message.data.attempts,
                  hintsUsed: message.data.hintsUsed,
                  time: Date.now()
                };
                updatedLeaderboard = [...currentLeaderboard, newEntry];
              }

              // Sort and limit to top 10
              updatedLeaderboard = updatedLeaderboard
                .sort((a, b) => a.attempts - b.attempts || (a.hintsUsed || 0) - (b.hintsUsed || 0))
                .slice(0, 10);
              
              await context.redis.set(
                `leaderboard_${context.postId}`,
                JSON.stringify(updatedLeaderboard)
              );
              setLeaderboard(updatedLeaderboard);
              
              webView.postMessage({
                type: 'answerResult',
                data: {
                  correct: true,
                  leaderboard: updatedLeaderboard
                }
              });
            } else {
              webView.postMessage({
                type: 'answerResult',
                data: {
                  correct: false,
                  leaderboard: currentLeaderboard
                }
              });
            }
            break;

          default:
            throw new Error(`Unknown message type: ${(message as any).type}`);
        }
      },
      onUnmount() {
        context.ui.showToast('See you next time, detective!');
      },
    });

    return (
      <vstack grow padding="medium" backgroundColor="#1c1f33">
        <vstack 
          cornerRadius="medium" 
          backgroundColor="#2b0906" 
          padding="large" 
          gap="large"
          border="thick"
          borderColor="#8b0000"
        >
          <text 
            size="xxlarge" 
            weight="bold" 
            color="#fef8dc"
          >
            🕵️‍♂️ One Word Mystery Challenge
          </text>
          
          <text 
            size="medium" 
            color="#fef8dc" 
            style="body"
          >
            Can you solve today's enigma?
          </text>
          
          <spacer size="large"/>
          
          <vstack 
            backgroundColor="#1c1f33" 
            padding="large" 
            cornerRadius="medium"
            border="thin"
            borderColor="#8b0000"
            gap="medium"
          >
            <text size="medium" color="#fef8dc">
              Welcome, {username ?? 'Detective'}!
            </text>
            
            <text size="small" color="#fef8dc">
              Today's mystery awaits your brilliant mind
            </text>
          </vstack>
          
          <spacer grow/>
          
          <button 
            onPress={() => webView.mount()}
            appearance="primary"
          >
            Begin Investigation
          </button>
          
          <text size="xsmall" color="#fef8dc">
            New mystery posted daily at midnight
          </text>
        </vstack>
      </vstack>
    );
  },
});

export default Devvit;