export function requireEnv(name: string): string {
  const value = process.env[name];

  if (!value) {
    throw new Error(
      `Missing required environment variable: ${name}. ` +
        `Set it in .env.local for local development, or on Vercel with ` +
        `\`vercel env add ${name}\`, then redeploy with \`vercel --prod\`.`,
    );
  }

  return value;
}
