"use client";
import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import { useTranslations } from "next-intl";
import Link from "next/link";
import { Plus, Edit, Users, BookOpen, Trash2, Eye, EyeOff, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";

interface Props { userId: string; }

export function TeacherCoursesPage({ userId }: Props) {
  const t = useTranslations();
  const { toast } = useToast();
  const [courses, setCourses] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [creating, setCreating] = useState(false);
  const [coverFile, setCoverFile] = useState<File | null>(null);
  const [form, setForm] = useState({ title: "", description: "" });

  const fetchCourses = async () => {
    const supabase = createClient();
    const { data } = await supabase
      .from("courses")
      .select("*, lessons(id), enrollments(id)")
      .eq("teacher_id", userId)
      .order("created_at", { ascending: false });
    setCourses((data || []).map((c: any) => ({ ...c, lessonCount: c.lessons?.length || 0, studentCount: c.enrollments?.length || 0 })));
    setLoading(false);
  };

  useEffect(() => { fetchCourses(); }, []);

  const handleCreate = async () => {
    if (!form.title.trim()) return;
    setCreating(true);
    const supabase = createClient();
    let cover_url = null;

    if (coverFile) {
      const ext = coverFile.name.split(".").pop();
      const path = `${userId}/${Date.now()}.${ext}`;
      const { data: uploadData } = await supabase.storage.from("course-covers").upload(path, coverFile);
      if (uploadData) {
        const { data: { publicUrl } } = supabase.storage.from("course-covers").getPublicUrl(path);
        cover_url = publicUrl;
      }
    }

    const { data, error } = await supabase.from("courses").insert({
      teacher_id: userId, title: form.title.trim(), description: form.description.trim(), cover_url,
    }).select().single();

    if (!error && data) {
      toast({ title: "Курс создан!" });
      setShowCreateDialog(false);
      setForm({ title: "", description: "" });
      setCoverFile(null);
      fetchCourses();
    }
    setCreating(false);
  };

  const handleTogglePublish = async (courseId: string, current: boolean) => {
    const supabase = createClient();
    await supabase.from("courses").update({ is_published: !current }).eq("id", courseId);

    if (!current) {
      const { data: course } = await supabase.from("courses").select("title").eq("id", courseId).single();
      const { data: enrollments } = await supabase.from("enrollments").select("student_id").eq("course_id", courseId);
      if (enrollments) {
        for (const enrollment of enrollments) {
          await supabase.from("notifications").insert({ user_id: enrollment.student_id, type: "new_lesson", content: `Курс «${course?.title}» обновлён`, link: `/courses/${courseId}` });
        }
      }
    }
    fetchCourses();
    toast({ title: !current ? "Курс опубликован!" : "Курс снят с публикации" });
  };

  const handleDelete = async (courseId: string) => {
    if (!confirm(t("courses.deleteConfirm"))) return;
    const supabase = createClient();
    await supabase.from("courses").delete().eq("id", courseId);
    fetchCourses();
    toast({ title: "Курс удалён" });
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">{t("courses.myCourses")}</h1>
          <p className="text-slate-500 mt-1 text-sm">{courses.length} курсов</p>
        </div>
        <Button onClick={() => setShowCreateDialog(true)} className="gap-2">
          <Plus className="h-4 w-4" />
          {t("courses.newCourse")}
        </Button>
      </div>

      {loading ? (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3].map(i => <div key={i} className="h-52 bg-slate-100 rounded-xl animate-pulse" />)}
        </div>
      ) : courses.length === 0 ? (
        <Card>
          <CardContent className="py-16 text-center">
            <BookOpen className="h-12 w-12 text-slate-200 mx-auto mb-4" />
            <p className="text-slate-500 mb-4">{t("courses.noCourses")}</p>
            <Button onClick={() => setShowCreateDialog(true)} className="gap-2"><Plus className="h-4 w-4" />{t("courses.newCourse")}</Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {courses.map(course => (
            <Card key={course.id} className="overflow-hidden">
              {course.cover_url ? (
                <div className="h-32 overflow-hidden"><img src={course.cover_url} alt={course.title} className="w-full h-full object-cover" /></div>
              ) : (
                <div className="h-32 bg-gradient-to-br from-blue-50 to-emerald-50 flex items-center justify-center"><BookOpen className="h-8 w-8 text-blue-300" /></div>
              )}
              <CardContent className="p-4 space-y-3">
                <div className="flex items-start justify-between gap-2">
                  <h3 className="font-semibold text-slate-800 text-sm line-clamp-2 flex-1">{course.title}</h3>
                  <Badge variant={course.is_published ? "mint" : "secondary"} className="shrink-0 text-xs">
                    {course.is_published ? t("courses.published") : t("courses.draft")}
                  </Badge>
                </div>

                <div className="flex items-center gap-3 text-xs text-slate-500">
                  <span className="flex items-center gap-1"><BookOpen className="h-3 w-3" />{course.lessonCount}</span>
                  <span className="flex items-center gap-1"><Users className="h-3 w-3" />{course.studentCount}</span>
                </div>

                <div className="flex gap-1.5">
                  <Link href={`/teacher/courses/${course.id}/edit`} className="flex-1">
                    <Button variant="outline" size="sm" className="w-full gap-1 text-xs"><Edit className="h-3 w-3" />{t("common.edit")}</Button>
                  </Link>
                  <Link href={`/teacher/courses/${course.id}/students`}>
                    <Button variant="ghost" size="sm" className="gap-1 text-xs px-2"><Users className="h-3 w-3" /></Button>
                  </Link>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="gap-1 text-xs px-2"
                    onClick={() => handleTogglePublish(course.id, course.is_published)}
                  >
                    {course.is_published ? <EyeOff className="h-3 w-3" /> : <Eye className="h-3 w-3" />}
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="gap-1 text-xs px-2 text-red-500 hover:text-red-600 hover:bg-red-50"
                    onClick={() => handleDelete(course.id)}
                  >
                    <Trash2 className="h-3 w-3" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{t("courses.newCourse")}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label>{t("courses.courseTitle")}</Label>
              <Input placeholder="Алгебра 9 класс" value={form.title} onChange={e => setForm(p => ({ ...p, title: e.target.value }))} />
            </div>
            <div className="space-y-1.5">
              <Label>{t("courses.courseDesc")}</Label>
              <Textarea placeholder="Описание курса..." value={form.description} onChange={e => setForm(p => ({ ...p, description: e.target.value }))} rows={3} />
            </div>
            <div className="space-y-1.5">
              <Label>{t("courses.courseCover")}</Label>
              <input
                type="file"
                accept="image/*"
                onChange={e => setCoverFile(e.target.files?.[0] || null)}
                className="block w-full text-sm text-slate-500 file:mr-3 file:py-1.5 file:px-3 file:rounded-lg file:border file:border-slate-200 file:text-xs file:font-medium file:bg-white hover:file:bg-slate-50"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCreateDialog(false)}>{t("common.cancel")}</Button>
            <Button onClick={handleCreate} disabled={creating || !form.title.trim()}>
              {creating ? <Loader2 className="h-4 w-4 animate-spin" /> : t("courses.saveCourse")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
