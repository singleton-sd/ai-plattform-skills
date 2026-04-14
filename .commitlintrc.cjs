const { execSync } = require('child_process');

const getGitBranch = async () => {
  try {
    const branchName = await execSync('git symbolic-ref --short HEAD').toString().trim();
    return branchName;
  } catch (error) {
    console.error(error);
    process.exit(1);
  }
};

const getTicketNumberFromBranch = (branchName) => {
  const ticketNumberRegex = /feature\/(\w+-\d{1,5})/;
  const match = branchName.match(ticketNumberRegex);
  return match ? match[1] : null;
};

const getTicketNumberFromCommit = (commitMessage) => {
  const ticketNumberRegex = /:\s*([A-Z]{1,5}-\d{1,5})/;
  const match = commitMessage.match(ticketNumberRegex);
  return match ? match[1] : null;
};

module.exports = {
  extends: ['@commitlint/config-conventional'],
  plugins: [
    {
      rules: {
        'ticket-number': async ({ header }) => {
          if (header.includes('Release')) {
            console.info('Skipping ticket number as this is a release commit');
            return [true];
          }
          const branchName = (await getGitBranch()) || '';
          const ticketNumberFromBranch = getTicketNumberFromBranch(branchName);
          const ticketNumberFromCommit = getTicketNumberFromCommit(header);

          if (ticketNumberFromCommit) {
            if (ticketNumberFromBranch && ticketNumberFromCommit !== ticketNumberFromBranch) {
              return [
                false,
                `The ticket number in the commit message (${ticketNumberFromCommit}) does not match the ticket number in the branch name (${ticketNumberFromBranch}). Please update either the commit message or the branch name to match.`,
              ];
            }
            return [true];
          }

          if (ticketNumberFromBranch) {
            return [true];
          }

          return [
            false,
            'Commit message does not include a ticket number, and no ticket number was found in the branch name. Please provide a valid ticket number in the commit message or update the branch name.',
          ];
        },
      },
    },
  ],
  rules: {
    'ticket-number': [2, 'always'],
    'body-leading-blank': [2, 'always'],
    'body-max-line-length': [2, 'always', 72],
    'subject-max-length': [2, 'always', 50],
    'subject-case': [2, 'always', 'sentence-case'],
    'subject-full-stop': [2, 'never'],
  },
};
