"use client";

import React, { useState } from 'react';
import Link from 'next/link';
import { useAuth, type ChurchMember } from '@/lib/auth-context';
import { useAdminData } from '@/lib/admin-data-context';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import {
  User, Heart, Phone, ArrowRight, ArrowLeft, Check, Building2, QrCode as QrIcon, Users, Search, X, Camera, Pencil,
} from 'lucide-react';
import { AvatarUploader } from '@/components/ui/avatar-uploader';
import { fileToDataUrl, setStoredAvatar } from '@/lib/avatar-storage';
import { getMaxBirthdayDate, isFutureBirthday } from '@/lib/date-utils';
import { AnimatedTicket } from '@/components/ui/ticket-confirmation-card';
import { RegistrationPassDialog } from '@/components/ui/registration-pass-dialog';
import { CelebrationRibbon } from '@/components/ui/celebration-ribbon';
import {
  AuthCard,
  AuthPageShell,
} from '@/components/ui/auth-layout';
import {
  saveRegistrationPass,
  type RegistrationPass,
} from '@/lib/registration-pass';
import {
  clearOauthRegistrationDraft,
  loadOauthRegistrationDraft,
  saveOauthRegistrationDraft,
  type OauthRegistrationDraft,
} from '@/lib/oauth-registration';
import { useRouter } from 'next/navigation';

interface RegistrationFormProps {
  /** When set, the campus is pre-selected and cannot be changed (QR flow) */
  lockedCampusId?: string;
}

