import type { SupplyCategory, SupplyUnit, Task } from "@/lib/types";

export type TaskTemplate = Pick<Task, "name" | "done_label" | "category" | "frequency" | "required">;

/** Base checklist every new office starts with (ТЗ, пункт 9). */
export const DEFAULT_TASKS: TaskTemplate[] = [
  { name: "Пылесос", done_label: "Пропылесошено", category: "cleaning", frequency: "as_needed", required: true },
  { name: "Пол", done_label: "Пол помыт", category: "cleaning", frequency: "as_needed", required: true },
  { name: "Мусор", done_label: "Мусор вынесен", category: "cleaning", frequency: "weekly", required: true },
  { name: "Полотенца", done_label: "Полотенца поменяны", category: "bathroom", frequency: "weekly", required: false },
  { name: "Почтовый ящик", done_label: "Почта проверена", category: "extra", frequency: "weekly", required: false },
  { name: "Кухня: генеральная уборка", done_label: "Холодильник и микроволновка вымыты", category: "kitchen", frequency: "monthly", required: false },
];

export interface SupplyTemplate {
  name: string;
  unit: SupplyUnit;
  category: SupplyCategory;
}

export const DEFAULT_SUPPLIES: SupplyTemplate[] = [
  { name: "Вода", unit: "bottle", category: "kitchen" },
  { name: "Кофе в зернах", unit: "kg", category: "kitchen" },
  { name: "Кофе в капсулах", unit: "pcs", category: "kitchen" },
  { name: "Мочалка для посуды", unit: "pcs", category: "kitchen" },
  { name: "Жидкое мыло", unit: "bottle", category: "kitchen" },
  { name: "Туалетная бумага", unit: "roll", category: "bathroom" },
  { name: "Полотенца", unit: "pcs", category: "bathroom" },
  { name: "Бумага для печати", unit: "ream", category: "office" },
  { name: "Тонер", unit: "pcs", category: "office" },
  { name: "Моющие средства", unit: "bottle", category: "office" },
];
