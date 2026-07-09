export type UserRole = 'member' | 'group_leader' | 'campus_leader' | 'admin' | 'super_admin';
export type MemberStatus = 'pending' | 'approved' | 'rejected';

// Group scope: 'global' means visible everywhere; a campusId means campus-specific
export interface Group {
  name: string;
  scope: 'global' | string; // 'global' or a campusId
}

export interface Campus {
  id: string;
  _id?: string;
  name: string;
  pastor: string;
  address?: string;
  city?: string;
  zipCode?: string;
  phone?: string;
  email?: string;
  serviceTimes?: { day: string; times: string[] }[];
  latitude?: number;
  longitude?: number;
}

export type FormFieldType = 'text' | 'textarea' | 'radio' | 'checkbox' | 'select' | 'date' | 'number' | 'email' | 'phone' | 'time' | 'linear_scale';

export interface FormFieldOption {
  id: string;
  label: string;
}

export interface FormField {
  id: string;
  type: FormFieldType;
  label: string;
  required: boolean;
  description?: string;
  options?: FormFieldOption[];
  scaleMin?: number;
  scaleMax?: number;
  scaleMinLabel?: string;
  scaleMaxLabel?: string;
  scaleLabels?: Record<number, string>;
}

export interface EventScheduleDay {
  date: string;
  startTime: string;
  endTime: string;
  label?: string; // e.g. "Day 1 - Opening Ceremony"
}

export interface Event {
  id: string;
  _id?: string;
  title: string;
  description: string;
  date: string;
  time: string;
  endTime: string;
  location: string;
  category: string;
  capacity: number;
  registered: number;
  image: string | null;
  recurring: boolean;
  recurrencePattern?: 'weekly' | 'biweekly' | 'monthly' | 'custom' | 'custom_monthly';
  recurrenceDay?: string;
  recurrenceWeekOfMonth?: string; // '1st', '2nd', '3rd', '4th', 'last'
  recurrenceEndDate?: string;
  recurrenceNote?: string;
  seriesId?: string;
  isSeriesTemplate?: boolean;
  nextOccurrence?: string;
  lastTriggered?: string;
  mapUrl?: string;
  host: string;
  targetCampuses: string[];
  targetGroups: string[];
  excludeCampuses?: string[];
  excludeGroups?: string[];
  createdAt: string;
  googlePhotosUrl?: string;
  formFields?: FormField[];
  isMultiDay?: boolean;
  endDate?: string;
  schedule?: EventScheduleDay[];
  reminders?: string[]; // Deprecated
  customReminders?: { daysBefore: number; hoursBefore: number; minutesBefore: number; }[];
  attendanceConfig?: {
    enabled: boolean;
    radius: number;
    latitude: number;
    longitude: number;
    openMinutesBefore: number;
    closeMinutesAfter: number;
  };
  allowResponseEdits?: boolean;
}

export interface EventRegistration {
  id: string;
  _id?: string;
  eventId: string;
  userId?: string;
  userName: string;
  userEmail: string;
  registeredAt: string;
  responses: Record<string, string | string[]>;
}

export interface Announcement {
  id: string;
  _id?: string;
  title: string;
  content: string;
  isPinned: boolean;
  reminderDate?: string;
  reminderTime?: string;
  image?: string;
  reactions: number;
  targetCampuses: string[];
  targetGroups: string[];
  excludeCampuses?: string[];
  excludeGroups?: string[];
  createdAt: string;
  isRecurring?: boolean;
  recurrencePattern?: 'weekly' | 'biweekly' | 'monthly' | 'custom' | 'custom_monthly';
  recurrenceDay?: string; // e.g. 'Sunday', 'Monday', or '1st Sunday'
  recurrenceWeekOfMonth?: string;
  recurrenceEndDate?: string; // optional end date for recurring
  recurrenceNote?: string; // e.g. 'Every Sunday at 10 AM'
  nextOccurrence?: string;
  lastTriggered?: string;
  endDate?: string;
  endTime?: string;
  customReminders?: { daysBefore: number; hoursBefore: number; minutesBefore: number; }[];
}

