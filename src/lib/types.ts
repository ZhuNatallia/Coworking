export type Role = "admin" | "employee";
export type VisitStatus = "planned" | "in_progress" | "done" | "skipped";
export type Recurrence = "weekly" | "pair" | "alternate";
export type TaskCategory = "cleaning" | "kitchen" | "bathroom" | "office" | "extra";
export type TaskFrequency = "weekly" | "monthly" | "as_needed";
export type VisitTaskStatus = "pending" | "not_needed" | "needed" | "done" | "skipped";
export type SupplyStatus = "ok" | "low" | "out";
export type SupplyUnit = "pcs" | "pack" | "roll" | "bottle" | "ream" | "kg" | "l";
export type SupplyCategory = "kitchen" | "bathroom" | "office" | "cleaning";
export type RequestStatus = "open" | "delivered" | "cancelled";

export interface Profile {
  id: string;
  name: string;
  email: string;
  role: Role;
  avatar: string | null;
  active: boolean;
  /** App language: ru, en, de or ro. Missing on rows created before languages existed. */
  locale?: string | null;
  created_at: string;
}

export interface City {
  id: string;
  name: string;
  sort_order: number;
  created_at: string;
}

export interface Office {
  id: string;
  city_id: string;
  name: string;
  address: string;
  contact_name: string | null;
  contact_phone: string | null;
  notes: string | null;
  active: boolean;
  created_at: string;
}

export interface Schedule {
  id: string;
  office_id: string;
  /** ISO weekday: 1 = Monday … 7 = Sunday */
  weekday: number;
  time: string | null;
  recurrence: Recurrence;
  employee_1_id: string;
  employee_2_id: string | null;
  starts_on: string;
  active: boolean;
  created_at: string;
}

export interface Visit {
  id: string;
  office_id: string;
  schedule_id: string | null;
  /** Date the schedule produced this visit for; stays fixed when an admin moves the visit. */
  origin_date: string | null;
  scheduled_date: string;
  time: string | null;
  employee_1_id: string | null;
  employee_2_id: string | null;
  status: VisitStatus;
  is_override: boolean;
  started_at: string | null;
  completed_at: string | null;
  completed_by: string | null;
  notes: string | null;
  created_at: string;
}

export interface Task {
  id: string;
  office_id: string;
  name: string;
  done_label: string | null;
  category: TaskCategory;
  frequency: TaskFrequency;
  required: boolean;
  active: boolean;
  sort_order: number;
}

export interface VisitTask {
  id: string;
  visit_id: string;
  task_id: string;
  status: VisitTaskStatus;
  notes: string | null;
  completed_at: string | null;
  completed_by: string | null;
}

export interface Supply {
  id: string;
  name: string;
  unit: SupplyUnit;
  category: SupplyCategory;
  active: boolean;
  sort_order: number;
}

export interface OfficeSupply {
  id: string;
  office_id: string;
  supply_id: string;
  quantity: number | null;
  status: SupplyStatus | null;
  low_threshold: number | null;
  critical_threshold: number | null;
  sort_order: number;
  updated_at: string | null;
  updated_by: string | null;
}

export interface VisitSupply {
  id: string;
  visit_id: string;
  supply_id: string;
  quantity: number | null;
  status: SupplyStatus | null;
  notes: string | null;
  updated_at: string | null;
}

export interface SupplyRequest {
  id: string;
  office_id: string;
  supply_id: string;
  quantity: number | null;
  reason: "low" | "out";
  status: RequestStatus;
  created_from_visit_id: string | null;
  created_by: string | null;
  created_at: string;
  completed_at: string | null;
  completed_by: string | null;
}

export interface Photo {
  id: string;
  visit_id: string;
  url: string;
  created_at: string;
  created_by: string | null;
}

export interface AppSetting {
  id: string;
  value: string;
}

/** Machine translation of user-entered text. id is a hash of the target language and the source text. */
export interface Translation {
  id: string;
  lang: string;
  source: string;
  text: string;
  created_at: string;
}

export interface Tables {
  profiles: Profile;
  cities: City;
  offices: Office;
  schedules: Schedule;
  visits: Visit;
  tasks: Task;
  visit_tasks: VisitTask;
  supplies: Supply;
  office_supplies: OfficeSupply;
  visit_supplies: VisitSupply;
  supply_requests: SupplyRequest;
  photos: Photo;
  app_settings: AppSetting;
  translations: Translation;
}

export type TableName = keyof Tables;
