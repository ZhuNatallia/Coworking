"use client";

import { useActionState } from "react";
import { updateOwnProfile } from "@/app/actions/auth";
import { buttonStyles, Field, FormMessage, inputClass } from "@/components/ui";
import { useI18n } from "@/lib/i18n/client";

export function ProfileForm({ name }: { name: string }) {
  const { t } = useI18n();
  const [state, action, pending] = useActionState(updateOwnProfile, undefined);
  return (
    <form action={action} className="flex flex-col gap-3">
      <Field label={t("profile.name")}>
        <input name="name" defaultValue={name} required className={inputClass} />
      </Field>
      <Field label={t("profile.newPassword")} hint={t("profile.keepPassword")}>
        <input name="password" type="password" autoComplete="new-password" className={inputClass} />
      </Field>
      <FormMessage state={state} />
      <button type="submit" disabled={pending} className={buttonStyles.primary}>
        {pending ? t("common.saving") : t("common.save")}
      </button>
    </form>
  );
}
