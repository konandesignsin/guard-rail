# Guardrail

Security and quality auditor for AI-built apps (Lovable, Bolt, Cursor) as a GitHub Action and an npm library.

![GitHub Actions status](https://img.shields.io/github/actions/workflow/status/konandesignsin/guardrail/guardrail.yml)
![License](https://img.shields.io/github/license/konandesignsin/guardrail)

## Why

AI-generated apps often ship with leaked API keys, missing Supabase Row Level Security, and dead code that never gets cleaned up. These issues slip through because developers trust the AI output without auditing it.

Guardrail catches them on every pull request, before they reach production.

## Quick start

Add this workflow to your repository:

```yaml
name: Security Audit
on: [pull_request]

jobs:
  audit:
    runs-on: ubuntu-latest
    permissions:
      contents: read
      pull-requests: write
    steps:
      - uses: actions/checkout@v4
      - uses: konandesignsin/guardrail@v1
        with:
          fail-on: high
```

Guardrail will audit your code on every PR and post a comment with findings.

## Use as a library

The scanner is also published to npm as `guardrail-scanner`, so you can run the same checks from your own tooling.

```bash
npm install guardrail-scanner
```

```ts
import { scan } from "guardrail-scanner";

const result = scan([
  { path: ".env.example", content: "VITE_API_URL=your_url_here\n" },
  { path: "src/App.tsx", content: 'const key = "sk-...";\n' },
]);

console.log(result.score); // 0-100
console.log(result.findings); // Finding[]
```

`scan()` is pure — it takes file contents in memory and returns a typed JSON result. No filesystem, network, or console access, so it runs anywhere Node 20+ runs, including a Next.js server route.

### Output format

```ts
interface ScanResult {
  score: number; // 100 - 15*high - 5*medium - 1*low, floored at 0
  findings: Finding[];
}

interface Finding {
  severity: "high" | "medium" | "low";
  check: "secrets" | "supabase" | "quality";
  title: string; // short summary of the issue
  explanation: string; // why it matters
  fix: string; // how to fix it
  file: string; // path relative to the scanned project
  line: number; // 1-based line number
}
```

## Inputs and outputs

**Inputs:**

| Input | Description | Default |
|-------|-------------|---------|
| `path` | Path to the project to audit | `.` |
| `fail-on` | Fail workflow on `high`, `medium`, or `none` | `high` |
| `comment` | Post/update PR comment with report | `true` |
| `github-token` | Token for PR comments | `${{ github.token }}` |
| `ignore` | Comma-separated glob patterns to skip | `test-fixtures/**,node_modules/**` |

**Outputs:**

| Output | Description |
|--------|-------------|
| `total-findings` | Total number of findings |
| `high-count` | Number of high severity findings |

## What it checks

### Secrets

| Check | Severity | Example |
|-------|----------|---------|
| Supabase service_role key in code | HIGH | JWT with `role=service_role` in client code |
| Hardcoded OpenAI key | HIGH | `sk-FAKEFAKEFAKE...` in source |
| Hardcoded Stripe key | HIGH | `sk_live_FAKEFAKE...` in source |
| Hardcoded AWS key | HIGH | `AKIAFAKEFAKE...` in source |
| Hardcoded Google API key | HIGH | `AIzaFAKEFAKE...` in source |
| Hardcoded GitHub token | HIGH | `ghp_FAKEFAKE...` in source |
| Generic API key pattern | HIGH | `api_key = 'secret...'` in code |
| Secret in VITE_ variable | HIGH | `VITE_API_KEY='secret...'` in .env |
| .env not in .gitignore | HIGH | .env file exists but not gitignored |
| .env.example missing | LOW | .env exists but no .env.example for documentation |

### Supabase

| Check | Severity | Example |
|-------|----------|---------|
| Table without RLS | HIGH | `CREATE TABLE users` without `ENABLE ROW LEVEL SECURITY` |
| Policy with USING (true) | HIGH | `USING (true)` allows all reads |
| Policy with WITH CHECK (true) | HIGH | `WITH CHECK (true)` allows all writes |
| RLS enabled but no policies | MEDIUM | Table has RLS but zero policies (no one can access) |
| delete()/update() without filter | HIGH | `.delete()` without `.eq()` affects all rows |
| service_role in client code | HIGH | `createClient(url, serviceRoleKey)` in browser code |
| Admin check in localStorage | HIGH | `isAdmin = localStorage.getItem('admin')` |
| Public storage bucket | MEDIUM | `INSERT INTO storage.buckets ... public = true` |

### Quality

| Check | Severity | Example |
|-------|----------|---------|
| Unused dependency | MEDIUM | `moment` in package.json but never imported |
| Duplicate dependency | MEDIUM | `typescript` in both dependencies and devDependencies |
| Heavy package | LOW | `moment` instead of `date-fns` (20x smaller) |
| console.log in source | LOW | `console.log('debug')` left in production code |
| TODO/FIXME comment | LOW | `// TODO: fix this` without ticket reference |
| Orphan file | LOW | File never imported by any other file |
| Large file (>500 lines) | LOW | File has 800 lines, hard to maintain |

## Run locally

```bash
npx tsx src/cli.ts <path-to-project>
```

Outputs a colored terminal report and writes `audit-report.md`.

## Example PR comment

```markdown
## guardrail

Found **3** issues across 12 files.

| Severity | Category | File | Issue |
|----------|----------|------|-------|
| 🔴 high | security | `.env:4` | OpenAI API key hardcoded: sk-F**** |
| 🔴 high | security | `src/App.tsx:15` | service_role key used in client code |
| 🟡 medium | quality | `package.json:1` | Dependency "moment" is never imported |

<details>
<summary>Details & fixes</summary>

### secrets-004 — OpenAI API key hardcoded
- **File:** .env:4
- **Severity:** high | **Category:** security
- **Why it matters:** Hardcoded secrets in source code get committed to git...
- **Fix:** Move the secret to a .env file and load it with import.meta.env...

</details>
```

## Roadmap

- Support for more frameworks (Next.js, Nuxt, SvelteKit)
- SARIF output for GitHub Security tab integration
- Auto-fix suggestions with code snippets
- Custom check plugins
- Severity overrides via config file

## Contributing

Contributions welcome. To add a new check:

1. Create a file in `src/checks/` that exports a `Check` object
2. Add it to the `CHECKS` array in `src/cli.ts` and `src/action.ts`
3. Write beginner-friendly `whyItMatters` and `fix` messages
4. Add test cases to `test-fixtures/vulnerable-app/`
5. Run `npm run build` to update `dist/index.js`
6. Submit a pull request

## License

MIT
