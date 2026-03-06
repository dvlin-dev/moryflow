export type AuthMode = 'login' | 'register';

export type AuthFormValues = {
  name?: string;
  email: string;
  password: string;
};
