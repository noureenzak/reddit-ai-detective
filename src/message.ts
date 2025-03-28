export type DevvitMessage =
  | { 
      type: 'initialData'; 
      data: { 
        username: string;
        currentMystery: { 
          question: string; 
          answer: string;
          hints: string[];
        };
        leaderboard: Array<{ 
          username: string; 
          attempts: number; 
          hintsUsed?: number;
          time?: number 
        }>;
      }
    }
  | { 
      type: 'answerResult'; 
      data: { 
        correct: boolean;
        leaderboard: Array<{ 
          username: string; 
          attempts: number; 
          hintsUsed?: number;
          time?: number 
        }>;
      }
    }
  | {
      type: 'hintProvided';
      data: {
        hint: string;
        hintNumber: number;
        totalHints: number;
      }
    };

export type WebViewMessage =
  | { type: 'webViewReady' }
  | { type: 'requestHint' }
  | { 
      type: 'submitAnswer'; 
      data: { 
        answer: string; 
        attempts: number; 
        hintsUsed: number;
        timestamp: number 
      }
    };