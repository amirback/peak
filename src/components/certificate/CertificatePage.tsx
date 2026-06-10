"use client";
import { useTranslations } from "next-intl";
import { BookOpen, Award, Download, Printer } from "lucide-react";
import { Button } from "@/components/ui/button";
import { formatDate } from "@/lib/utils";

interface Props { certificate: any; }

export function CertificatePage({ certificate }: Props) {
  const t = useTranslations();

  const handlePrint = () => window.print();

  const handleDownload = () => {
    window.print();
  };

  return (
    <div className="min-h-screen bg-slate-100 flex flex-col items-center justify-center p-8">
      {/* Buttons (hidden on print) */}
      <div className="flex gap-3 mb-8 print:hidden">
        <Button variant="outline" onClick={handlePrint} className="gap-2">
          <Printer className="h-4 w-4" />
          {t("certificate.print")}
        </Button>
        <Button onClick={handleDownload} className="gap-2">
          <Download className="h-4 w-4" />
          {t("certificate.download")}
        </Button>
      </div>

      {/* Certificate */}
      <div
        id="certificate"
        className="bg-white w-full max-w-3xl rounded-2xl overflow-hidden print:rounded-none print:shadow-none"
        style={{ boxShadow: "0 20px 60px rgba(0,0,0,0.1)" }}
      >
        {/* Top accent */}
        <div className="h-3 bg-gradient-to-r from-blue-500 via-blue-400 to-emerald-400" />

        <div className="p-12 text-center">
          {/* Logo */}
          <div className="flex items-center justify-center gap-2 mb-8">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-500">
              <BookOpen className="h-5 w-5 text-white" />
            </div>
            <span className="text-2xl font-bold text-slate-800">{t("certificate.platform")}</span>
          </div>

          {/* Award Icon */}
          <div className="flex justify-center mb-6">
            <div className="h-20 w-20 rounded-full bg-amber-50 border-4 border-amber-200 flex items-center justify-center">
              <Award className="h-10 w-10 text-amber-500" />
            </div>
          </div>

          {/* Title */}
          <p className="text-sm font-semibold uppercase tracking-[0.3em] text-slate-400 mb-2">{t("certificate.title")}</p>

          <div className="my-6 border-t border-slate-100" />

          <p className="text-sm text-slate-500 mb-3">{t("certificate.subtitle")}</p>
          <h1 className="text-4xl font-bold text-slate-800 mb-3">{certificate.student?.full_name}</h1>
          <p className="text-sm text-slate-500 mb-2">{t("certificate.completed")}</p>
          <h2 className="text-2xl font-semibold text-blue-600 mb-6">«{certificate.course?.title}»</h2>

          <div className="my-6 border-t border-slate-100" />

          <div className="flex items-center justify-center gap-8 mt-6">
            <div className="text-center">
              <div className="h-px w-32 bg-slate-300 mb-2" />
              <p className="text-xs text-slate-400">{certificate.course?.teacher?.full_name}</p>
              <p className="text-xs text-slate-400">Преподаватель</p>
            </div>
            <div className="text-center">
              <div className="h-px w-32 bg-slate-300 mb-2" />
              <p className="text-xs text-slate-400">{formatDate(certificate.issued_at)}</p>
              <p className="text-xs text-slate-400">Дата выдачи</p>
            </div>
          </div>

          {/* Certificate ID */}
          <p className="mt-8 text-[10px] text-slate-300">ID: {certificate.id}</p>
        </div>

        {/* Bottom accent */}
        <div className="h-1.5 bg-gradient-to-r from-blue-500 via-blue-400 to-emerald-400" />
      </div>

      <style jsx global>{`
        @media print {
          body { background: white; }
          .print\\:hidden { display: none !important; }
        }
      `}</style>
    </div>
  );
}
