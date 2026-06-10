"use client";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { registerSchema, type RegisterFormData } from "@/lib/validations/auth";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { BookOpen, Loader2, GraduationCap, PenLine, Mail, CheckCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useTranslations } from "next-intl";
import { LanguageSwitcher } from "@/components/layout/LanguageSwitcher";
import { cn } from "@/lib/utils";

export default function RegisterPage() {
  const t = useTranslations();
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [emailSent, setEmailSent] = useState(false);
  const [submittedEmail, setSubmittedEmail] = useState("");

  const { register, handleSubmit, watch, setValue, formState: { errors } } = useForm<RegisterFormData>({
    resolver: zodResolver(registerSchema),
    defaultValues: { role: "student" },
  });

  const role = watch("role");

  const onSubmit = async (data: RegisterFormData) => {
    setLoading(true);
    setError("");
    const supabase = createClient();
    const { error: authError } = await supabase.auth.signUp({
      email: data.email,
      password: data.password,
      options: {
        data: { full_name: data.full_name, role: data.role, locale: "ru" },
      },
    });
    if (authError) {
      setError(authError.message === "User already registered" ? "Пользователь с таким email уже существует" : authError.message);
      setLoading(false);
      return;
    }
    setSubmittedEmail(data.email);
    setEmailSent(true);
    setLoading(false);
  };

  if (emailSent) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col">
        <div className="flex items-center justify-between px-6 py-4">
          <Link href="/" className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-500">
              <BookOpen className="h-4 w-4 text-white" />
            </div>
            <span className="text-lg font-semibold text-slate-800">Peak</span>
          </Link>
        </div>
        <div className="flex flex-1 items-center justify-center px-4">
          <div className="w-full max-w-md">
            <div className="bg-white rounded-2xl border border-slate-200 p-8 text-center">
              <div className="flex justify-center mb-4">
                <div className="h-16 w-16 rounded-full bg-blue-50 flex items-center justify-center">
                  <Mail className="h-8 w-8 text-blue-500" />
                </div>
              </div>
              <h1 className="text-2xl font-bold text-slate-800 mb-2">Подтвердите почту</h1>
              <p className="text-slate-500 mb-2">
                Мы отправили письмо на
              </p>
              <p className="font-semibold text-slate-800 mb-4">{submittedEmail}</p>
              <p className="text-sm text-slate-500 mb-6">
                Откройте письмо и нажмите на кнопку подтверждения. После этого вы сможете войти в аккаунт.
              </p>
              <div className="rounded-lg bg-amber-50 border border-amber-100 px-4 py-3 text-sm text-amber-700 mb-6">
                Не нашли письмо? Проверьте папку «Спам».
              </div>
              <Link href="/login">
                <Button variant="outline" className="w-full">Перейти ко входу</Button>
              </Link>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      <div className="flex items-center justify-between px-6 py-4">
        <Link href="/" className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-500">
            <BookOpen className="h-4 w-4 text-white" />
          </div>
          <span className="text-lg font-semibold text-slate-800">Peak</span>
        </Link>
        <LanguageSwitcher />
      </div>

      <div className="flex flex-1 items-center justify-center px-4 py-12">
        <div className="w-full max-w-md">
          <div className="bg-white rounded-2xl border border-slate-200 p-8">
            <div className="mb-8">
              <h1 className="text-2xl font-bold text-slate-800">{t("auth.registerTitle")}</h1>
              <p className="mt-1 text-sm text-slate-500">{t("auth.registerSubtitle")}</p>
            </div>

            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              <div className="space-y-1.5">
                <Label>{t("auth.role")}</Label>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => setValue("role", "student")}
                    className={cn(
                      "flex flex-col items-center gap-2 rounded-xl border-2 p-4 transition-all",
                      role === "student" ? "border-blue-500 bg-blue-50" : "border-slate-200 hover:border-slate-300"
                    )}
                  >
                    <GraduationCap className={cn("h-6 w-6", role === "student" ? "text-blue-500" : "text-slate-400")} />
                    <span className={cn("text-sm font-medium", role === "student" ? "text-blue-600" : "text-slate-600")}>{t("auth.roleStudent")}</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setValue("role", "teacher")}
                    className={cn(
                      "flex flex-col items-center gap-2 rounded-xl border-2 p-4 transition-all",
                      role === "teacher" ? "border-blue-500 bg-blue-50" : "border-slate-200 hover:border-slate-300"
                    )}
                  >
                    <PenLine className={cn("h-6 w-6", role === "teacher" ? "text-blue-500" : "text-slate-400")} />
                    <span className={cn("text-sm font-medium", role === "teacher" ? "text-blue-600" : "text-slate-600")}>{t("auth.roleTeacher")}</span>
                  </button>
                </div>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="full_name">{t("auth.fullName")}</Label>
                <Input id="full_name" placeholder="Алихан Сейтов" {...register("full_name")} />
                {errors.full_name && <p className="text-xs text-red-500">{errors.full_name.message}</p>}
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="email">{t("auth.email")}</Label>
                <Input id="email" type="email" placeholder="name@example.com" {...register("email")} />
                {errors.email && <p className="text-xs text-red-500">{errors.email.message}</p>}
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="password">{t("auth.password")}</Label>
                <Input id="password" type="password" placeholder="••••••••" {...register("password")} />
                {errors.password && <p className="text-xs text-red-500">{errors.password.message}</p>}
              </div>

              {error && (
                <div className="rounded-lg bg-red-50 border border-red-100 px-3 py-2 text-sm text-red-600">{error}</div>
              )}

              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : t("auth.registerBtn")}
              </Button>
            </form>

            <p className="mt-6 text-center text-sm text-slate-500">
              {t("auth.hasAccount")}{" "}
              <Link href="/login" className="text-blue-500 hover:underline font-medium">{t("auth.loginBtn")}</Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
