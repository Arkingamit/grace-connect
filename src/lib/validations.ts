import { z } from 'zod';
import { isFutureBirthday } from '@/lib/date-utils';
import { FIELD_LIMITS, PRAYER_FIELD_LIMITS } from '@/lib/field-limits';

const birthdaySchema = z
  .string()
  .min(1, 'Birthday is required')
  .refine((val) => !isFutureBirthday(val), 'Birthday cannot be in the future');
export const loginSchema = z.object({
  credential: z.string().min(1, 'Authentication credential is required'),
  provider: z.enum(['google', 'apple']).default('google'),
  picture: z.string().optional(),
  givenName: z.string().optional(),
  familyName: z.string().optional(),
});

export const registerSchema = z.object({
  credential: z.string().optional(),
  appleState: z.string().optional(),
  provider: z.enum(['google', 'apple']).default('google'),
  firstName: z.string().min(2, 'First name is required').max(FIELD_LIMITS.name, `First name must be ${FIELD_LIMITS.name} characters or fewer`),
  middleName: z.string().max(FIELD_LIMITS.name, `Middle name must be ${FIELD_LIMITS.name} characters or fewer`).optional(),
  lastName: z.string().min(2, 'Last name is required').max(FIELD_LIMITS.name, `Last name must be ${FIELD_LIMITS.name} characters or fewer`),
  gender: z.enum(['male', 'female']),
  birthday: birthdaySchema,
  maritalStatus: z.enum(['single', 'married']).optional(),
  marriageDate: z.string().optional(),
  campusId: z.string().min(1, 'Campus is required'),
  phone: z.string().max(FIELD_LIMITS.phone, `Phone number must be ${FIELD_LIMITS.phone} characters or fewer`).optional(),
  whatsapp: z.string().max(FIELD_LIMITS.phone, `WhatsApp number must be ${FIELD_LIMITS.phone} characters or fewer`).optional(),
  familyMemberId: z.string().optional(),
}).refine((data) => Boolean(data.credential || data.appleState), {
  message: 'Authentication credential is required',
  path: ['credential'],
});

export const linkedProfileSchema = z.object({
  firstName: z.string().min(1, 'First name is required').max(FIELD_LIMITS.name, `First name must be ${FIELD_LIMITS.name} characters or fewer`),
  middleName: z.string().max(FIELD_LIMITS.name, `Middle name must be ${FIELD_LIMITS.name} characters or fewer`).optional(),
  lastName: z.string().min(1, 'Last name is required').max(FIELD_LIMITS.name, `Last name must be ${FIELD_LIMITS.name} characters or fewer`),
  gender: z.enum(['male', 'female']),
  birthday: z.string().optional().refine((val) => !val || !isFutureBirthday(val), 'Birthday cannot be in the future'),
  maritalStatus: z.enum(['single', 'married']).optional(),
  marriageDate: z.string().optional(),
  campusId: z.string().min(1, 'Campus is required'),
  phone: z.string().max(FIELD_LIMITS.phone, `Phone number must be ${FIELD_LIMITS.phone} characters or fewer`).optional(),
  whatsapp: z.string().max(FIELD_LIMITS.phone, `WhatsApp number must be ${FIELD_LIMITS.phone} characters or fewer`).optional(),
  parentRelation: z.string().max(FIELD_LIMITS.relation, `Relation must be ${FIELD_LIMITS.relation} characters or fewer`).optional(),
});

// Event Schema
export const eventSchema = z.object({
  title: z.string().min(3, 'Title is required'),
  description: z.string().optional(),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Invalid date format (YYYY-MM-DD)'),
  time: z.string(),
  endTime: z.string().optional(),
  location: z.string().min(2, 'Location is required'),
  category: z.string(),
  capacity: z.number().int().min(0),
  recurring: z.boolean().optional(),
  recurrencePattern: z.string().optional(),
  recurrenceDay: z.string().optional(),
  recurrenceWeekOfMonth: z.string().optional(),
  recurrenceEndDate: z.string().optional(),
  recurrenceNote: z.string().optional(),
  seriesId: z.string().optional(),
  isSeriesTemplate: z.boolean().optional(),
  nextOccurrence: z.string().optional(),
  lastTriggered: z.string().optional(),
  mapUrl: z.string().optional().or(z.literal('')),
  host: z.string().optional(),
  targetCampuses: z.array(z.string()),
  targetGroups: z.array(z.string()),
  excludeCampuses: z.array(z.string()).optional(),
  excludeGroups: z.array(z.string()).optional(),
  googlePhotosUrl: z.string().url().optional().or(z.literal('')),
  formFields: z.array(z.any()).optional(),
  isMultiDay: z.boolean().optional(),
  endDate: z.string().optional(),
  schedule: z.array(z.any()).optional(),
  reminders: z.array(z.string()).optional(),
  customReminders: z.array(z.object({
    daysBefore: z.number(),
    hoursBefore: z.number(),
    minutesBefore: z.number()
  })).optional(),
  attendanceConfig: z.object({
    enabled: z.boolean(),
    radius: z.number(),
    latitude: z.number().optional(),
    longitude: z.number().optional(),
    openMinutesBefore: z.number(),
    closeMinutesAfter: z.number()
  }).optional(),
  allowResponseEdits: z.boolean().optional()
});

// User Admin Schema (for creating/updating users in admin)
export const userSchema = z.object({
  firstName: z.string().optional(),
  lastName: z.string().optional(),
  name: z.string().optional(),
  email: z.string().email('Invalid email address'),
  role: z.enum(['member', 'campus_leader', 'admin', 'super_admin']),
  status: z.enum(['pending', 'approved', 'rejected']),
  campusId: z.string(),
  groups: z.array(z.string()).optional(),
});

// Prayer Request Schema
export const prayerRequestSchema = z.object({
  title: z.string().min(3, 'Title must be at least 3 characters').max(PRAYER_FIELD_LIMITS.title, `Title must be ${PRAYER_FIELD_LIMITS.title} characters or fewer`),
  content: z.string().min(10, 'Prayer request must be at least 10 characters').max(PRAYER_FIELD_LIMITS.content, `Prayer request must be ${PRAYER_FIELD_LIMITS.content} characters or fewer`),
  authorName: z.string().max(FIELD_LIMITS.name, `Name must be ${FIELD_LIMITS.name} characters or fewer`).optional(),
  campusId: z.string().optional(), // Added for guest selection, overridden by session for members
  isAnonymous: z.boolean().optional(),
  privacy: z.enum(['public', 'members', 'staff']).optional(),
  category: z.string().max(40).optional(),
});
