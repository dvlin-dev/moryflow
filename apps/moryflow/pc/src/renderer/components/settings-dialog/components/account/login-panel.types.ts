export type AuthMode = 'login' | 'register' | 'forgot-password';

export type AuthFormValues = {
  name?: string;
  email: string;
  password: string;
};
