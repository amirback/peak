"use client";
import { useTranslations } from "next-intl";
import { Globe } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useState, useEffect } from "react";

const LOCALES = [
  { code: "ru", label: "Рус" },
  { code: "kz", label: "Қаз" },
  { code: "en", label: "Eng" },
];

export function LanguageSwitcher() {
  const [currentLocale, setCurrentLocale] = useState("ru");
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const saved = document.cookie.match(/locale=([^;]+)/)?.[1] || "ru";
    setCurrentLocale(saved);
  }, []);

  const handleChange = (locale: string) => {
    document.cookie = `locale=${locale}; path=/; max-age=${60 * 60 * 24 * 365}`;
    setCurrentLocale(locale);
    setOpen(false);
    window.location.reload();
  };

  return (
    <div className="relative">
      <Button variant="ghost" size="sm" onClick={() => setOpen(!open)} className="gap-1.5 text-slate-600 hover:text-slate-800">
        <Globe className="h-4 w-4" />
        <span className="text-xs font-medium">{LOCALES.find(l => l.code === currentLocale)?.label}</span>
      </Button>
      {open && (
        <div className="absolute right-0 top-full mt-1 z-50 bg-white border border-slate-200 rounded-lg shadow-sm py-1 min-w-[80px]">
          {LOCALES.map(locale => (
            <button
              key={locale.code}
              onClick={() => handleChange(locale.code)}
              className={`w-full text-left px-3 py-1.5 text-sm hover:bg-slate-50 transition-colors ${currentLocale === locale.code ? "text-blue-500 font-medium" : "text-slate-700"}`}
            >
              {locale.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
