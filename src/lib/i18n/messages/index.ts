import type { Locale } from "../config";
import type { Messages } from "../core";
import { de } from "./de";
import { en } from "./en";
import { ro } from "./ro";
import { ru } from "./ru";

export const MESSAGES: Record<Locale, Messages> = { ru, en, de, ro };
