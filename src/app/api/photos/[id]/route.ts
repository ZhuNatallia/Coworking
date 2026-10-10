import { getCurrentUser } from "@/lib/auth/current";
import { db } from "@/lib/db";
import { readPhoto } from "@/lib/photos";
import { canAccessOffice } from "@/lib/queries";

export async function GET(_req: Request, ctx: RouteContext<"/api/photos/[id]">) {
  const user = await getCurrentUser();
  if (!user) return new Response("Unauthorized", { status: 401 });
  const { id } = await ctx.params;
  const store = db();
  const [photo] = await store.select("photos", { eq: { id } });
  if (!photo) return new Response("Not found", { status: 404 });
  let officeId: string | undefined;
  if (photo.visit_id) {
    const [visit] = await store.select("visits", { eq: { id: photo.visit_id } });
    officeId = visit?.office_id;
  } else if (photo.office_supply_id) {
    const [row] = await store.select("office_supplies", { eq: { id: photo.office_supply_id } });
    officeId = row?.office_id;
  }
  if (!officeId || !(await canAccessOffice(user, officeId))) return new Response("Not found", { status: 404 });
  const file = await readPhoto(photo.url);
  if (!file) return new Response("Not found", { status: 404 });
  return new Response(new Uint8Array(file.data), {
    headers: { "Content-Type": file.contentType, "Cache-Control": "private, max-age=86400, immutable" },
  });
}
