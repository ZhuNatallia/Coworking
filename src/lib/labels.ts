import type {
  Recurrence,
  RequestStatus,
  Role,
  SupplyCategory,
  SupplyStatus,
  SupplyUnit,
  TaskCategory,
  TaskFrequency,
  VisitStatus,
} from "./types";

export const ROLE_LABEL: Record<Role, string> = { admin: "Администратор", employee: "Сотрудник" };

export const VISIT_STATUS_LABEL: Record<VisitStatus, string> = {
  planned: "Запланировано",
  in_progress: "В процессе",
  done: "Выполнено",
  skipped: "Пропущено",
};

export const RECURRENCE_LABEL: Record<Recurrence, string> = {
  weekly: "Каждую неделю",
  alternate: "По очереди (чёт/нечёт неделя)",
  pair: "Два сотрудника",
};

export const TASK_CATEGORY_LABEL: Record<TaskCategory, string> = {
  cleaning: "Уборка",
  kitchen: "Кухня",
  bathroom: "Санузел",
  office: "Офис",
  extra: "Дополнительно",
};

export const SUPPLY_CATEGORY_LABEL: Record<SupplyCategory, string> = {
  kitchen: "Кухня",
  bathroom: "Санузел",
  office: "Офис",
  cleaning: "Уборка",
};

export const FREQUENCY_LABEL: Record<TaskFrequency, string> = {
  weekly: "Каждый визит",
  monthly: "Раз в месяц",
  as_needed: "По необходимости",
};

export const SUPPLY_STATUS_LABEL: Record<SupplyStatus, string> = {
  ok: "Достаточно",
  low: "Заканчивается",
  out: "Нет",
};

export const REQUEST_STATUS_LABEL: Record<RequestStatus, string> = {
  open: "Нужно взять",
  delivered: "Привезено",
  cancelled: "Больше не нужно",
};

export const UNIT_LABEL: Record<SupplyUnit, string> = {
  pcs: "шт",
  pack: "уп",
  roll: "рулонов",
  bottle: "бутылок",
  ream: "пачек",
  kg: "кг",
  l: "л",
};

export const UNIT_NAME: Record<SupplyUnit, string> = {
  pcs: "штуки",
  pack: "упаковки",
  roll: "рулоны",
  bottle: "бутылки",
  ream: "пачки",
  kg: "килограммы",
  l: "литры",
};

/** one / few / many / fraction forms for units that are written out in full. */
const UNIT_FORMS: Partial<Record<SupplyUnit, [string, string, string, string]>> = {
  roll: ["рулон", "рулона", "рулонов", "рулона"],
  bottle: ["бутылка", "бутылки", "бутылок", "бутылки"],
  ream: ["пачка", "пачки", "пачек", "пачки"],
};

export function unitFor(quantity: number, unit: SupplyUnit): string {
  const forms = UNIT_FORMS[unit];
  if (!forms) return UNIT_LABEL[unit];
  if (!Number.isInteger(quantity)) return forms[3];
  const m10 = quantity % 10;
  const m100 = quantity % 100;
  if (m10 === 1 && m100 !== 11) return forms[0];
  if (m10 >= 2 && m10 <= 4 && (m100 < 12 || m100 > 14)) return forms[1];
  return forms[2];
}

export function quantityLabel(quantity: number | null, unit: SupplyUnit): string | null {
  return quantity == null ? null : `${String(quantity).replace(".", ",")} ${unitFor(quantity, unit)}`;
}
