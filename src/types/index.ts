export type UserRole = "student" | "teacher" | "admin";
export type LessonStatus = "not_started" | "in_progress" | "completed";
export type QuestionType = "single" | "multiple" | "open";
export type NotificationType =
  | "new_message"
  | "new_comment"
  | "new_lesson"
  | "badge_earned"
  | "deadline_reminder"
  | "course_completed"
  | "follow_request"
  | "follow_accepted";

export interface Profile {
  id: string;
  role: UserRole;
  full_name: string;
  username: string | null;
  avatar_url: string | null;
  locale: string;
  bio: string | null;
  xp: number;
  streak_count: number;
  last_active_date: string | null;
  created_at: string;
}

export type FollowStatus = "pending" | "accepted" | "declined";

export interface Follow {
  id: string;
  follower_id: string;
  following_id: string;
  status: FollowStatus;
  created_at: string;
  follower?: Profile;
  following?: Profile;
}

export interface Course {
  id: string;
  teacher_id: string;
  title: string;
  description: string;
  cover_url: string | null;
  is_published: boolean;
  created_at: string;
  teacher?: Profile;
  lessons?: Lesson[];
  enrollments?: Enrollment[];
  _count?: { enrollments: number; lessons: number };
}

export interface Lesson {
  id: string;
  course_id: string;
  title: string;
  content: string | null;
  video_url: string | null;
  order_index: number;
  deadline: string | null;
  created_at: string;
  materials?: LessonMaterial[];
  quiz?: Quiz;
  progress?: LessonProgress;
}

export interface LessonMaterial {
  id: string;
  lesson_id: string;
  file_url: string;
  file_name: string;
  file_type: string;
}

export interface Enrollment {
  id: string;
  student_id: string;
  course_id: string;
  enrolled_at: string;
  student?: Profile;
  course?: Course;
}

export interface LessonProgress {
  id: string;
  student_id: string;
  lesson_id: string;
  status: LessonStatus;
  time_spent_seconds: number;
  started_at: string | null;
  completed_at: string | null;
}

export interface Quiz {
  id: string;
  lesson_id: string;
  title: string;
  questions?: QuizQuestion[];
}

export interface QuizQuestion {
  id: string;
  quiz_id: string;
  question: string;
  type: QuestionType;
  options: string[] | null;
  correct_answer: string | string[] | null;
}

export interface QuizAttempt {
  id: string;
  student_id: string;
  quiz_id: string;
  score: number;
  answers: Record<string, string | string[]>;
  attempted_at: string;
}

export interface Message {
  id: string;
  sender_id: string;
  receiver_id: string;
  content: string;
  is_read: boolean;
  created_at: string;
  sender?: Profile;
  receiver?: Profile;
}

export interface Comment {
  id: string;
  lesson_id: string;
  user_id: string;
  content: string;
  created_at: string;
  user?: Profile;
}

export interface Notification {
  id: string;
  user_id: string;
  type: NotificationType;
  content: string;
  link: string | null;
  is_read: boolean;
  created_at: string;
}

export interface Badge {
  id: string;
  user_id: string;
  badge_type: string;
  earned_at: string;
}

export interface Certificate {
  id: string;
  student_id: string;
  course_id: string;
  issued_at: string;
  student?: Profile;
  course?: Course;
}

export interface StudentProgress {
  student: Profile;
  completedLessons: number;
  totalLessons: number;
  percentage: number;
  lastActivity: string | null;
  averageScore: number;
}
