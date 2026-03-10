export type AuthMode = 'login' | 'register' | 'forgot-password';

export type AuthFormValues = {
  email: string;
  password?: string;
};