export interface WorshipVideo {
  id: string;
  _id?: string;
  title: string;
  videoId: string;
  isFeatured?: boolean;
  categories?: string[];
  artist?: string;
  album?: string;
  duration?: string;
}

export interface Sermon {
  id: string;
  _id?: string;
  seriesId: string;
  title: string;
  pastor: string;
  date: string;
  duration: string;
  videoId: string;
  description: string;
  materials?: { title: string; url: string; type?: string }[];
  views: number;
  likes: number;
  isFeatured?: boolean;
  sortOrder?: number;
  category?: string;
  targetCampuses?: string[];
  targetGroups?: string[];
  excludeCampuses?: string[];
  excludeGroups?: string[];
}

export interface SystemSettings {
  id?: string;
  _id?: string;
  minAppVersion: string;
  statsMembers?: number;
  statsGroups?: number;
  statsYears?: number;
}

export interface SermonSeries {
  id: string;
  _id?: string;
  title: string;
  description: string;
  category: string;
}

export interface FlipCardItem {
  id: string;
  type: 'event' | 'announcement' | 'prayer' | 'sermon' | 'worship_video' | 'custom';
  itemId?: string;
  title?: string;
  description?: string;
  buttonText?: string;
  buttonLink?: string;
}

export interface FlipCardConfig {
  isActive: boolean;
  items: FlipCardItem[];
}

export interface GalleryAlbum {
  id: string;
  _id?: string;
  title: string;
  description: string;
  url: string;
  category: string;
  coverImage?: string;
  sortOrder?: number;
  targetCampuses?: string[];
  targetGroups?: string[];
  excludeCampuses?: string[];
  excludeGroups?: string[];
}

export interface PrayerRequest {
  id: string;
  _id?: string;
  title: string;
  content: string;
  authorName: string;
  campusId: string;
  isAnonymous: boolean;
  privacy: 'public' | 'members' | 'staff';
  category: string;
  prayedCount: number;
  comments: number;
  status: 'pending' | 'approved' | 'rejected';
  createdAt: string;
}

export interface LiveStream {
  id?: string;
  _id?: string;
  campusId: string;
  videoId: string;
  isLive: boolean;
  title: string;
  description: string;
  isAutoEnabled?: boolean;
  youtubeChannelId?: string;
  recurrencePattern?: 'weekly' | 'custom' | 'custom_monthly';
  recurrenceDay?: string;
  recurrenceWeekOfMonth?: string;
  time?: string;
}

export interface UserProfile {
  id: string;
  _id?: string;
  name: string;
  firstName?: string;
  middleName?: string;
  lastName?: string;
  email: string;
  role: UserRole;
  campusId: string;
  groups: string[];
  gender?: 'male' | 'female';
  birthday?: string;
  maritalStatus?: 'single' | 'married';
  marriageDate?: string;
  phone?: string;
  whatsapp?: string;
  parentAccountId?: string;
  isLinkedProfile?: boolean;
}

export interface ChurchMember {
  id: string;
  _id?: string;
  name?: string;
  firstName: string;
  middleName?: string;
  lastName: string;
  gender: 'male' | 'female';
  birthday?: string;
  maritalStatus?: 'single' | 'married';
  marriageDate?: string;
  campusId: string;
  email: string;
  phone?: string;
  whatsapp?: string;
  password?: string;
  createdAt: string;
  status: MemberStatus;
  groups: string[];
  qrCode?: string;
  familyMemberId?: string;
  parentAccountId?: string;
  isLinkedProfile?: boolean;
  role?: string;
  createdBy?: string;
}

export interface AuthSession {
  memberId: string;
  email: string;
  name: string;
  role: string;
}
