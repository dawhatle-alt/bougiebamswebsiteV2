import * as zod from "zod";

export const AuthUser = zod.object({
  id: zod.string(),
  email: zod.string().nullable().optional(),
  firstName: zod.string().nullable().optional(),
  lastName: zod.string().nullable().optional(),
  profileImageUrl: zod.string().nullable().optional(),
});

export type AuthUser = zod.infer<typeof AuthUser>;

export const GetCurrentAuthUserResponse = zod.object({
  user: AuthUser.nullable(),
});

export const ExchangeMobileAuthorizationCodeBody = zod.object({
  code: zod.string(),
  code_verifier: zod.string(),
  redirect_uri: zod.string(),
  state: zod.string(),
  nonce: zod.string().optional(),
});

export const ExchangeMobileAuthorizationCodeResponse = zod.object({
  token: zod.string(),
});

export const LogoutMobileSessionResponse = zod.object({
  success: zod.boolean(),
});
