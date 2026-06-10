"use client";
import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import { useTranslations } from "next-intl";
import Link from "next/link";
import {
  DndContext, closestCenter, KeyboardSensor, PointerSensor, useSensor, useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  arrayMove, SortableContext, sortableKeyboardCoordinates, verticalListSortingStrategy, useSortable,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { Plus, GripVertical, Edit, Trash2, ChevronDown, ChevronUp, Eye, EyeOff, Save, Loader2, ArrowLeft, FileText, Video, HelpCircle, Upload, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { RichTextEditor } from "@/components/lessons/RichTextEditor";
import { QuizEditor } from "@/components/quiz/QuizEditor";

interface SortableLessonProps {
  lesson: any;
  onEdit: () => void;
  onDelete: () => void;
}

function SortableLesson({ lesson, onEdit, onDelete }: SortableLessonProps) {
  const { attributes, listeners, setNodeRef, transform, transition } = useSortable({ id: lesson.id });
  const style = { transform: CSS.Transform.toString(transform), transition };
  const t = useTranslations();

  return (
    <div ref={setNodeRef} style={style} className="flex items-center gap-3 p-3 bg-white rounded-lg border border-slate-200 hover:border-blue-200 transition-colors">
      <button {...attributes} {...listeners} className="text-slate-300 hover:text-slate-500 cursor-grab active:cursor-grabbing">
        <GripVertical className="h-4 w-4" />
      </button>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-slate-800 truncate">{lesson.title}</p>
        <div className="flex items-center gap-2 mt-0.5">
          {lesson.content && <span className="text-[10px] text-slate-400 flex items-center gap-0.5"><FileText className="h-2.5 w-2.5" />Текст</span>}
          {lesson.video_url && <span className="text-[10px] text-slate-400 flex items-center gap-0.5"><Video className="h-2.5 w-2.5" />Видео</span>}
          {lesson.quiz && <span className="text-[10px] text-slate-400 flex items-center gap-0.5"><HelpCircle className="h-2.5 w-2.5" />Тест</span>}
          {lesson.materials?.length > 0 && <span className="text-[10px] text-slate-400">{lesson.materials.length} файлов</span>}
        </div>
      </div>
      <div className="flex gap-1">
        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={onEdit}><Edit className="h-3.5 w-3.5" /></Button>
        <Button variant="ghost" size="icon" className="h-7 w-7 text-red-400 hover:text-red-600 hover:bg-red-50" onClick={onDelete}><Trash2 className="h-3.5 w-3.5" /></Button>
      </div>
    </div>
  );
}

interface Props { course: any; userId: string; }

export function CourseEditor({ course: initialCourse, userId }: Props) {
  const t = useTranslations();
  const { toast } = useToast();
  const [course, setCourse] = useState(initialCourse);
  const [lessons, setLessons] = useState<any[]>([...(initialCourse.lessons || [])].sort((a, b) => a.order_index - b.order_index));
  const [editingLesson, setEditingLesson] = useState<any | null>(null);
  const [lessonDialogOpen, setLessonDialogOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [quizDialogOpen, setQuizDialogOpen] = useState(false);
  const [quizLessonId, setQuizLessonId] = useState<string | null>(null);
  const [materialFiles, setMaterialFiles] = useState<File[]>([]);
  const [courseForm, setCourseForm] = useState({ title: course.title, description: course.description, is_published: course.is_published });
  const [coverFile, setCoverFile] = useState<File | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const oldIdx = lessons.findIndex(l => l.id === active.id);
    const newIdx = lessons.findIndex(l => l.id === over.id);
    const newLessons = arrayMove(lessons, oldIdx, newIdx).map((l, i) => ({ ...l, order_index: i }));
    setLessons(newLessons);
    const supabase = createClient();
    await Promise.all(newLessons.map(l => supabase.from("lessons").update({ order_index: l.order_index }).eq("id", l.id)));
  };

  const handleSaveCourse = async () => {
    setSaving(true);
    const supabase = createClient();
    let cover_url = course.cover_url;

    if (coverFile) {
      const ext = coverFile.name.split(".").pop();
      const path = `${userId}/${Date.now()}.${ext}`;
      const { data } = await supabase.storage.from("course-covers").upload(path, coverFile);
      if (data) {
        const { data: { publicUrl } } = supabase.storage.from("course-covers").getPublicUrl(path);
        cover_url = publicUrl;
      }
    }

    const { data } = await supabase.from("courses").update({
      title: courseForm.title,
      description: courseForm.description,
      is_published: courseForm.is_published,
      cover_url,
    }).eq("id", course.id).select().single();

    if (data) {
      setCourse({ ...course, ...data });
      toast({ title: "Курс сохранён!" });
    }
    setSaving(false);
  };

  const handleSaveLesson = async () => {
    if (!editingLesson?.title?.trim()) return;
    setSaving(true);
    const supabase = createClient();
    let videoUrl = editingLesson.video_url;

    // Upload video file if it's a file object
    if (editingLesson._videoFile) {
      const ext = editingLesson._videoFile.name.split(".").pop();
      const path = `${userId}/${course.id}/${Date.now()}.${ext}`;
      const { data } = await supabase.storage.from("lesson-videos").upload(path, editingLesson._videoFile);
      if (data) {
        const { data: { publicUrl } } = supabase.storage.from("lesson-videos").getPublicUrl(path);
        videoUrl = publicUrl;
      }
    }

    const lessonData = {
      course_id: course.id, title: editingLesson.title,
      content: editingLesson.content || null,
      video_url: videoUrl || null,
      order_index: editingLesson.id ? editingLesson.order_index : lessons.length,
      deadline: editingLesson.deadline || null,
    };

    let savedLesson: any;
    if (editingLesson.id) {
      const { data } = await supabase.from("lessons").update(lessonData).eq("id", editingLesson.id).select("*, materials:lesson_materials(*), quiz:quizzes(*)").single();
      savedLesson = data;
      setLessons(prev => prev.map(l => l.id === savedLesson.id ? { ...l, ...savedLesson } : l));
    } else {
      const { data } = await supabase.from("lessons").insert(lessonData).select("*, materials:lesson_materials(*), quiz:quizzes(*)").single();
      savedLesson = data;
      setLessons(prev => [...prev, savedLesson]);
    }

    // Upload materials
    if (savedLesson && materialFiles.length > 0) {
      for (const file of materialFiles) {
        const ext = file.name.split(".").pop();
        const path = `${userId}/${savedLesson.id}/${Date.now()}.${ext}`;
        const { data: uploadData } = await supabase.storage.from("lesson-materials").upload(path, file);
        if (uploadData) {
          const { data: { publicUrl } } = supabase.storage.from("lesson-materials").getPublicUrl(path);
          await supabase.from("lesson_materials").insert({ lesson_id: savedLesson.id, file_url: publicUrl, file_name: file.name, file_type: file.type });
        }
      }
    }

    setMaterialFiles([]);
    setLessonDialogOpen(false);
    setEditingLesson(null);
    setSaving(false);
    toast({ title: "Урок сохранён!" });

    // Notify enrolled students about new lesson
    if (!editingLesson.id) {
      const { data: enrollments } = await supabase.from("enrollments").select("student_id").eq("course_id", course.id);
      if (enrollments) {
        for (const e of enrollments) {
          await supabase.from("notifications").insert({ user_id: e.student_id, type: "new_lesson", content: `Новый урок в курсе «${course.title}»: ${editingLesson.title}`, link: `/courses/${course.id}/lessons/${savedLesson.id}` });
        }
      }
    }
  };

  const handleDeleteLesson = async (lessonId: string) => {
    if (!confirm("Удалить урок?")) return;
    const supabase = createClient();
    await supabase.from("lessons").delete().eq("id", lessonId);
    setLessons(prev => prev.filter(l => l.id !== lessonId));
    toast({ title: "Урок удалён" });
  };

  const openNewLesson = () => {
    setEditingLesson({ title: "", content: "", video_url: "", deadline: "" });
    setMaterialFiles([]);
    setLessonDialogOpen(true);
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <div className="flex items-center gap-3">
        <Link href="/teacher/courses"><Button variant="ghost" size="sm" className="gap-1.5 text-slate-500"><ArrowLeft className="h-4 w-4" /></Button></Link>
        <div className="flex-1">
          <h1 className="text-xl font-bold text-slate-800">{t("courses.editCourse")}</h1>
          <p className="text-sm text-slate-500">{course.title}</p>
        </div>
        <Button onClick={handleSaveCourse} disabled={saving} className="gap-2">
          {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
          {t("courses.saveCourse")}
        </Button>
      </div>

      {/* Course Settings */}
      <Card>
        <CardContent className="p-6 space-y-4">
          <h2 className="font-semibold text-slate-800">Настройки курса</h2>
          <div className="grid sm:grid-cols-2 gap-4">
            <div className="space-y-1.5 sm:col-span-2">
              <Label>{t("courses.courseTitle")}</Label>
              <Input value={courseForm.title} onChange={e => setCourseForm(p => ({ ...p, title: e.target.value }))} />
            </div>
            <div className="space-y-1.5 sm:col-span-2">
              <Label>{t("courses.courseDesc")}</Label>
              <Textarea value={courseForm.description} onChange={e => setCourseForm(p => ({ ...p, description: e.target.value }))} rows={3} />
            </div>
            <div className="space-y-1.5">
              <Label>{t("courses.courseCover")}</Label>
              <input type="file" accept="image/*" onChange={e => setCoverFile(e.target.files?.[0] || null)}
                className="block w-full text-sm text-slate-500 file:mr-3 file:py-1.5 file:px-3 file:rounded-lg file:border file:border-slate-200 file:text-xs file:font-medium file:bg-white hover:file:bg-slate-50" />
              {course.cover_url && !coverFile && <img src={course.cover_url} alt="" className="h-16 rounded-lg object-cover mt-2" />}
            </div>
            <div className="flex items-center gap-3">
              <Switch checked={courseForm.is_published} onCheckedChange={v => setCourseForm(p => ({ ...p, is_published: v }))} />
              <Label>{courseForm.is_published ? t("courses.published") : t("courses.draft")}</Label>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Lessons */}
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold text-slate-800">Уроки ({lessons.length})</h2>
            <Button onClick={openNewLesson} size="sm" className="gap-1.5"><Plus className="h-4 w-4" />{t("lessons.addLesson")}</Button>
          </div>

          {lessons.length === 0 ? (
            <div className="py-8 text-center text-slate-400 text-sm">
              Уроков пока нет. Добавьте первый урок.
            </div>
          ) : (
            <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
              <SortableContext items={lessons.map(l => l.id)} strategy={verticalListSortingStrategy}>
                <div className="space-y-2">
                  {lessons.map(lesson => (
                    <SortableLesson
                      key={lesson.id}
                      lesson={lesson}
                      onEdit={() => {
                        setEditingLesson({ ...lesson, _videoFile: null });
                        setMaterialFiles([]);
                        setLessonDialogOpen(true);
                      }}
                      onDelete={() => handleDeleteLesson(lesson.id)}
                    />
                  ))}
                </div>
              </SortableContext>
            </DndContext>
          )}
        </CardContent>
      </Card>

      {/* Lesson Edit Dialog */}
      <Dialog open={lessonDialogOpen} onOpenChange={setLessonDialogOpen}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingLesson?.id ? t("lessons.editLesson") : t("lessons.addLesson")}</DialogTitle>
          </DialogHeader>

          {editingLesson && (
            <div className="space-y-4">
              <div className="space-y-1.5">
                <Label>{t("lessons.title")}</Label>
                <Input value={editingLesson.title || ""} onChange={e => setEditingLesson((p: any) => ({ ...p, title: e.target.value }))} placeholder="Название урока" />
              </div>

              <div className="space-y-1.5">
                <Label>{t("lessons.deadline")}</Label>
                <Input type="datetime-local" value={editingLesson.deadline ? new Date(editingLesson.deadline).toISOString().slice(0, 16) : ""} onChange={e => setEditingLesson((p: any) => ({ ...p, deadline: e.target.value || null }))} />
              </div>

              <div className="space-y-1.5">
                <Label>{t("lessons.content")}</Label>
                <RichTextEditor
                  content={editingLesson.content || ""}
                  onChange={html => setEditingLesson((p: any) => ({ ...p, content: html }))}
                />
              </div>

              <div className="space-y-1.5">
                <Label>{t("lessons.videoUrl")}</Label>
                <div className="space-y-2">
                  <Input
                    value={editingLesson.video_url && !editingLesson._videoFile ? editingLesson.video_url : ""}
                    onChange={e => setEditingLesson((p: any) => ({ ...p, video_url: e.target.value, _videoFile: null }))}
                    placeholder="https://youtube.com/watch?v=..."
                  />
                  <div className="flex items-center gap-2 text-xs text-slate-500">
                    <span>или</span>
                    <label className="flex items-center gap-1.5 cursor-pointer text-blue-500 hover:text-blue-600">
                      <Upload className="h-3 w-3" />
                      Загрузить видео
                      <input type="file" accept="video/*" className="hidden" onChange={e => {
                        const file = e.target.files?.[0];
                        if (file) setEditingLesson((p: any) => ({ ...p, _videoFile: file, video_url: "" }));
                      }} />
                    </label>
                    {editingLesson._videoFile && <span className="text-slate-600">{editingLesson._videoFile.name}</span>}
                  </div>
                </div>
              </div>

              <div className="space-y-1.5">
                <Label>{t("lessons.materials")}</Label>
                <label className="flex items-center gap-2 cursor-pointer border border-dashed border-slate-300 rounded-lg p-4 hover:bg-slate-50 transition-colors">
                  <Upload className="h-4 w-4 text-slate-400" />
                  <span className="text-sm text-slate-500">Добавить файлы (PDF, DOCX, изображения)</span>
                  <input type="file" multiple accept=".pdf,.doc,.docx,.png,.jpg,.jpeg,.gif" className="hidden" onChange={e => {
                    const files = Array.from(e.target.files || []);
                    setMaterialFiles(prev => [...prev, ...files]);
                  }} />
                </label>
                {materialFiles.length > 0 && (
                  <div className="space-y-1">
                    {materialFiles.map((f, i) => (
                      <div key={i} className="flex items-center justify-between text-xs bg-slate-50 rounded-lg px-3 py-2">
                        <span className="text-slate-700 truncate">{f.name}</span>
                        <button onClick={() => setMaterialFiles(prev => prev.filter((_, idx) => idx !== i))}><X className="h-3 w-3 text-slate-400 hover:text-slate-600" /></button>
                      </div>
                    ))}
                  </div>
                )}
                {editingLesson?.materials?.length > 0 && (
                  <div className="space-y-1">
                    <p className="text-xs text-slate-500 font-medium">Загруженные материалы:</p>
                    {editingLesson.materials.map((m: any) => (
                      <div key={m.id} className="flex items-center justify-between text-xs bg-slate-50 rounded-lg px-3 py-2">
                        <a href={m.file_url} target="_blank" className="text-blue-500 hover:underline truncate">{m.file_name}</a>
                        <button onClick={async () => {
                          const supabase = createClient();
                          await supabase.from("lesson_materials").delete().eq("id", m.id);
                          setEditingLesson((p: any) => ({ ...p, materials: p.materials.filter((mm: any) => mm.id !== m.id) }));
                        }}><X className="h-3 w-3 text-slate-400 hover:text-red-500" /></button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Quiz Editor */}
              {editingLesson?.id && (
                <div className="border-t border-slate-100 pt-4">
                  <QuizEditor lessonId={editingLesson.id} existingQuiz={editingLesson.quiz} />
                </div>
              )}
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setLessonDialogOpen(false)}>{t("common.cancel")}</Button>
            <Button onClick={handleSaveLesson} disabled={saving || !editingLesson?.title?.trim()}>
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : t("common.save")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
