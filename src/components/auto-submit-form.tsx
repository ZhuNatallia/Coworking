"use client";

import type { ComponentProps } from "react";

export function AutoSubmitForm(props: ComponentProps<"form">) {
  return <form {...props} onChange={(e) => e.currentTarget.requestSubmit()} />;
}
