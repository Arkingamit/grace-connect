export const REGISTRATION_PASS_KEY = 'grace-registration-pass';

export type RegistrationPass = {
  userId: string;
  qrCode: string;
  firstName: string;
  middleName?: string;
  lastName: string;
  campusId: string;
  campusName: string;
  phone: string;
  whatsapp?: string;
  gender: string;
  birthday?: string;
  maritalStatus?: string;
  email?: string;
  submittedAt: string;
};

export function saveRegistrationPass(pass: RegistrationPass) {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(REGISTRATION_PASS_KEY, JSON.stringify(pass));
  } catch {
    // quota / private mode
  }
}

export function loadRegistrationPass(): RegistrationPass | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = localStorage.getItem(REGISTRATION_PASS_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as RegistrationPass;
    if (!parsed?.userId || !parsed?.qrCode) return null;
    return parsed;
  } catch {
    return null;
  }
}

export function registrationDisplayName(pass: Pick<RegistrationPass, 'firstName' | 'middleName' | 'lastName'>) {
  return [pass.firstName, pass.middleName, pass.lastName].filter(Boolean).join(' ').trim();
}
