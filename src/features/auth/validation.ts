import { z } from "zod";

export const usernameSchema = z
  .string()
  .trim()
  .min(2, "auth.errors.usernameShort")
  .max(32, "auth.errors.usernameLong")
  .regex(/^[a-zA-Z0-9_.]+$/, "auth.errors.usernameChars");

export const signInSchema = z.object({
  email: z.string().trim().email("auth.errors.emailInvalid"),
  password: z.string().min(1, "auth.errors.passwordRequired"),
});

export const signUpSchema = z.object({
  email: z.string().trim().email("auth.errors.emailInvalid"),
  username: usernameSchema,
  displayName: z
    .string()
    .trim()
    .min(1, "auth.errors.nameRequired")
    .max(64, "auth.errors.nameLong"),
  password: z
    .string()
    .min(8, "auth.errors.passwordShort")
    .max(72, "auth.errors.passwordLong"),
});

export type SignInValues = z.infer<typeof signInSchema>;
export type SignUpValues = z.infer<typeof signUpSchema>;
