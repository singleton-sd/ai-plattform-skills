import { writeFileSync, readFileSync } from 'fs';
import { execSync } from 'child_process';

const commitMessageFilePath = process.argv[2];

const getGitBranch = () => {
  try {
    return execSync('git symbolic-ref --short HEAD').toString().trim();
  } catch {
    return null;
  }
};

const getTicketFromCommit = (msg) => {
  const match = msg.match(/:\s*([A-Z]{1,5}-\d{1,5})/);
  return match ? match[1] : null;
};

const getTicketFromBranch = (branch) => {
  const match = branch?.match(/(?:feature|hotfix)\/(\w+-\d{1,5})/);
  return match ? match[1] : null;
};

const commitMessage = readFileSync(commitMessageFilePath, 'utf-8');

if (commitMessage.includes('Release')) process.exit(0);

if (!getTicketFromCommit(commitMessage)) {
  const branch = getGitBranch();
  const ticket = getTicketFromBranch(branch);
  if (ticket) {
    const updated = commitMessage.replace(/^(.*?):\s*/, `$1: ${ticket} `);
    writeFileSync(commitMessageFilePath, updated, 'utf-8');
  }
}
