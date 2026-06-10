import { z } from "zod";

export const loginSchema = z.object({
  email: z.string().email("Введите корректный email"),
  password: z.string().min(6, "Минимум 6 символов"),
});

export const registerSchema = z.object({
  email: z.string().email("Введите корректный email"),
  password: z.string().min(6, "Минимум 6 символов"),
  full_name: z.string().min(2, "Минимум 2 символа"),
  role: z.enum(["student", "teacher"]),
});

export const resetPasswordSchema = z.object({
  email: z.string().email("Введите корректный email"),
});

export const profileSchema = z.object({
  full_name: z.string().min(2, "Минимум 2 символа"),
  bio: z.string().max(500, "Максимум 500 символов").optional(),
  locale: z.enum(["ru", "kz", "en"]),
});

export type LoginFormData = z.infer<typeof loginSchema>;
export type RegisterFormData = z.infer<typeof registerSchema>;
export type ResetPasswordFormData = z.infer<typeof resetPasswordSchema>;
export type ProfileFormData = z.infer<typeof profileSchema>;
