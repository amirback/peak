"use client";
import { useState } from "react";
import { useTranslations } from "next-intl";
import { CheckCircle, XCircle, Trophy, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Textarea } from "@/components/ui/textarea";
import { createClient } from "@/lib/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { calculateXP } from "@/lib/utils";
import type { QuizAttempt } from "@/types";

interface Props {
  quiz: any;
  userId: string;
  userRole: string;
  latestAttempt: QuizAttempt | null;
  onComplete?: (score: number) => void;
}

export function QuizSection({ quiz, userId, userRole, latestAttempt, onComplete }: Props) {
  const t = useTranslations();
  const { toast } = useToast();
  const [answers, setAnswers] = useState<Record<string, string | string[]>>({});
  const [submitted, setSubmitted] = useState(false);
  const [score, setScore] = useState<number | null>(null);
  const [showPrev, setShowPrev] = useState(!!latestAttempt);

  const questions = [...(quiz.questions || [])].sort((a: any, b: any) => a.order_index - b.order_index);

  const handleSingleAnswer = (questionId: string, value: string) => {
    setAnswers(prev => ({ ...prev, [questionId]: value }));
  };

  const handleMultipleAnswer = (questionId: string, value: string, checked: boolean) => {
    setAnswers(prev => {
      const current = (prev[questionId] as string[]) || [];
      return { ...prev, [questionId]: checked ? [...current, value] : current.filter(v => v !== value) };
    });
  };

  const handleSubmit = async () => {
    let correct = 0;
    let total = 0;

    questions.forEach((q: any) => {
      if (q.type === "open") return;
      total++;
      const userAnswer = answers[q.id];
      const correctAnswer = q.correct_answer;

      if (q.type === "single") {
        if (userAnswer === correctAnswer) correct++;
      } else if (q.type === "multiple") {
        const ua = [...(userAnswer as string[] || [])].sort();
        const ca = [...(correctAnswer as string[] || [])].sort();
        if (JSON.stringify(ua) === JSON.stringify(ca)) correct++;
      }
    });

    const calculatedScore = total > 0 ? Math.round((correct / total) * 100) : 100;
    setScore(calculatedScore);
    setSubmitted(true);

    const supabase = createClient();
    await supabase.from("quiz_attempts").insert({
      student_id: userId, quiz_id: quiz.id,
      score: calculatedScore,
      answers,
    });

    const xpGain = calculatedScore === 100 ? calculateXP("quiz_perfect") : calculateXP("quiz_pass");
    const { data: profile } = await supabase.from("profiles").select("xp").eq("id", userId).single();
    await supabase.from("profiles").update({ xp: (profile?.xp || 0) + xpGain }).eq("id", userId);

    toast({ title: `${t("quiz.score")}: ${calculatedScore}%`, description: `+${xpGain} XP` });
    onComplete?.(calculatedScore);
  };

  const resetQuiz = () => {
    setAnswers({});
    setSubmitted(false);
    setScore(null);
    setShowPrev(false);
  };

  if (showPrev && latestAttempt && !submitted) {
    return (
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-base">{quiz.title || t("quiz.title")}</CardTitle>
            <Badge variant={latestAttempt.score >= 80 ? "mint" : "warning"}>
              {latestAttempt.score}%
            </Badge>
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-3 text-sm text-slate-600 mb-4">
            {latestAttempt.score >= 80 ? (
              <><CheckCircle className="h-4 w-4 text-emerald-500" />{t("quiz.passed")}</>
            ) : (
              <><XCircle className="h-4 w-4 text-red-500" />{t("quiz.failed")}</>
            )}
          </div>
          <Button variant="outline" size="sm" className="gap-2" onClick={resetQuiz}>
            <RotateCcw className="h-3.5 w-3.5" />
            Пройти заново
          </Button>
        </CardContent>
      </Card>
    );
  }

  if (submitted && score !== null) {
    return (
      <Card>
        <CardContent className="p-6 text-center">
          <div className={`h-16 w-16 rounded-full flex items-center justify-center mx-auto mb-4 ${score >= 80 ? "bg-emerald-50" : "bg-red-50"}`}>
            {score >= 80 ? <Trophy className="h-8 w-8 text-emerald-500" /> : <XCircle className="h-8 w-8 text-red-500" />}
          </div>
          <h3 className="text-xl font-bold text-slate-800 mb-1">{score}%</h3>
          <p className="text-slate-500 mb-4">{score >= 80 ? t("quiz.passed") : t("quiz.failed")}</p>
          <Button variant="outline" size="sm" className="gap-2" onClick={resetQuiz}>
            <RotateCcw className="h-3.5 w-3.5" />
            Пройти заново
          </Button>
        </CardContent>
      </Card>
    );
  }

  if (userRole === "teacher") return null;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base flex items-center gap-2">
          <Trophy className="h-4 w-4 text-amber-500" />
          {quiz.title || t("quiz.title")}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {questions.map((q: any, idx: number) => (
          <div key={q.id} className="space-y-3">
            <p className="font-medium text-slate-800 text-sm">{idx + 1}. {q.question}</p>

            {q.type === "single" && q.options && (
              <div className="space-y-2">
                {q.options.map((opt: string) => (
                  <label key={opt} className="flex items-center gap-3 p-3 rounded-lg border border-slate-200 hover:bg-slate-50 cursor-pointer transition-colors">
                    <input
                      type="radio"
                      name={q.id}
                      value={opt}
                      checked={answers[q.id] === opt}
                      onChange={() => handleSingleAnswer(q.id, opt)}
                      className="accent-blue-500"
                    />
                    <span className="text-sm text-slate-700">{opt}</span>
                  </label>
                ))}
              </div>
            )}

            {q.type === "multiple" && q.options && (
              <div className="space-y-2">
                {q.options.map((opt: string) => (
                  <label key={opt} className="flex items-center gap-3 p-3 rounded-lg border border-slate-200 hover:bg-slate-50 cursor-pointer transition-colors">
                    <Checkbox
                      checked={((answers[q.id] as string[]) || []).includes(opt)}
                      onCheckedChange={(checked) => handleMultipleAnswer(q.id, opt, !!checked)}
                    />
                    <span className="text-sm text-slate-700">{opt}</span>
                  </label>
                ))}
              </div>
            )}

            {q.type === "open" && (
              <Textarea
                placeholder={t("quiz.writeAnswer")}
                value={(answers[q.id] as string) || ""}
                onChange={e => setAnswers(prev => ({ ...prev, [q.id]: e.target.value }))}
                rows={3}
              />
            )}
          </div>
        ))}

        <Button
          onClick={handleSubmit}
          className="w-full gap-2"
          disabled={questions.filter((q: any) => q.type !== "open").some((q: any) => !answers[q.id])}
        >
          <CheckCircle className="h-4 w-4" />
          {t("quiz.submit")}
        </Button>
      </CardContent>
    </Card>
  );
}
