import { BottomNav } from "@/components/bottom-nav";
import { LiveRefresh } from "@/components/live-refresh";
import { requireUser } from "@/lib/auth/current";

export default async function AppLayout({ children }: LayoutProps<"/">) {
  await requireUser();
  return (
    <div className="mx-auto min-h-screen max-w-[430px] bg-canvas sm:border-x sm:border-line sm:shadow-sm">
      {children}
      <BottomNav />
      <LiveRefresh />
    </div>
  );
}
