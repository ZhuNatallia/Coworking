"use client";

import { Trash2 } from "lucide-react";
import { deleteOffice } from "@/app/actions/admin";
import { buttonStyles } from "@/components/ui";

export function DeleteOfficeButton({ id, label, confirmText }: { id: string; label: string; confirmText: string }) {
  return (
    <form
      action={deleteOffice}
      onSubmit={(event) => {
        if (!window.confirm(confirmText)) event.preventDefault();
      }}
    >
      <input type="hidden" name="id" value={id} />
      <button type="submit" className={`${buttonStyles.danger} w-full`}>
        <Trash2 className="size-5" />
        {label}
      </button>
    </form>
  );
}
