// The version that's live right now. Never cached.
export const dynamic = "force-dynamic";

export function GET() {
  return Response.json({ v: process.env.NEXT_PUBLIC_BUILD_ID ?? "" }, { headers: { "cache-control": "no-store" } });
}
