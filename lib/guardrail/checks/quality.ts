import type { CheckName, FileInput, Finding } from '../types.js';

const CHECK: CheckName = 'quality';

const HEAVY_PACKAGES = [
  { name: 'moment', alternative: 'date-fns or dayjs (20x smaller)' },
  { name: 'lodash', alternative: 'lodash-es (tree-shakeable) or native JS methods' },
  { name: 'rxjs', alternative: 'native Promises or lighter alternatives for simple use cases' },
];

function getBasename(path: string): string {
  const parts = path.split('/');
  return parts[parts.length - 1];
}

export function qualityCheck(files: FileInput[]): Finding[] {
  const findings: Finding[] = [];
  const sourceFiles = files.filter(
    (f) => f.path.endsWith('.ts') || f.path.endsWith('.tsx') || f.path.endsWith('.js') || f.path.endsWith('.jsx'),
  );

  let packageJson: { dependencies?: Record<string, string>; devDependencies?: Record<string, string> } = {};
  const pkgFile = files.find((f) => f.path === 'package.json');
  if (pkgFile) {
    try {
      packageJson = JSON.parse(pkgFile.content);
    } catch {
      return findings;
    }
  }

  const deps = packageJson.dependencies || {};
  const devDeps = packageJson.devDependencies || {};

  const importedModules = new Set<string>();
  const fileImports = new Map<string, Set<string>>();

  for (const file of sourceFiles) {
    const lines = file.content.split('\n');
    const imports = new Set<string>();

    for (const line of lines) {
      const importMatch = line.match(/import\s+.*?from\s+['"]([^'"]+)['"]/);
      if (importMatch) {
        const module = importMatch[1];
        imports.add(module);

        if (!module.startsWith('.') && !module.startsWith('@/')) {
          const pkgName = module.startsWith('@') ? module.split('/').slice(0, 2).join('/') : module.split('/')[0];
          importedModules.add(pkgName);
        }
      }
    }

    fileImports.set(file.path, imports);

    if (lines.length > 500) {
      findings.push({
        severity: 'low',
        check: CHECK,
        file: file.path,
        line: 1,
        title: `File has ${lines.length} lines (over 500)`,
        explanation:
          'Large files are hard to understand, test, and maintain. They often contain multiple responsibilities that should be separated.',
        fix: 'Break the file into smaller, focused modules. Extract components, hooks, or utility functions into separate files.',
      });
    }

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];

      if (/console\.log\(/.test(line)) {
        findings.push({
          severity: 'low',
          check: CHECK,
          file: file.path,
          line: i + 1,
          title: 'console.log left in source code',
          explanation:
            'Debug logs clutter the console in production and can expose sensitive data. They also signal unfinished code to other developers.',
          fix: 'Remove the console.log or use a proper logging library with log levels that can be disabled in production.',
        });
      }

      if (/\/\/\s*(TODO|FIXME)\b/i.test(line)) {
        const match = line.match(/\/\/\s*(TODO|FIXME)\b:?\s*(.*)/i);
        const keyword = match?.[1] || 'TODO';
        findings.push({
          severity: 'low',
          check: CHECK,
          file: file.path,
          line: i + 1,
          title: `${keyword} comment in source code`,
          explanation:
            'TODOs and FIXMEs are easy to forget. If this was important enough to note, it should be tracked in your issue tracker where it won\'t be lost.',
          fix: 'Either fix the issue now or create a ticket in your issue tracker and reference it: // TODO #123',
        });
      }
    }
  }

  for (const pkg of HEAVY_PACKAGES) {
    if (deps[pkg.name]) {
      findings.push({
        severity: 'low',
        check: CHECK,
        file: 'package.json',
        line: 1,
        title: `Heavy package "${pkg.name}" in dependencies`,
        explanation:
          `${pkg.name} adds significant bundle size, slowing down your app. Users on mobile or slow connections will notice the difference.`,
        fix: `Consider using ${pkg.alternative}.`,
      });
    }
  }

  for (const pkg of Object.keys(deps)) {
    if (!importedModules.has(pkg) && !pkg.startsWith('@types/')) {
      findings.push({
        severity: 'medium',
        check: CHECK,
        file: 'package.json',
        line: 1,
        title: `Dependency "${pkg}" is never imported in source code`,
        explanation:
          'Unused dependencies bloat your node_modules and install time. They also confuse developers about what the project actually uses.',
        fix: `Remove it: npm uninstall ${pkg}`,
      });
    }
  }

  const duplicateDeps = Object.keys(deps).filter((pkg) => devDeps[pkg]);
  for (const pkg of duplicateDeps) {
    findings.push({
      severity: 'medium',
      check: CHECK,
      file: 'package.json',
      line: 1,
      title: `"${pkg}" is in both dependencies and devDependencies`,
      explanation:
        'Having a package in both lists is confusing and can cause version conflicts. It should only be in one.',
      fix: `Decide if it's needed at runtime (dependencies) or only for development (devDependencies) and remove it from the other.`,
    });
  }

  const importedFiles = new Set<string>();
  for (const [, imports] of fileImports) {
    for (const imp of imports) {
      if (imp.startsWith('.') || imp.startsWith('@/')) {
        importedFiles.add(imp);
      }
    }
  }

  const KNOWN_ENTRY_FILES = new Set([
    'main.tsx', 'main.ts', 'index.tsx', 'index.ts', 'App.tsx', 'App.ts',
    'router.tsx', 'server.ts', 'start.ts', 'middleware.ts',
    'instrumentation.ts', 'routeTree.gen.ts',
  ]);

  const KNOWN_CONFIG_PATTERNS = [
    /^vite\.config\./, /^tailwind\.config\./, /^postcss\.config\./,
    /^next\.config\./, /^eslint\.config\./, /^tsconfig.*\.json$/,
    /\.d\.ts$/,
  ];

  const ROUTING_DIRS = ['src/routes/', 'src/pages/', 'src/app/', 'supabase/functions/'];

  const FRAMEWORK_ENTRIES: Record<string, string[]> = {
    '@tanstack/react-router': ['routeTree.gen.ts', 'src/router.tsx', 'src/main.tsx'],
    next: ['next.config.js', 'next.config.mjs', 'src/middleware.ts', 'middleware.ts', 'src/app/layout.tsx'],
    remix: ['app/root.tsx', 'app/entry.client.tsx', 'app/entry.server.tsx'],
    astro: ['astro.config.mjs', 'astro.config.ts', 'src/pages/index.astro'],
  };

  const frameworkExtra: string[] = [];
  const allDepNames = new Set([...Object.keys(deps), ...Object.keys(devDeps)]);
  for (const [framework, entries] of Object.entries(FRAMEWORK_ENTRIES)) {
    if (allDepNames.has(framework) || (framework === 'next' && allDepNames.has('next'))) {
      frameworkExtra.push(...entries);
    }
  }
  const frameworkEntrySet = new Set(frameworkExtra);

  const orphans: string[] = [];

  for (const file of sourceFiles) {
    const filePath = file.path;
    const fileName = getBasename(filePath);
    if (KNOWN_ENTRY_FILES.has(fileName)) continue;
    if (KNOWN_CONFIG_PATTERNS.some((p) => p.test(filePath))) continue;
    if (ROUTING_DIRS.some((dir) => filePath.startsWith(dir) || filePath.includes('/' + dir))) continue;
    if (frameworkEntrySet.has(filePath) || frameworkEntrySet.has(fileName)) continue;

    const fileBase = filePath.replace(/\.\w+$/, '');
    const isImported = Array.from(importedFiles).some(
      (imp) => imp.includes(fileBase) || imp.includes(fileName.replace(/\.\w+$/, '')),
    );

    if (!isImported && sourceFiles.length > 1) {
      orphans.push(filePath);
    }
  }

  if (orphans.length > 0) {
    const fileList = orphans.length <= 5
      ? orphans.map((f) => `\`${f}\``).join(', ')
      : `${orphans.length} files`;

    findings.push({
      severity: 'low',
      check: CHECK,
      file: orphans[0],
      line: 1,
      title: `${orphans.length} orphan file${orphans.length === 1 ? '' : 's'} never imported: ${fileList}`,
      explanation:
        'Orphan files are dead code. They add confusion about what the project actually does and may indicate unfinished or abandoned features.',
      fix: 'If these files are truly unused, delete them. If they should be used, import them where needed.',
    });
  }

  return findings;
}
