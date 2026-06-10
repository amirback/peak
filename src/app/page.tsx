import Link from "next/link";
import { BookOpen, TrendingUp, MessageSquare, Award, ArrowRight, CheckCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { getTranslations } from "next-intl/server";
import { LanguageSwitcher } from "@/components/layout/LanguageSwitcher";

export default async function LandingPage() {
  const t = await getTranslations();

  return (
    <div className="min-h-screen bg-white">
      {/* Header */}
      <header className="border-b border-slate-100">
        <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
          <div className="flex h-16 items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-500">
                <BookOpen className="h-4 w-4 text-white" />
              </div>
              <span className="text-lg font-semibold text-slate-800">Peak</span>
            </div>
            <div className="flex items-center gap-3">
              <LanguageSwitcher />
              <Link href="/login"><Button variant="ghost" size="sm">{t("nav.login")}</Button></Link>
              <Link href="/register"><Button size="sm">{t("nav.register")}</Button></Link>
            </div>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="pt-20 pb-24 px-4">
        <div className="mx-auto max-w-4xl text-center">
          <div className="inline-flex items-center gap-2 rounded-full border border-blue-100 bg-blue-50 px-3 py-1 text-xs text-blue-600 font-medium mb-8">
            <span className="h-1.5 w-1.5 rounded-full bg-blue-500"></span>
            Образование в Казахстане
          </div>
          <h1 className="text-5xl sm:text-6xl font-bold text-slate-800 leading-tight tracking-tight mb-6">
            {t("landing.heroTitle")}
          </h1>
          <p className="text-xl text-slate-500 max-w-2xl mx-auto leading-relaxed mb-10">
            {t("landing.heroSubtitle")}
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Link href="/register">
              <Button size="lg" className="gap-2 px-8">
                {t("landing.getStarted")}
                <ArrowRight className="h-4 w-4" />
              </Button>
            </Link>
            <Link href="/courses">
              <Button variant="outline" size="lg" className="px-8">{t("landing.learnMore")}</Button>
            </Link>
          </div>

          {/* Stats */}
          <div className="flex flex-wrap items-center justify-center gap-8 mt-16">
            {[
              { value: "2,400+", label: t("landing.statsStudents") },
              { value: "120+", label: t("landing.statsCourses") },
              { value: "48+", label: t("landing.statsTeachers") },
            ].map(stat => (
              <div key={stat.label} className="text-center">
                <p className="text-3xl font-bold text-slate-800">{stat.value}</p>
                <p className="text-sm text-slate-500 mt-0.5">{stat.label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="py-20 bg-slate-50">
        <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-14">
            <h2 className="text-3xl font-bold text-slate-800">{t("landing.featuresTitle")}</h2>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {[
              { icon: BookOpen, title: t("landing.feature1Title"), desc: t("landing.feature1Desc"), color: "bg-blue-50 text-blue-500" },
              { icon: TrendingUp, title: t("landing.feature2Title"), desc: t("landing.feature2Desc"), color: "bg-emerald-50 text-emerald-500" },
              { icon: Award, title: t("landing.feature3Title"), desc: t("landing.feature3Desc"), color: "bg-amber-50 text-amber-500" },
              { icon: MessageSquare, title: t("landing.feature4Title"), desc: t("landing.feature4Desc"), color: "bg-purple-50 text-purple-500" },
            ].map(feature => (
              <div key={feature.title} className="bg-white rounded-2xl border border-slate-200 p-6">
                <div className={`inline-flex h-10 w-10 items-center justify-center rounded-xl ${feature.color} mb-4`}>
                  <feature.icon className="h-5 w-5" />
                </div>
                <h3 className="font-semibold text-slate-800 mb-2">{feature.title}</h3>
                <p className="text-sm text-slate-500 leading-relaxed">{feature.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Why Peak */}
      <section className="py-20">
        <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
          <div className="grid lg:grid-cols-2 gap-16 items-center">
            <div>
              <h2 className="text-3xl font-bold text-slate-800 mb-6">Платформа, которая действительно работает</h2>
              <div className="space-y-4">
                {[
                  "Автоматический трекинг прогресса в реальном времени",
                  "Тесты с мгновенной проверкой и баллами",
                  "Чат учитель–ученик без задержек",
                  "Сертификаты при завершении курса",
                  "XP, уровни и бейджи за каждый шаг",
                  "Аналитика для преподавателя: кто что прошёл",
                ].map(item => (
                  <div key={item} className="flex items-start gap-3">
                    <CheckCircle className="h-5 w-5 text-emerald-500 shrink-0 mt-0.5" />
                    <p className="text-slate-700">{item}</p>
                  </div>
                ))}
              </div>
            </div>
            <div className="bg-slate-50 rounded-2xl border border-slate-200 p-8">
              <div className="space-y-4">
                <div className="bg-white rounded-xl border border-slate-200 p-4">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="h-8 w-8 rounded-full bg-blue-100 flex items-center justify-center text-xs font-bold text-blue-600">АС</div>
                    <div>
                      <p className="text-sm font-medium text-slate-800">Айгерим Сейткали</p>
                      <p className="text-xs text-slate-500">Курс: Алгебра 9 класс</p>
                    </div>
                    <div className="ml-auto text-right">
                      <p className="text-sm font-bold text-slate-800">87%</p>
                      <p className="text-xs text-emerald-600">прогресс</p>
                    </div>
                  </div>
                  <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                    <div className="h-full bg-gradient-to-r from-blue-500 to-emerald-400 rounded-full" style={{ width: "87%" }}></div>
                  </div>
                </div>
                <div className="bg-white rounded-xl border border-slate-200 p-4">
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-sm font-medium text-slate-800">Тест: Уравнения</p>
                    <span className="text-xs font-bold text-emerald-600 bg-emerald-50 rounded-full px-2 py-0.5">95/100</span>
                  </div>
                  <p className="text-xs text-slate-500">Пройден 2 часа назад</p>
                </div>
                <div className="bg-blue-500 rounded-xl p-4 text-white">
                  <div className="flex items-center gap-2 mb-1">
                    <Award className="h-4 w-4" />
                    <p className="text-sm font-semibold">Новый бейдж!</p>
                  </div>
                  <p className="text-xs text-blue-100">«Идеальный тест» — 100% за 3 теста подряд</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-20 bg-slate-800">
        <div className="mx-auto max-w-3xl px-4 text-center">
          <h2 className="text-3xl font-bold text-white mb-4">Начните прямо сейчас</h2>
          <p className="text-slate-400 mb-8">Бесплатная регистрация. Никаких скрытых платежей.</p>
          <Link href="/register">
            <Button size="lg" className="gap-2 bg-blue-500 hover:bg-blue-400 px-10">
              Создать аккаунт
              <ArrowRight className="h-4 w-4" />
            </Button>
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-slate-200 py-8">
        <div className="mx-auto max-w-6xl px-4 text-center">
          <div className="flex items-center justify-center gap-2 mb-3">
            <div className="flex h-6 w-6 items-center justify-center rounded-md bg-blue-500">
              <BookOpen className="h-3 w-3 text-white" />
            </div>
            <span className="font-semibold text-slate-800">Peak</span>
          </div>
          <p className="text-sm text-slate-500">© 2024 Peak. Казахстан</p>
        </div>
      </footer>
    </div>
  );
}
