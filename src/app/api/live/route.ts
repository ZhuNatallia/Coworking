import { getCurrentUser } from "@/lib/auth/current";
import { lastChange } from "@/lib/db";

/** Timestamp of the latest data change. Open screens poll it and refresh when it moves. */
export async function GET() {
  if (!(await getCurrentUser())) return Response.json({ error: "unauthorized" }, { status: 401 });
  return Response.json({ changed: await lastChange() }, { headers: { "Cache-Control": "no-store" } });
}
