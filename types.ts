export enum Gender {
  MALE = 'Male',
  FEMALE = 'Female',
  NON_BINARY = 'Non-binary'
}

export interface AccountFormData {
  email: string;
  password: string;
  birthYear: string;
  birthMonth: string;
  birthDay: string;
  gender: Gender;
}

export interface LogEntry {
  id: string;
  timestamp: string;
  message: string;
  type: 'info' | 'success' | 'error' | 'warning' | 'network';
}

export interface CreatedAccount {
  email: string;
  pass: string;
  birth: string;
  gender: string;
  country: string;
}

export interface ProxyConfig {
  raw: string;
  parsed: string[];
}