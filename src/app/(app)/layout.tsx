import { BottomNav } from "@/components/bottom-nav";
import { requireUser } from "@/lib/auth/current";

export default async function AppLayout({ children }: LayoutProps<"/">) {
  const user = await requireUser();
  return (
    <div className="mx-auto min-h-screen max-w-[430px] bg-canvas sm:border-x sm:border-line sm:shadow-sm">
      {children}
      <BottomNav role={user.role} />
    </div>
  );
}
