import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatDate(date: string | Date, locale = "ru") {
  return new Intl.DateTimeFormat(locale === "kz" ? "kk-KZ" : locale === "en" ? "en-US" : "ru-RU", {
    year: "numeric",
    month: "long",
    day: "numeric",
  }).format(new Date(date));
}

export function formatRelativeTime(date: string | Date, locale = "ru") {
  const now = new Date();
  const then = new Date(date);
  const diff = now.getTime() - then.getTime();
  const minutes = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);

  if (locale === "en") {
    if (minutes < 1) return "just now";
    if (minutes < 60) return `${minutes}m ago`;
    if (hours < 24) return `${hours}h ago`;
    return `${days}d ago`;
  }
  if (locale === "kz") {
    if (minutes < 1) return "жаңа ғана";
    if (minutes < 60) return `${minutes} мин бұрын`;
    if (hours < 24) return `${hours} сағ бұрын`;
    return `${days} күн бұрын`;
  }
  if (minutes < 1) return "только что";
  if (minutes < 60) return `${minutes} мин назад`;
  if (hours < 24) return `${hours} ч назад`;
  return `${days} дн назад`;
}

export function secondsToTime(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  if (h > 0) return `${h}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
  return `${m}:${String(s).padStart(2, "0")}`;
}

export function getYouTubeId(url: string): string | null {
  const match = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([^&\n?#]+)/);
  return match ? match[1] : null;
}

export function getVimeoId(url: string): string | null {
  const match = url.match(/vimeo\.com\/(\d+)/);
  return match ? match[1] : null;
}

export function calculateXP(action: "lesson_complete" | "quiz_perfect" | "quiz_pass" | "first_course" | "streak_7"): number {
  const xpMap = {
    lesson_complete: 10,
    quiz_perfect: 50,
    quiz_pass: 20,
    first_course: 100,
    streak_7: 75,
  };
  return xpMap[action];
}

export function getLevel(xp: number): { level: number; title: string; nextLevelXp: number } {
  const levels = [
    { xp: 0, title: "Новичок" },
    { xp: 100, title: "Ученик" },
    { xp: 300, title: "Студент" },
    { xp: 600, title: "Знаток" },
    { xp: 1000, title: "Эксперт" },
    { xp: 1500, title: "Мастер" },
    { xp: 2500, title: "Легенда" },
  ];
  let level = 0;
  for (let i = levels.length - 1; i >= 0; i--) {
    if (xp >= levels[i].xp) { level = i; break; }
  }
  return {
    level: level + 1,
    title: levels[level].title,
    nextLevelXp: levels[Math.min(level + 1, levels.length - 1)].xp,
  };
}
