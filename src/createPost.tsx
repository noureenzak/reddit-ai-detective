import { Devvit } from '@devvit/public-api';

Devvit.addMenuItem({
  label: 'Create New Mystery Post',
  location: 'subreddit',
  onPress: async (_event, context) => {
    const { reddit, ui } = context;
    const subreddit = await reddit.getCurrentSubreddit();
    const post = await reddit.submitPost({
      title: 'Daily Mystery Challenge 🕵️‍♂️',
      subredditName: subreddit.name,
      preview: (
        <vstack height="100%" width="100%" alignment="middle center">
          <text size="large">Loading today's mystery...</text>
        </vstack>
      ),
    });
    ui.showToast({ text: 'Mystery post created!' });
    ui.navigateTo(post);
  },
});

export default Devvit;