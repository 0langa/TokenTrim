export const SAMPLE_INPUTS: Array<{ id: string; label: string; text: string }> = [
  {
    id: 'prompt-brief',
    label: 'Prompt Brief',
    text: `Please note that it is important to mention this project should be implemented in order to improve reliability. In general, I think the implementation should include clear requirements, detailed documentation, and a response format that is easy to parse.`,
  },
  {
    id: 'readme-section',
    label: 'README Section',
    text: `# Setup\n\nIn order to run the repository locally, you should first install dependencies and then start the development server. It should be noted that this command may take a while on first run.\n\n\`npm install\`\n\`npm run dev\``,
  },
  {
    id: 'meeting-notes',
    label: 'Meeting Notes',
    text: `Generally speaking, I believe we should prioritize the API migration before the dashboard polish. Alice will own the migration by 2026-06-01, and Bob will validate latency under 120ms. Please note this depends on auth configuration updates.`,
  },
];
