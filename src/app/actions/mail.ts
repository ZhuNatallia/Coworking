"use server";

import { refresh } from "next/cache";
import { requireUser } from "@/lib/auth/current";
import { db, newId, nowISO } from "@/lib/db";
import { str } from "@/lib/form";
import { getI18n } from "@/lib/i18n/server";
import { canAccessOffice } from "@/lib/queries";
import type { FormState } from "./auth";

export async function addOfficeMail(_prev: FormState, form: FormData): Promise<FormState> {
  const user = await requireUser();
  const { t } = await getI18n();
  const officeId = str(form, "office_id");
  const recipient = str(form, "recipient");
  const instruction = str(form, "instruction");
  if (!(await canAccessOffice(user, officeId))) throw new Error("No access to this office");
  if (!recipient) return { error: t("mail.recipientRequired") };
  if (!instruction) return { error: t("mail.instructionRequired") };

  await db().insert("office_mail", [
    { id: newId(), office_id: officeId, recipient, instruction, created_by: user.id, created_at: nowISO() },
  ]);
  refresh();
  return { ok: t("mail.added") };
}

export async function removeOfficeMail(form: FormData) {
  const user = await requireUser();
  const id = str(form, "id");
  const [row] = await db().select("office_mail", { eq: { id } });
  if (!row || !(await canAccessOffice(user, row.office_id))) throw new Error("No access to this office");
  await db().remove("office_mail", { eq: { id } });
  refresh();
}
