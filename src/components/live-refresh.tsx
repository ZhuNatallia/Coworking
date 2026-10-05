"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";

const INTERVAL_MS = 4000;

/** Re-renders the current screen when a colleague changes data. Pauses while the tab is hidden. */
export function LiveRefresh() {
  const router = useRouter();

  useEffect(() => {
    let known: string | null = null;
    let timer: ReturnType<typeof setTimeout> | undefined;
    let stopped = false;

    async function poll() {
      if (document.visibilityState === "visible") {
        try {
          const res = await fetch("/api/live", { cache: "no-store" });
          if (res.ok) {
            const { changed } = (await res.json()) as { changed: string };
            if (known !== null && changed !== known && !isEditing()) router.refresh();
            if (known === null || !isEditing()) known = changed;
          }
        } catch {
          // Offline: try again on the next tick.
        }
      }
      if (!stopped) timer = setTimeout(poll, INTERVAL_MS);
    }

    function onVisible() {
      if (document.visibilityState !== "visible") return;
      clearTimeout(timer);
      void poll();
    }

    void poll();
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      stopped = true;
      clearTimeout(timer);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [router]);

  return null;
}

/** A refresh would not wipe form input, but waiting avoids moving fields under the user's fingers. */
function isEditing() {
  const el = document.activeElement;
  return el instanceof HTMLTextAreaElement || (el instanceof HTMLInputElement && el.type !== "checkbox" && el.type !== "radio");
}
