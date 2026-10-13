import { config } from "dotenv";

config({ path: ".env.local" });

const TEST_SECRET = "cron-test-2f8a41d9";
process.env.CRON_SECRET = TEST_SECRET;

// Imported after the env is in place.
const { GET } = require("./app/api/cron/cleanup/route");

const cases: Array<{ label: string; headers: Record<string, string> }> = [
  { label: "no Authorization header", headers: {} },
  { label: "wrong bearer", headers: { authorization: "Bearer definitely-wrong" } },
  { label: "empty bearer", headers: { authorization: "Bearer " } },
  { label: "non-bearer scheme", headers: { authorization: `Token ${TEST_SECRET}` } },
  { label: "correct bearer", headers: { authorization: `Bearer ${TEST_SECRET}` } },
];

async function main() {
  for (const testCase of cases) {
    const request = new Request("http://localhost/api/cron/cleanup", { headers: testCase.headers });
    const response = await GET(request);
    console.log(
      JSON.stringify({
        case: testCase.label,
        status: response.status,
        body: await response.json(),
      }),
    );
  }

  // With no CRON_SECRET configured the route must refuse, not authorize.
  delete process.env.CRON_SECRET;
  const noSecret = await GET(
    new Request("http://localhost/api/cron/cleanup", {
      headers: { authorization: `Bearer ${TEST_SECRET}` },
    }),
  );
  console.log(
    JSON.stringify({
      case: "correct bearer but CRON_SECRET unset",
      status: noSecret.status,
      body: await noSecret.json(),
    }),
  );
}

main().then(
  () => process.exit(0),
  (err) => {
    console.log(JSON.stringify({ error: err instanceof Error ? err.message : String(err) }));
    process.exit(1);
  },
);
