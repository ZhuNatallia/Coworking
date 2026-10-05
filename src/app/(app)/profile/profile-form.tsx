"use client";

import { useActionState } from "react";
import { updateOwnProfile } from "@/app/actions/auth";
import { buttonStyles, Field, FormMessage, inputClass } from "@/components/ui";

export function ProfileForm({ name }: { name: string }) {
  const [state, action, pending] = useActionState(updateOwnProfile, undefined);
  return (
    <form action={action} className="flex flex-col gap-3">
      <Field label="Имя">
        <input name="name" defaultValue={name} required className={inputClass} />
      </Field>
      <Field label="Новый пароль" hint="Оставьте пустым, чтобы не менять">
        <input name="password" type="password" autoComplete="new-password" className={inputClass} />
      </Field>
      <FormMessage state={state} />
      <button type="submit" disabled={pending} className={buttonStyles.primary}>
        Сохранить
      </button>
    </form>
  );
}
