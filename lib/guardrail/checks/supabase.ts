import type { CheckName, FileInput, Finding } from '../types.js';

const CHECK: CheckName = 'supabase';

export function supabaseCheck(files: FileInput[]): Finding[] {
  const findings: Finding[] = [];
  const sqlFiles = files.filter((f) => f.path.endsWith('.sql'));
  const sourceFiles = files.filter(
    (f) => f.path.endsWith('.ts') || f.path.endsWith('.tsx') || f.path.endsWith('.js') || f.path.endsWith('.jsx'),
  );

  const tableRlsStatus = new Map<string, { rlsEnabled: boolean; policyCount: number; file: string; line: number }>();

  for (const file of sqlFiles) {
    const lines = file.content.split('\n');

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];

      const createMatch = line.match(/CREATE\s+TABLE\s+(?:public\.)?(\w+)/i);
      if (createMatch) {
        const tableName = createMatch[1];
        tableRlsStatus.set(tableName, { rlsEnabled: false, policyCount: 0, file: file.path, line: i + 1 });
      }

      const alterMatch = line.match(/ALTER\s+TABLE\s+(?:public\.)?(\w+)\s+.*ENABLE\s+ROW\s+LEVEL\s+SECURITY/i);
      if (alterMatch) {
        const tableName = alterMatch[1];
        const status = tableRlsStatus.get(tableName);
        if (status) status.rlsEnabled = true;
      }

      const createPolicyMatch = line.match(/CREATE\s+POLICY\s+\w+\s+ON\s+(\w+)/i);
      if (createPolicyMatch) {
        const tableName = createPolicyMatch[1];
        const status = tableRlsStatus.get(tableName);
        if (status) status.policyCount++;
      }

      if (/USING\s*\(\s*true\s*\)/i.test(line)) {
        const contextStart = Math.max(0, i - 5);
        const context = lines.slice(contextStart, i + 1).join('\n');
        const isSelect = /FOR\s+SELECT/i.test(context);

        if (isSelect) {
          findings.push({
            severity: 'medium',
            check: CHECK,
            file: file.path,
            line: i + 1,
            title: 'Policy with USING (true) — fine if this table is meant to be public',
            explanation:
              'USING (true) on a SELECT policy means anyone can read all rows. This is OK for public data (like blog posts), but risky if the table has private info.',
            fix: 'If this table should be private, replace with:\n  USING (auth.uid() = user_id)\nIf it\'s intentionally public, you can ignore this.',
          });
        } else {
          findings.push({
            severity: 'high',
            check: CHECK,
            file: file.path,
            line: i + 1,
            title: 'Policy with USING (true) allows all reads',
            explanation:
              'USING (true) means any logged-in user can read every row in this table. It\'s like having no lock on your front door.',
            fix: 'Replace with a proper condition:\n  USING (auth.uid() = user_id)\nThis ensures users can only read their own data.',
          });
        }
      }

      if (/WITH\s+CHECK\s*\(\s*true\s*\)/i.test(line)) {
        findings.push({
          severity: 'high',
          check: CHECK,
          file: file.path,
          line: i + 1,
          title: 'Policy with WITH CHECK (true) allows all writes',
          explanation:
            'WITH CHECK (true) means any user can insert or update any row. Someone could modify or delete data that doesn\'t belong to them.',
          fix: 'Replace with a proper condition:\n  WITH CHECK (auth.uid() = user_id)\nThis ensures users can only modify their own data.',
        });
      }

      if (/storage\.buckets/i.test(line)) {
        const contextStart = Math.max(0, i - 1);
        const contextEnd = Math.min(lines.length, i + 3);
        const context = lines.slice(contextStart, contextEnd).join('\n');
        if (/public.*true/i.test(context) || /VALUES.*true/i.test(context)) {
          findings.push({
            severity: 'medium',
            check: CHECK,
            file: file.path,
            line: i + 1,
            title: 'Public storage bucket created',
            explanation:
              'Public buckets let anyone read uploaded files without signing in. If users upload sensitive documents or photos, they become visible to the world.',
            fix: 'Set public to false unless the bucket truly needs public access:\n  INSERT INTO storage.buckets (id, public) VALUES (\'avatars\', false);',
          });
        }
      }
    }
  }

  for (const [tableName, status] of tableRlsStatus) {
    if (!status.rlsEnabled) {
      findings.push({
        severity: 'high',
        check: CHECK,
        file: status.file,
        line: status.line,
        title: `Table "${tableName}" created without Row Level Security`,
        explanation:
          'Without RLS, any logged-in user can read and write all data in this table. This is the #1 security mistake in Supabase apps.',
        fix: `Add this after your CREATE TABLE:\n  ALTER TABLE public.${tableName} ENABLE ROW LEVEL SECURITY;`,
      });
    } else if (status.policyCount === 0) {
      findings.push({
        severity: 'medium',
        check: CHECK,
        file: status.file,
        line: status.line,
        title: `Table "${tableName}" has RLS enabled but no policies`,
        explanation:
          'RLS with no policies means NO ONE can access the table — not even the owner. Your app will get "permission denied" errors.',
        fix: `Create at least one policy:\n  CREATE POLICY "Users can read own data"\n  ON public.${tableName}\n  FOR SELECT\n  USING (auth.uid() = user_id);`,
      });
    }
  }

  for (const file of sourceFiles) {
    const lines = file.content.split('\n');

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];

      if (/supabase\.from\(['"]\w+['"]\)\.(delete|update)\(\)/.test(line)) {
        if (!/\.eq\(/.test(line) && !/\.filter\(/.test(line)) {
          const method = line.match(/\.(\w+)\(\)/)?.[1] || 'operation';
          findings.push({
            severity: 'high',
            check: CHECK,
            file: file.path,
            line: i + 1,
            title: `Dangerous ${method}() without filter — affects all rows`,
            explanation:
              `Calling .${method}() without .eq() or .filter() will ${method === 'delete' ? 'delete' : 'modify'} every row in the table. One bug could wipe out all your data.`,
            fix: `Always add a filter:\n  .${method}()\n  .eq('id', targetId)\nThis ensures you only affect the specific row you intend to.`,
          });
        }
      }

      if (/service[_-]?role/i.test(line) && /supabase/i.test(line)) {
        if (!/title:|explanation:|fix:|const\s+\w+\s*=|\/.*\/\.test/.test(line)) {
          findings.push({
            severity: 'high',
            check: CHECK,
            file: file.path,
            line: i + 1,
            title: 'service_role key used in client code',
            explanation:
              'The service_role key bypasses all security and has full database access. If used in client code, anyone can extract it from your website and take complete control of your database.',
            fix: 'Use the anon key instead:\n  const supabase = createClient(url, import.meta.env.VITE_SUPABASE_ANON_KEY)\nOnly use service_role in secure server-side code.',
          });
        }
      }

      if (/\b(isAdmin|isAdminUser|hasAdminAccess)\s*[:=]\s*localStorage/.test(line)) {
        findings.push({
          severity: 'high',
          check: CHECK,
          file: file.path,
          line: i + 1,
          title: 'Admin status determined in client code',
          explanation:
            'Anyone can open browser dev tools and change localStorage to set isAdmin=true. Client-side checks are not security — they\'re just UI hints. Real authorization must happen on the server.',
          fix: 'Check admin status server-side using Supabase RLS policies or Edge Functions. Example:\n  CREATE POLICY "Admins only"\n  ON sensitive_table\n  USING (EXISTS (SELECT 1 FROM admins WHERE user_id = auth.uid()));',
        });
      }
    }
  }

  return findings;
}