export function RegistrationForm({ lockedCampusId }: RegistrationFormProps) {
  const router = useRouter();
  const { register, getApprovedMembers } = useAuth();
  const { campuses } = useAdminData();

  const lockedCampus = lockedCampusId
    ? campuses.find(c => c.id === lockedCampusId)
    : undefined;

  const [form, setForm] = useState({
    firstName: '',
    middleName: '',
    lastName: '',
    gender: '' as 'male' | 'female' | '',
    birthday: '',
    maritalStatus: '' as 'single' | 'married' | '',
    marriageDate: '',
    campusId: lockedCampusId || '',
    phone: '',
    whatsapp: '',
  });

  const [whatsappSame, setWhatsappSame] = useState(false);
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const [profilePhoto, setProfilePhoto] = useState('');
  const [error, setError] = useState('');
  const [step, setStep] = useState(1);
  const [submitted, setSubmitted] = useState(false);
  const [registrationPass, setRegistrationPass] = useState<RegistrationPass | null>(null);
  const [passOpen, setPassOpen] = useState(false);
  const [showCelebration, setShowCelebration] = useState(false);
  const [oauthReady, setOauthReady] = useState(false);
  const [oauthAuth, setOauthAuth] = useState<OauthRegistrationDraft | null>(null);

  React.useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const appleError = params.get('appleError');
    const appleState = params.get('appleState');
    const firstName = params.get('firstName') || '';
    const lastName = params.get('lastName') || '';

    if (appleError) {
      setError(appleError);
    }

    type Draft = {
      form?: typeof form;
      whatsappSame?: boolean;
      selectedFamily?: ChurchMember | null;
      profilePhoto?: string;
      step?: number;
    };
    let formDraft: Draft | null = null;
    try {
      const raw = sessionStorage.getItem('grace-pending-registration');
      if (raw) formDraft = JSON.parse(raw) as Draft;
    } catch {
      formDraft = null;
    }

    if (formDraft?.form) {
      setForm((current) => ({ ...current, ...formDraft!.form }));
      if (typeof formDraft.whatsappSame === 'boolean') setWhatsappSame(formDraft.whatsappSame);
      if (formDraft.selectedFamily) setSelectedFamily(formDraft.selectedFamily);
      if (formDraft.profilePhoto) setProfilePhoto(formDraft.profilePhoto);
      if (formDraft.step) setStep(formDraft.step);
    }

    const storedOauth = loadOauthRegistrationDraft();
    const auth: OauthRegistrationDraft | null = appleState
      ? {
          provider: 'apple',
          appleState,
          firstName: firstName || storedOauth?.firstName,
          lastName: lastName || storedOauth?.lastName,
          email: storedOauth?.email,
          credential: storedOauth?.credential,
        }
      : storedOauth;

    if (!auth) {
      router.replace('/login');
      return;
    }

    saveOauthRegistrationDraft(auth);
    setOauthAuth(auth);
    setForm((current) => ({
      ...current,
      firstName: current.firstName || auth.firstName || '',
      lastName: current.lastName || auth.lastName || '',
    }));
    if (appleState || appleError) {
      window.history.replaceState({}, '', window.location.pathname);
    }
    setOauthReady(true);
  }, []);

  // Family linking state
  const [hasFamilyMember, setHasFamilyMember] = useState(false);
  const [familySearch, setFamilySearch] = useState('');
  const [selectedFamily, setSelectedFamily] = useState<ChurchMember | null>(null);

  const approvedMembers = getApprovedMembers();
  const familyResults = familySearch.trim().length >= 2
    ? approvedMembers.filter(m => {
        const fullName = `${m.firstName} ${m.middleName} ${m.lastName}`.toLowerCase();
        const query = familySearch.toLowerCase().trim();
        return fullName.includes(query) || m.email.toLowerCase().includes(query);
      }).slice(0, 5)
    : [];

  const updateField = (field: string, value: string) => {
    setForm(f => ({ ...f, [field]: value }));
    if (field === 'phone' && whatsappSame) {
      setForm(f => ({ ...f, [field]: value, whatsapp: value }));
    }
  };

  const handleWhatsappToggle = (checked: boolean) => {
    setWhatsappSame(checked);
    if (checked) setForm(f => ({ ...f, whatsapp: f.phone }));
  };

  const handlePhotoUpload = async (file: File) => {
    const dataUrl = await fileToDataUrl(file);
    setProfilePhoto(dataUrl);
    return { success: true };
  };

  const displayName = `${form.firstName} ${form.lastName}`.trim() || 'Your profile';
  const initials = `${form.firstName?.[0] || ''}${form.lastName?.[0] || ''}`.toUpperCase() || '?';

  const finishRegistration = (
    result: {
      success: boolean;
      error?: string;
      userId?: string;
      qrCode?: string;
      email?: string;
    },
    snapshot = form,
    photo = profilePhoto,
    sameWhatsapp = whatsappSame,
  ) => {
    if (result.success) {
      if (result.userId && photo) {
        setStoredAvatar(result.userId, photo);
      }
      const campusName = campuses.find(c => c.id === snapshot.campusId)?.name || 'Grace Community';
      const pass: RegistrationPass = {
        userId: result.userId || crypto.randomUUID(),
        qrCode: result.qrCode || crypto.randomUUID(),
        firstName: snapshot.firstName,
        middleName: snapshot.middleName || undefined,
        lastName: snapshot.lastName,
        campusId: snapshot.campusId,
        campusName,
        phone: snapshot.phone,
        whatsapp: sameWhatsapp ? snapshot.phone : snapshot.whatsapp,
        gender: snapshot.gender,
        birthday: snapshot.birthday,
        maritalStatus: snapshot.maritalStatus,
        email: result.email,
        submittedAt: new Date().toISOString(),
      };
      saveRegistrationPass(pass);
      setRegistrationPass(pass);
      setSubmitted(true);
      setShowCelebration(true);
      setPassOpen(true);
      clearOauthRegistrationDraft();
    } else {
      setError(result.error || 'Registration failed');
    }
  };

  // Only the name and campus are needed to join a campus community. Gender,
  // birthday, marital status and phone numbers stay optional.
  const canProceedStep1 =
    form.firstName &&
    form.lastName &&
    !isFutureBirthday(form.birthday);
  const canProceedStep2 = Boolean(form.campusId);
  const canProceedStep3 = true;

  const handleCompleteRegistration = async () => {
    if (!oauthAuth?.credential && !oauthAuth?.appleState) {
      setError('Please sign in with Google or Apple first.');
      router.replace('/login');
      return;
    }
    if (!acceptedTerms) {
      setError('Please accept the Terms of Use to create your account.');
      return;
    }
    setError('');
    const result = await register({
      credential: oauthAuth.credential,
      appleState: oauthAuth.appleState,
      provider: oauthAuth.provider,
      firstName: form.firstName,
      middleName: form.middleName,
      lastName: form.lastName,
      gender: form.gender as 'male' | 'female',
      birthday: form.birthday,
      maritalStatus: form.maritalStatus as 'single' | 'married',
      marriageDate: form.marriageDate,
      campusId: form.campusId || lockedCampusId,
      phone: form.phone,
      whatsapp: whatsappSame ? form.phone : form.whatsapp,
      acceptedTerms: true,
      ...(selectedFamily ? { familyMemberId: selectedFamily.id } : {}),
    });
    finishRegistration(result);
  };

  if (!oauthReady) {
    return (
      <AuthPageShell>
        <AuthCard>
          <div className="flex items-center justify-center py-12">
            <span className="h-6 w-6 animate-spin rounded-full border-2 border-[#8B2323] border-t-transparent" />
          </div>
        </AuthCard>
      </AuthPageShell>
    );
  }

  return (
    <AuthPageShell>
      <AuthCard>
        <div className="text-left mb-6">
          <h1 className="text-3xl font-bold tracking-tight text-[#1A202C]">
            {submitted ? 'Thank you' : 'Create your account'}
          </h1>
          <p className="mt-2 text-sm leading-relaxed text-[#7A6150]">
            {lockedCampus
              ? <>Register at <span className="font-semibold text-[#8B2323]">{lockedCampus.name}</span></>
              : 'Finish your profile to join Grace Community.'}
          </p>
        </div>

        <CelebrationRibbon active={showCelebration} />

        {/* Success Screen */}
        {submitted ? (
          <div className="space-y-4">
            {registrationPass ? (
              <div className="flex justify-center">
                <AnimatedTicket
                  ticketId={`GR-${registrationPass.userId.slice(-8).toUpperCase()}`}
                  date={new Date(registrationPass.submittedAt)}
                  cardHolder={`${registrationPass.firstName} ${registrationPass.middleName ? `${registrationPass.middleName} ` : ''}${registrationPass.lastName}`.replace(/\s+/g, ' ').trim()}
                  barcodeValue={registrationPass.qrCode}
                  campusName={registrationPass.campusName}
                  phone={registrationPass.phone}
                  whatsapp={registrationPass.whatsapp}
                  gender={registrationPass.gender}
                  birthday={registrationPass.birthday}
                  maritalStatus={registrationPass.maritalStatus}
                  email={registrationPass.email}
                  statusLabel="Registered"
                  celebrate={false}
                />
              </div>
            ) : (
              <Card className="border-border/50 shadow-elevated">
                <CardContent className="p-8 text-center space-y-4">
                  <h2 className="text-xl font-bold">Registration Submitted!</h2>
                  <p className="text-muted-foreground text-sm leading-relaxed">
                    Your account is ready. You are signed in.
                  </p>
                </CardContent>
              </Card>
            )}
            <div className="flex flex-col gap-2">
              {registrationPass ? (
                <Button
                  type="button"
                  className="w-full gap-2 bg-[#8B2323] hover:bg-[#721515] text-white"
                  onClick={() => setPassOpen(true)}
                >
                  <QrIcon className="w-4 h-4" />
                  View confirmation card
                </Button>
              ) : null}
              <Link href="/" className="w-full">
                <Button variant="outline" className="w-full">Continue</Button>
              </Link>
            </div>
            {registrationPass ? (
              <RegistrationPassDialog
                pass={registrationPass}
                open={passOpen}
                onOpenChange={setPassOpen}
                celebrate={false}
              />
            ) : null}
          </div>
        ) : (
          <>

        {/* Step Indicator */}
        <div className="flex items-center justify-center gap-2 mb-6">
          {[1, 2, 3, 4].map(s => (
            <div key={s} className="flex items-center gap-2">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition-all ${
                step > s
                  ? 'bg-primary text-primary-foreground'
                  : step === s
                    ? 'bg-primary/20 text-primary border-2 border-primary'
                    : 'bg-muted text-muted-foreground'
              }`}>
                {step > s ? <Check className="w-4 h-4" /> : s}
              </div>
              {s < 4 && (
                <div className={`w-8 sm:w-12 h-0.5 ${step > s ? 'bg-primary' : 'bg-muted'} transition-all`} />
              )}
            </div>
          ))}
        </div>
        <div className="text-center text-xs text-muted-foreground mb-6">
          {step === 1 && 'Personal Information'}
          {step === 2 && 'Church & Family'}
          {step === 3 && 'Contact'}
          {step === 4 && 'Confirm your profile'}
        </div>

        <Card className="min-w-0 border-[#E5D5C5]/60 shadow-none rounded-2xl bg-[#FAF7F2]/60">
          <CardContent className="min-w-0 space-y-5 p-4 sm:p-6">
            {step === 1 && (
              <>
                <div className="flex flex-col items-center gap-2 pb-2">
                  <AvatarUploader onUpload={handlePhotoUpload}>
                    <button
                      type="button"
                      className="group relative outline-none focus-visible:ring-2 focus-visible:ring-[#8B2323]/40 rounded-full"
                      aria-label="Add profile photo"
                    >
                      <div className="h-24 w-24 rounded-full overflow-hidden border-2 border-[#E5D5C5] bg-[#F3EAE1] shadow-sm">
                        {profilePhoto ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={profilePhoto}
                            alt="Profile"
                            className="h-full w-full object-cover"
                          />
                        ) : (
                          <div className="flex h-full w-full flex-col items-center justify-center text-[#8B2323]/70">
                            <Camera className="h-7 w-7" />
                          </div>
                        )}
                      </div>
                      <span className="absolute bottom-0 right-0 flex h-8 w-8 items-center justify-center rounded-full border border-white bg-[#8B2323] text-white shadow-md">
                        <Pencil className="h-3.5 w-3.5" strokeWidth={2.25} />
                      </span>
                    </button>
                  </AvatarUploader>
                  <p className="text-xs text-muted-foreground">
                    {profilePhoto ? 'Tap to change photo' : 'Add a profile photo (optional)'}
                  </p>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>First Name *</Label>
                    <Input
                      value={form.firstName}
                      onChange={e => updateField('firstName', e.target.value)}
                      placeholder="John"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Middle Name</Label>
                    <Input
                      value={form.middleName}
                      onChange={e => updateField('middleName', e.target.value)}
                      placeholder="Michael"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Last Name *</Label>
                  <Input
                    value={form.lastName}
                    onChange={e => updateField('lastName', e.target.value)}
                    placeholder="Smith"
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Gender <span className="text-muted-foreground font-normal">(optional)</span></Label>
                    <Select value={form.gender} onValueChange={v => updateField('gender', v)}>
                      <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="male">Male</SelectItem>
                        <SelectItem value="female">Female</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Birthday <span className="text-muted-foreground font-normal">(optional)</span></Label>
                    <Input
                      type="date"
                      max={getMaxBirthdayDate()}
                      value={form.birthday}
                      onChange={e => updateField('birthday', e.target.value)}
                    />
                    {form.birthday && isFutureBirthday(form.birthday) && (
                      <p className="text-xs text-destructive">Birthday cannot be in the future.</p>
                    )}
                  </div>
                </div>
                <Button className="w-full gap-2" disabled={!canProceedStep1} onClick={() => setStep(2)}>
                  Continue <ArrowRight className="w-4 h-4" />
                </Button>
              </>
            )}

            {/* Step 2: Church & Family */}
            {step === 2 && (
              <>
                <div className="space-y-2">
                  <Label>Campus *</Label>
                  {lockedCampus ? (
                    <div className="flex items-center gap-3 p-3 rounded-xl border-2 border-primary/30 bg-primary/5">
                      <Building2 className="w-5 h-5 text-primary" />
                      <div>
                        <p className="font-semibold text-sm">{lockedCampus.name}</p>
                        <p className="text-[10px] text-muted-foreground">Led by {lockedCampus.pastor}</p>
                      </div>
                      <Check className="w-4 h-4 text-primary ml-auto" />
                    </div>
                  ) : (
                    <Select value={form.campusId} onValueChange={v => updateField('campusId', v)}>
                      <SelectTrigger><SelectValue placeholder="Select your campus" /></SelectTrigger>
                      <SelectContent>
                        {campuses.map(c => (
                          <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                </div>
                <div className="space-y-3">
                  <Label>Marital Status <span className="text-muted-foreground font-normal">(optional)</span></Label>
                  <div className="grid grid-cols-2 gap-3">
                    <button
                      type="button"
                      onClick={() => updateField('maritalStatus', 'single')}
                      className={`p-4 rounded-xl border-2 transition-all text-center ${
                        form.maritalStatus === 'single'
                          ? 'border-primary bg-primary/10 text-primary'
                          : 'border-border hover:border-primary/50'
                      }`}
                    >
                      <User className="w-5 h-5 mx-auto mb-1" />
                      <span className="text-sm font-medium">Single</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => updateField('maritalStatus', 'married')}
                      className={`p-4 rounded-xl border-2 transition-all text-center ${
                        form.maritalStatus === 'married'
                          ? 'border-primary bg-primary/10 text-primary'
                          : 'border-border hover:border-primary/50'
                      }`}
                    >
                      <Heart className="w-5 h-5 mx-auto mb-1" />
                      <span className="text-sm font-medium">Married</span>
                    </button>
                  </div>
                </div>
                {form.maritalStatus === 'married' && (
                  <div className="space-y-2 animate-in slide-in-from-top-2">
                    <Label>Date of Marriage</Label>
                    <Input
                      type="date"
                      value={form.marriageDate}
                      onChange={e => updateField('marriageDate', e.target.value)}
                    />
                  </div>
                )}

                {/* Family Linking */}
                <div className="border-t border-border/50 pt-5 mt-2 space-y-3">
                  <div className="flex items-center gap-3">
                    <Checkbox
                      id="has-family"
                      checked={hasFamilyMember}
                      onCheckedChange={(c) => {
                        setHasFamilyMember(!!c);
                        if (!c) {
                          setSelectedFamily(null);
                          setFamilySearch('');
                        }
                      }}
                    />
                    <Label htmlFor="has-family" className="cursor-pointer text-sm leading-tight">
                      I have a family member already registered at Grace
                    </Label>
                  </div>
                  <p className="text-[11px] text-muted-foreground pl-7 -mt-1">
                    Link your account to see announcements and events shared with your family member&apos;s groups.
                  </p>

                  {hasFamilyMember && (
                    <div className="space-y-3 animate-in slide-in-from-top-2 duration-300 pl-7">
                      {/* Selected family member chip */}
                      {selectedFamily ? (
                        <div className="flex items-center gap-3 p-3 rounded-xl border-2 border-emerald-500/30 bg-emerald-500/5">
                          <div className="w-8 h-8 rounded-full bg-emerald-500/10 flex items-center justify-center shrink-0">
                            <Users className="w-4 h-4 text-emerald-500" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-semibold truncate">
                              {selectedFamily.firstName} {selectedFamily.lastName}
                            </p>
                            <p className="text-[10px] text-muted-foreground truncate">{selectedFamily.email}</p>
                          </div>
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7 rounded-full hover:bg-destructive/10 hover:text-destructive shrink-0"
                            onClick={() => { setSelectedFamily(null); setFamilySearch(''); }}
                          >
                            <X className="w-3.5 h-3.5" />
                          </Button>
                        </div>
                      ) : (
                        <>
                          {/* Search input */}
                          <div className="relative">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                            <Input
                              value={familySearch}
                              onChange={e => setFamilySearch(e.target.value)}
                              placeholder="Search by name or email..."
                              className="pl-9"
                            />
                          </div>

                          {/* Search results */}
                          {familySearch.trim().length >= 2 && (
                            <div className="space-y-1.5 max-h-48 overflow-y-auto">
                              {familyResults.length === 0 ? (
                                <p className="text-xs text-muted-foreground text-center py-3">
                                  No approved members found matching &ldquo;{familySearch}&rdquo;
                                </p>
                              ) : (
                                familyResults.map(member => (
                                  <button
                                    key={member.id}
                                    type="button"
                                    className="w-full flex items-center gap-3 p-3 rounded-lg border border-border/50 hover:border-primary/50 hover:bg-primary/5 transition-all text-left"
                                    onClick={() => {
                                      setSelectedFamily(member);
                                      setFamilySearch('');
                                    }}
                                  >
                                    <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                                      <User className="w-4 h-4 text-primary" />
                                    </div>
                                    <div className="flex-1 min-w-0">
                                      <p className="text-sm font-medium truncate">
                                        {member.firstName} {member.middleName ? `${member.middleName} ` : ''}{member.lastName}
                                      </p>
                                      <p className="text-[10px] text-muted-foreground truncate">{member.email}</p>
                                    </div>
                                    <Badge variant="outline" className="text-[9px] shrink-0">
                                      {campuses.find(c => c.id === member.campusId)?.name || member.campusId}
                                    </Badge>
                                  </button>
                                ))
                              )}
                            </div>
                          )}
                        </>
                      )}
                    </div>
                  )}
                </div>
                <div className="flex w-full min-w-0 gap-2 sm:gap-3">
                  <Button variant="outline" className="min-w-0 flex-1 gap-1.5 px-3" onClick={() => setStep(1)}>
                    <ArrowLeft className="w-4 h-4" /> Back
                  </Button>
                  <Button className="min-w-0 flex-1 gap-1.5 px-3" disabled={!canProceedStep2} onClick={() => setStep(3)}>
                    Continue <ArrowRight className="w-4 h-4" />
                  </Button>
                </div>
              </>
            )}

            {/* Step 3: Contact & Account */}
            {step === 3 && (
              <>
                <p className="text-xs text-muted-foreground">
                  Contact numbers are optional. Share them only if you would like your
                  campus pastor to be able to reach you.
                </p>
                <div className="space-y-2">
                  <Label>Phone Number <span className="text-muted-foreground font-normal">(optional)</span></Label>
                  <div className="relative">
                    <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input
                      type="tel"
                      value={form.phone}
                      onChange={e => updateField('phone', e.target.value)}
                      placeholder="+91 99999 99999"
                      className="pl-9"
                    />
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Checkbox
                    id="whatsapp-same"
                    checked={whatsappSame}
                    onCheckedChange={(c) => handleWhatsappToggle(c as boolean)}
                  />
                  <Label htmlFor="whatsapp-same" className="text-sm cursor-pointer">
                    WhatsApp number is same as phone number
                  </Label>
                </div>
                {!whatsappSame && (
                  <div className="space-y-2 animate-in slide-in-from-top-2">
                    <Label>WhatsApp Number <span className="text-muted-foreground font-normal">(optional)</span></Label>
                    <Input
                      type="tel"
                      value={form.whatsapp}
                      onChange={e => updateField('whatsapp', e.target.value)}
                      placeholder="+91 99999 99999"
                    />
                  </div>
                )}
                
                {error && step === 3 && (
                  <div className="p-3 rounded-lg bg-destructive/10 text-destructive text-sm">
                    {error}
                  </div>
                )}
                
                <div className="flex w-full min-w-0 gap-2 pt-2 sm:gap-3">
                  <Button variant="outline" className="min-w-0 flex-1 gap-1.5 px-3" onClick={() => setStep(2)}>
                    <ArrowLeft className="w-4 h-4" /> Back
                  </Button>
                  <Button
                    className="min-w-0 flex-1 gap-1.5 px-3"
                    disabled={!canProceedStep3}
                    onClick={() => {
                      setError('');
                      setStep(4);
                    }}
                  >
                    Continue <ArrowRight className="w-4 h-4" />
                  </Button>
                </div>
              </>
            )}

            {/* Step 4: Profile card preview + final verify */}
            {step === 4 && (
              <>
                <div className="flex flex-col items-center gap-4 py-2">
                  <p className="text-sm text-muted-foreground text-center">
                    This is how your profile will appear. Confirm to finish.
                  </p>
                  <div className="relative h-44 w-44 sm:h-52 sm:w-52 overflow-hidden rounded-[1.75rem] border border-[#E5D5C5]/80 bg-white shadow-[0_8px_30px_-8px_rgba(92,17,17,0.25)]">
                    {profilePhoto ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={profilePhoto}
                        alt={displayName}
                        className="absolute inset-0 h-full w-full object-cover"
                      />
                    ) : (
                      <div className="absolute inset-0 bg-gradient-to-br from-[#8B2323] to-[#5C1111] flex items-center justify-center">
                        <span className="text-4xl font-bold text-white/90">{initials}</span>
                      </div>
                    )}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/55 via-black/10 to-transparent" />
                    <div className="absolute inset-x-0 bottom-0 p-4 text-center">
                      <span className="text-base font-semibold leading-snug text-white drop-shadow-md sm:text-lg">
                        {displayName}
                      </span>
                    </div>
                  </div>
                  <AvatarUploader onUpload={handlePhotoUpload}>
                    <button
                      type="button"
                      className="text-xs font-semibold text-[#8B2323] hover:underline"
                    >
                      {profilePhoto ? 'Change photo' : 'Add a photo'}
                    </button>
                  </AvatarUploader>
                  <div className="w-full rounded-xl border border-[#E5D5C5]/60 bg-[#FAF7F2] px-4 py-3 text-sm space-y-1">
                    <p className="font-medium text-[#1A202C]">{displayName}</p>
                    <p className="text-xs text-[#7A6150]">
                      {campuses.find(c => c.id === form.campusId)?.name || 'Campus'}
                      {form.phone ? ` · ${form.phone}` : ''}
                    </p>
                  </div>
                </div>

                <div className="rounded-xl border border-[#E5D5C5]/60 bg-white p-4 space-y-3">
                  <div className="flex items-start gap-3">
                    <Checkbox
                      id="accept-terms"
                      className="mt-0.5"
                      checked={acceptedTerms}
                      onCheckedChange={(c) => setAcceptedTerms(!!c)}
                    />
                    <Label htmlFor="accept-terms" className="cursor-pointer text-xs leading-relaxed font-normal">
                      I agree to the{' '}
                      <Link href="/terms" target="_blank" className="font-semibold text-[#8B2323] underline">
                        Terms of Use (EULA)
                      </Link>{' '}
                      and{' '}
                      <Link href="/privacy-policy" target="_blank" className="font-semibold text-[#8B2323] underline">
                        Privacy Policy
                      </Link>
                      . I understand that Grace Connect has zero tolerance for objectionable
                      content or abusive behaviour, and that my account may be removed if I
                      post such content.
                    </Label>
                  </div>
                </div>

                {error && (
                  <div className="p-3 rounded-lg bg-destructive/10 text-destructive text-sm">
                    {error}
                  </div>
                )}

                <div className="flex w-full flex-col gap-2">
                  <Button
                    className="h-12 w-full gap-1.5 px-4"
                    disabled={!acceptedTerms}
                    onClick={() => void handleCompleteRegistration()}
                  >
                    Complete registration
                    <ArrowRight className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="outline"
                    className="h-12 w-full gap-1.5 px-4"
                    onClick={() => setStep(3)}
                  >
                    <ArrowLeft className="h-4 w-4" />
                    Back
                  </Button>
                </div>
              </>
            )}
          </CardContent>
        </Card>

        <p className="text-center text-sm text-[#7A6150] mt-6">
          Already have an account?{' '}
          <Link href="/login" className="font-semibold text-[#8B2323] hover:underline">
            Log In
          </Link>
        </p>
        </> /* end of !submitted */
        )}
      </AuthCard>
    </AuthPageShell>
  );
}
