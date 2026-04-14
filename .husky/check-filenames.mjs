import { execSync } from 'child_process';

// Allows: kebab-case.ts, kebab-case.spec.ts, PascalCase.ts, PascalCase.d.ts, etc.
const allowed = /^([a-z0-9-]+|[A-Z][a-zA-Z0-9]+)(\.spec|\.test)?(\.d)?(\.defs)?\.tsx?$/;

const staged = execSync('git diff --cached --name-only --diff-filter=ACM', { encoding: 'utf-8' })
  .split('\n')
  .filter((f) => f.endsWith('.ts') || f.endsWith('.tsx'));

const invalid = staged.filter((f) => {
  const name = f.split('/').pop();
  return name && !allowed.test(name.trim());
});

if (invalid.length > 0) {
  console.error(
    `❌ Files do not match naming convention (kebab-case.ts or PascalCase.ts):\n${invalid.join('\n')}`
  );
  process.exit(1);
}

console.log('✅ All staged files follow the naming convention.');
