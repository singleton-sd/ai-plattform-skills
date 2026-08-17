import { execSync } from 'child_process';

const branch = execSync('git rev-parse --abbrev-ref HEAD', {
  encoding: 'utf8',
}).trim();

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
