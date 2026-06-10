import { createClient } from "@/lib/supabase/server";
import { notFound } from "next/navigation";
import { CertificatePage } from "@/components/certificate/CertificatePage";

export default async function Certificate({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  // id format: studentId-courseId
  const parts = id.split("-");
  if (parts.length < 10) notFound(); // UUIDs have multiple dashes

  // UUIDs are 36 chars each
  const studentId = parts.slice(0, 5).join("-");
  const courseId = parts.slice(5).join("-");

  const supabase = await createClient();
  const { data: certificate } = await supabase
    .from("certificates")
    .select("*, student:profiles!student_id(full_name, avatar_url), course:courses!course_id(title, teacher:profiles!teacher_id(full_name))")
    .eq("student_id", studentId)
    .eq("course_id", courseId)
    .single();

  if (!certificate) notFound();

  return <CertificatePage certificate={certificate} />;
}
