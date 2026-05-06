export const TIME_SLOTS = [
  "8:15 AM", "9:45 AM", "11:30 AM", "1:15 PM",
  "2:45 PM", "4:05 PM", "5:35 PM", "7:05 PM",
];
export const DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

export const PROGRAMS = [
  { value: "BBIT", label: "BBIT (Bachelors of Business & IT)" },
  { value: "BSBA", label: "BSBA (Bachelors of Business Administration)" },
  { value: "MBA", label: "MBA" },
  { value: "MS-IT", label: "MS-IT" },
];

export const BATCHES = [2022, 2023, 2024, 2025];
export const SECTIONS = ["A", "B", "C"];

export const COLOR_OPTIONS = ["teal", "amber", "slate", "blue"] as const;
export type SlotColor = typeof COLOR_OPTIONS[number];
