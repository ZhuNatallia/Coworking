import { Bell, ChevronDown, LogOut, Smartphone, UserRound } from "lucide-react";
import type { ReactNode } from "react";
import { logout } from "@/app/actions/auth";
import { Avatar, Card, Page, PageHeader } from "@/components/ui";
import { requireUser } from "@/lib/auth/current";
import { ROLE_LABEL } from "@/lib/labels";
import { ProfileForm } from "./profile-form";

function Section({ icon, title, children, open }: { icon: ReactNode; title: string; children: ReactNode; open?: boolean }) {
  return (
    <details className="group" open={open}>
      <summary className="flex cursor-pointer list-none items-center gap-3 px-4 py-3.5 [&::-webkit-details-marker]:hidden">
        <span className="text-brand-600">{icon}</span>
        <span className="flex-1 font-medium">{title}</span>
        <ChevronDown className="size-5 text-muted transition group-open:rotate-180" />
      </summary>
      <div className="px-4 pb-4">{children}</div>
    </details>
  );
}

export default async function ProfilePage() {
  const user = await requireUser();
  return (
    <>
      <PageHeader title="Профиль" />
      <Page>
        <Card className="flex items-center gap-4">
          <Avatar name={user.name} size={56} />
          <div className="min-w-0">
            <p className="text-lg font-semibold">{user.name}</p>
            <p className="truncate text-sm text-muted">{user.email}</p>
            <p className="text-sm text-brand-700">{ROLE_LABEL[user.role]}</p>
          </div>
        </Card>

        <Card className="divide-y divide-line p-0">
          <Section icon={<UserRound className="size-5" />} title="Личные данные">
            <ProfileForm name={user.name} />
          </Section>
          <Section icon={<Bell className="size-5" />} title="Уведомления">
            <p className="text-sm text-muted">
              Push-уведомления появятся в следующей версии. Сейчас напоминание о ближайшем визите и список «Взять с собой» показываются на
              главном экране.
            </p>
          </Section>
          <Section icon={<Smartphone className="size-5" />} title="Как установить на телефон">
            <div className="flex flex-col gap-3 text-sm text-ink">
              <p>
                <b>iPhone:</b> откройте сайт в Safari → кнопка «Поделиться» → «На экран „Домой“».
              </p>
              <p>
                <b>Android:</b> откройте сайт в Chrome → меню ⋮ → «Добавить на главный экран» или «Установить приложение».
              </p>
              <p className="text-muted">После этого OfficeCare открывается с иконки, как обычное приложение.</p>
            </div>
          </Section>
        </Card>

        <form action={logout}>
          <button type="submit" className="flex w-full items-center gap-3 rounded-2xl border border-line bg-white px-4 py-3.5 font-medium text-danger-700">
            <LogOut className="size-5" />
            Выйти
          </button>
        </form>
      </Page>
    </>
  );
}
