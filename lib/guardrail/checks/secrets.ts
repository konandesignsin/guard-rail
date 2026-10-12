import type { CheckName, FileInput, Finding } from '../types.js';

const CHECK: CheckName = 'secrets';

const HARDCODED_PATTERNS = [
  { pattern: /\bsk-[A-Za-z0-9]{20,}/g, name: 'OpenAI API key' },
  { pattern: /\bsk_live_[A-Za-z0-9]{20,}/g, name: 'Stripe secret key' },
  { pattern: /\bAKIA[0-9A-Z]{16}\b/g, name: 'AWS access key' },
  { pattern: /\bAIza[0-9A-Za-z_-]{35}/g, name: 'Google API key' },
  { pattern: /\bghp_[A-Za-z0-9]{36}/g, name: 'GitHub personal access token' },
  { pattern: /api_key\s*[:=]\s*['"][^'"]{8,}['"]/gi, name: 'Generic API key' },
];

const SERVICE_ROLE_JWT = /eyJ[A-Za-z0-9_-]*\.eyJ[A-Za-z0-9_-]*\.[A-Za-z0-9_-]*/g;

function maskSecret(value: string): string {
  if (value.length <= 4) return '****';
  return value.slice(0, 4) + '****';
}

function extractMatch(line: string, pattern: RegExp): string | null {
  const match = line.match(pattern);
  return match ? match[0] : null;
}

function tryDecodeJwt(token: string): string {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) return '';
    const payload = parts[1].replace(/-/g, '+').replace(/_/g, '/');
    return atob(payload);
  } catch {
    return '';
  }
}

export function secretsCheck(files: FileInput[]): Finding[] {
  const findings: Finding[] = [];

  const envFile = files.find((f) => f.path === '.env');
  const hasEnv = !!envFile;
  const hasEnvExample = files.some((f) => f.path === '.env.example');
  const gitignoreFile = files.find((f) => f.path === '.gitignore');
  const gitignoreContent = gitignoreFile?.content || '';

  if (hasEnv && !gitignoreContent.includes('.env')) {
    findings.push({
      severity: 'high',
      check: CHECK,
      file: '.env',
      line: 1,
      title: '.env file is not in .gitignore',
      explanation:
        'Your .env file has secrets in it, and it could get uploaded to GitHub where anyone can see it — even if your repo is private today, it might not be tomorrow.',
      fix: 'Add ".env" to your .gitignore file so it never gets committed.',
    });
  }

  if (hasEnv && !hasEnvExample) {
    findings.push({
      severity: 'low',
      check: CHECK,
      file: '.env',
      line: 1,
      title: '.env exists but .env.example is missing',
      explanation:
        'Other developers (or you on another machine) won\'t know what environment variables are needed. An example file documents the required config without exposing real values.',
      fix: 'Create a .env.example file with placeholder values (e.g., API_KEY=your_key_here) and commit it to git.',
    });
  }

  for (const file of files) {
    if (file.path === '.gitignore') continue;
    const lines = file.content.split('\n');

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];

      if (SERVICE_ROLE_JWT.test(line)) {
        const match = extractMatch(line, SERVICE_ROLE_JWT);
        const decoded = match ? tryDecodeJwt(match) : '';
        if (decoded && decoded.includes('service_role')) {
          findings.push({
            severity: 'high',
            check: CHECK,
            file: file.path,
            line: i + 1,
            title: `Supabase service_role key found: ${maskSecret(match || '')}`,
            explanation:
              'The service_role key bypasses all database security. If it ends up in code that runs in a browser, anyone can extract it and read, modify, or delete all your data.',
            fix: 'Use the anon key in client code. Only use service_role in secure server-side environments (Node.js backend, Edge Functions with care).',
          });
        }
      }

      for (const { pattern, name } of HARDCODED_PATTERNS) {
        pattern.lastIndex = 0;
        if (pattern.test(line)) {
          const match = extractMatch(line, pattern);
          findings.push({
            severity: 'high',
            check: CHECK,
            file: file.path,
            line: i + 1,
            title: `${name} hardcoded: ${maskSecret(match || '')}`,
            explanation:
              'Hardcoded secrets in source code get committed to git. Anyone with access (including leaked repos) can use your API keys, potentially costing you money or exposing data.',
            fix: 'Move the secret to a .env file and load it with import.meta.env.VITE_KEY_NAME (Vite) or process.env.KEY_NAME (Node).',
          });
        }
      }

      const publicEnvMatch = line.match(/\b((?:VITE_|NEXT_PUBLIC_)[A-Z_]+)\s*[:=]\s*['"]([^'"]{8,})['"]/);
      if (publicEnvMatch) {
        const varName = publicEnvMatch[1];
        const varValue = publicEnvMatch[2];

        if (/^https?:\/\//.test(varValue)) continue;
        if (/^[a-z]+\.(supabase\.co|supabase\.in|supabase\.com)/i.test(varValue)) continue;

        const jwtMatch = varValue.match(/^eyJ[A-Za-z0-9_-]*\.eyJ[A-Za-z0-9_-]*\.[A-Za-z0-9_-]*$/);
        if (jwtMatch) {
          const decoded = tryDecodeJwt(jwtMatch[0]);
          if (decoded && decoded.includes('service_role')) {
            findings.push({
              severity: 'high',
              check: CHECK,
              file: file.path,
              line: i + 1,
              title: `service_role key in public env variable: ${varName}`,
              explanation:
                'The service_role key bypasses all database security. VITE_ and NEXT_PUBLIC_ variables are baked into your website\'s JavaScript — anyone can grab this key from your site.',
              fix: `Use the anon key in ${varName}. Only use service_role in secure server-side environments.`,
            });
          }
          continue;
        }

        const suspiciousPatterns = /service[_-]?role|sk-|sk_live_|AKIA|ghp_|private.?key|secret|password/i;
        if (suspiciousPatterns.test(varName) || suspiciousPatterns.test(varValue)) {
          findings.push({
            severity: 'high',
            check: CHECK,
            file: file.path,
            line: i + 1,
            title: `Secret in public env variable: ${varName} = ${maskSecret(varValue)}`,
            explanation:
              'VITE_ and NEXT_PUBLIC_ variables are baked into your website\'s JavaScript. Anyone can view them by right-clicking and choosing "Inspect" — they\'re not hidden.',
            fix: 'Never put secrets in VITE_ or NEXT_PUBLIC_ variables. Use server-side environment variables or a backend API to handle sensitive operations.',
          });
        }
      }
    }
  }

  return findings;
}
