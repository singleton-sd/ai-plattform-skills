import { readFileSync } from 'fs';
import { resolve } from 'path';

const headContent = readFileSync(resolve('.git', 'HEAD'), 'utf-8').trim();
const branchMatch = headContent.match(/^ref: refs\/heads\/(.+)$/);

if (!branchMatch) {
  console.error('Error: Unable to determine the current branch.');
  process.exit(1);
}

const branch = branchMatch[1];

const valid =
  ['master', 'main', 'develop', 'design'].includes(branch) ||
  /^release\/v\d+\.\d+\.\d+$/.test(branch) ||
  /^(feature|hotfix)\/(\w+-\d{1,5})(-\w+)*$/.test(branch);

if (!valid) {
  console.error(
    `Error: Branch name must be one of: main, master, develop, design, ` +
    `feature/{TICKET}, hotfix/{TICKET}, or release/vX.Y.Z`
  );
  process.exit(1);
}

console.log(`✅ Branch name validation passed for: '${branch}'.`);
