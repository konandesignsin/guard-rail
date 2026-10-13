This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Environment variables

Copy `.env.example` to `.env.local` for local development and fill in the values. On Vercel, add each variable in Project → Settings → Environment Variables (NEXT_PUBLIC_ vars are inlined at build time, so set them before deploying).

| Variable | Used for |
| --- | --- |
| `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` | Clerk auth on the client |
| `CLERK_SECRET_KEY` | Clerk auth on the server |
| `CLERK_WEBHOOK_SECRET` | Verifying Clerk webhook signatures (`whsec_...`) |
| `DATABASE_URL` | Neon Postgres connection string |
| `RESEND_API_KEY` | Sending email via Resend (`re_...`) |
| `EMAIL_FROM` | From address for outgoing email (falls back to `onboarding@resend.dev`) |
| `NEXT_PUBLIC_APP_URL` | Public base URL of the app (used in emails) |
| `CRON_SECRET` | Shared secret for future cron routes |
| `TEST_EMAIL` | Local only — recipient for `scripts/test-resend.ts` |

To verify your Resend key, run `npx tsx --env-file=.env.local scripts/test-resend.ts` (set `TEST_EMAIL` to receive a test email).

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
