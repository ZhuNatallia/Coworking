import { inputClass } from "@/components/ui";
import { LOCALE_NAMES, LOCALES } from "@/lib/i18n/config";

/** Plain form field: submits the chosen language with the surrounding form. */
export function LocaleSelect({ defaultValue }: { defaultValue: string }) {
  return (
    <select name="locale" defaultValue={defaultValue} className={inputClass}>
      {LOCALES.map((l) => (
        <option key={l} value={l}>
          {LOCALE_NAMES[l]}
        </option>
      ))}
    </select>
  );
}
