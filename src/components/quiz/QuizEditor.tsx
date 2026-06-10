"use client";
import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import { useTranslations } from "next-intl";
import { Plus, Trash2, HelpCircle, Save, Loader2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";

interface Props { lessonId: string; existingQuiz: any; }

export function QuizEditor({ lessonId, existingQuiz }: Props) {
  const t = useTranslations();
  const { toast } = useToast();
  const [quiz, setQuiz] = useState(existingQuiz);
  const [questions, setQuestions] = useState<any[]>(existingQuiz?.questions || []);
  const [saving, setSaving] = useState(false);
  const [quizTitle, setQuizTitle] = useState(existingQuiz?.title || "Тест к уроку");

  const addQuestion = () => {
    setQuestions(prev => [...prev, {
      _tempId: Date.now().toString(), question: "", type: "single",
      options: ["", ""], correct_answer: "", order_index: prev.length,
    }]);
  };

  const updateQuestion = (idx: number, field: string, value: any) => {
    setQuestions(prev => prev.map((q, i) => i === idx ? { ...q, [field]: value } : q));
  };

  const removeQuestion = (idx: number) => {
    setQuestions(prev => prev.filter((_, i) => i !== idx));
  };

  const addOption = (idx: number) => {
    setQuestions(prev => prev.map((q, i) => i === idx ? { ...q, options: [...(q.options || []), ""] } : q));
  };

  const updateOption = (qIdx: number, optIdx: number, value: string) => {
    setQuestions(prev => prev.map((q, i) => i === qIdx ? {
      ...q, options: (q.options || []).map((o: string, oi: number) => oi === optIdx ? value : o)
    } : q));
  };

  const removeOption = (qIdx: number, optIdx: number) => {
    setQuestions(prev => prev.map((q, i) => i === qIdx ? { ...q, options: (q.options || []).filter((_: any, oi: number) => oi !== optIdx) } : q));
  };

  const handleSave = async () => {
    setSaving(true);
    const supabase = createClient();

    let quizId = quiz?.id;
    if (!quizId) {
      const { data } = await supabase.from("quizzes").insert({ lesson_id: lessonId, title: quizTitle }).select().single();
      quizId = data?.id;
      setQuiz(data);
    } else {
      await supabase.from("quizzes").update({ title: quizTitle }).eq("id", quizId);
    }

    if (!quizId) { setSaving(false); return; }

    // Delete old questions and re-insert
    await supabase.from("quiz_questions").delete().eq("quiz_id", quizId);

    for (let i = 0; i < questions.length; i++) {
      const q = questions[i];
      await supabase.from("quiz_questions").insert({
        quiz_id: quizId, question: q.question, type: q.type,
        options: q.type !== "open" ? (q.options || []).filter((o: string) => o.trim()) : null,
        correct_answer: q.type === "open" ? null : q.correct_answer,
        order_index: i,
      });
    }

    toast({ title: "Тест сохранён!" });
    setSaving(false);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <HelpCircle className="h-4 w-4 text-amber-500" />
          <h3 className="font-semibold text-slate-800 text-sm">{t("quiz.title")}</h3>
        </div>
        <Button size="sm" onClick={handleSave} disabled={saving || questions.length === 0} className="gap-1.5">
          {saving ? <Loader2 className="h-3 w-3 animate-spin" /> : <Save className="h-3 w-3" />}
          Сохранить тест
        </Button>
      </div>

      <div className="space-y-1.5">
        <Label className="text-xs">Название теста</Label>
        <Input value={quizTitle} onChange={e => setQuizTitle(e.target.value)} className="h-8 text-sm" />
      </div>

      <div className="space-y-3">
        {questions.map((q, qIdx) => (
          <div key={q.id || q._tempId} className="border border-slate-200 rounded-lg p-4 space-y-3 bg-slate-50">
            <div className="flex items-start gap-2">
              <div className="flex-1 space-y-2">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-medium text-slate-500 shrink-0">#{qIdx + 1}</span>
                  <Input
                    value={q.question}
                    onChange={e => updateQuestion(qIdx, "question", e.target.value)}
                    placeholder={t("quiz.question")}
                    className="h-8 text-sm"
                  />
                  <Select value={q.type} onValueChange={v => updateQuestion(qIdx, "type", v)}>
                    <SelectTrigger className="w-40 h-8 text-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="single">{t("quiz.single")}</SelectItem>
                      <SelectItem value="multiple">{t("quiz.multiple")}</SelectItem>
                      <SelectItem value="open">{t("quiz.open")}</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {q.type !== "open" && (
                  <div className="space-y-1.5">
                    {(q.options || []).map((opt: string, optIdx: number) => (
                      <div key={optIdx} className="flex items-center gap-2">
                        <input
                          type={q.type === "single" ? "radio" : "checkbox"}
                          name={`q-${qIdx}-correct`}
                          checked={q.type === "single" ? q.correct_answer === opt : (q.correct_answer || []).includes(opt)}
                          onChange={() => {
                            if (q.type === "single") {
                              updateQuestion(qIdx, "correct_answer", opt);
                            } else {
                              const current = q.correct_answer || [];
                              updateQuestion(qIdx, "correct_answer", current.includes(opt) ? current.filter((c: string) => c !== opt) : [...current, opt]);
                            }
                          }}
                          className="accent-blue-500"
                        />
                        <Input
                          value={opt}
                          onChange={e => updateOption(qIdx, optIdx, e.target.value)}
                          placeholder={`Вариант ${optIdx + 1}`}
                          className="h-7 text-sm flex-1"
                        />
                        {(q.options || []).length > 2 && (
                          <button onClick={() => removeOption(qIdx, optIdx)}><X className="h-3.5 w-3.5 text-slate-400 hover:text-red-500" /></button>
                        )}
                      </div>
                    ))}
                    <button onClick={() => addOption(qIdx)} className="text-xs text-blue-500 hover:text-blue-600 flex items-center gap-1">
                      <Plus className="h-3 w-3" />Добавить вариант
                    </button>
                    <p className="text-xs text-slate-400">{q.type === "single" ? "Отметьте правильный вариант" : "Отметьте все правильные"}</p>
                  </div>
                )}

                {q.type === "open" && (
                  <p className="text-xs text-slate-400 italic">Открытый вопрос — проверяется учителем вручную</p>
                )}
              </div>
              <button onClick={() => removeQuestion(qIdx)} className="text-slate-400 hover:text-red-500 mt-1">
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>
        ))}
      </div>

      <Button variant="outline" size="sm" onClick={addQuestion} className="gap-1.5 text-xs">
        <Plus className="h-3 w-3" />
        {t("quiz.addQuestion")}
      </Button>
    </div>
  );
}
