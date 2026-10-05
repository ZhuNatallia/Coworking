import { brandIcon } from "@/lib/brand-icon";

const VARIANTS: Record<string, () => Response> = {
  "192": () => brandIcon(192),
  "512": () => brandIcon(512),
  maskable: () => brandIcon(512, { inset: 0.3, rounded: false }),
};

export async function GET(_req: Request, ctx: RouteContext<"/icons/[variant]">) {
  const { variant } = await ctx.params;
  const render = VARIANTS[variant];
  if (!render) return new Response("Not found", { status: 404 });
  return render();
}
