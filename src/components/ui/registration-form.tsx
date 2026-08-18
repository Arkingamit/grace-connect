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
  Church, User, Heart, Phone, Lock, ArrowRight, ArrowLeft, Check, Clock, Building2, ScanLine, Globe, QrCode as QrIcon, Users, Search, X, Camera, Pencil,
} from 'lucide-react';
import { QRScanner } from '@/components/ui/qr-scanner';
import { AvatarUploader } from '@/components/ui/avatar-uploader';
import { fileToDataUrl, setStoredAvatar } from '@/lib/avatar-storage';
import { getMaxBirthdayDate, isFutureBirthday } from '@/lib/date-utils';
import { GoogleLogin } from '@react-oauth/google';
import { Capacitor } from '@capacitor/core';
import { GoogleAuth } from '@codetrix-studio/capacitor-google-auth';
import { SignInWithApple } from '@capacitor-community/apple-sign-in';
import AppleLogin from 'react-apple-signin-auth';

interface RegistrationFormProps {
  /** When set, the campus is pre-selected and cannot be changed (QR flow) */
  lockedCampusId?: string;
}

export function RegistrationForm({ lockedCampusId }: RegistrationFormProps) {
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
  const [profilePhoto, setProfilePhoto] = useState('');
  const [error, setError] = useState('');
  const [step, setStep] = useState(1);
  const [submitted, setSubmitted] = useState(false);
  const [showScanner, setShowScanner] = useState(false);
  const [isNative, setIsNative] = useState(false);
  const [mounted, setMounted] = useState(false);

  React.useEffect(() => {
    setMounted(true);
    const initNative = () => {
      const isCap = Capacitor.isNativePlatform();
      const isWebView =
        typeof navigator !== 'undefined' &&
        /wv|Android.*AppleWebKit/i.test(navigator.userAgent);
      if (isCap || isWebView) {
        setIsNative(true);
        try {
          const iosClientId =
            '641349616597-5npf7tgp6ifsu9evc1h4oe328rr8o12c.apps.googleusercontent.com';
          const webClientId =
            '641349616597-i769rj34s7j08odnfurq27quo5f0jv7k.apps.googleusercontent.com';
          GoogleAuth.initialize({
            clientId: Capacitor.getPlatform() === 'ios' ? iosClientId : webClientId,
            scopes: ['profile', 'email'],
            grantOfflineAccess: true,
          });
        } catch (e) {
          console.error(e);
        }
      }
    };
    initNative();
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

  const finishRegistration = (result: { success: boolean; error?: string; userId?: string }) => {
    if (result.success) {
      if (result.userId && profilePhoto) {
        setStoredAvatar(result.userId, profilePhoto);
      }
      setSubmitted(true);
    } else {
      setError(result.error || 'Registration failed');
    }
  };

  const canProceedStep1 =
    form.firstName &&
    form.lastName &&
    form.gender &&
    form.birthday &&
    !isFutureBirthday(form.birthday);
  const canProceedStep2 = form.maritalStatus && form.campusId;
  const canProceedStep3 = form.phone && (form.whatsapp || whatsappSame);

  const handleGoogleRegister = async (credentialResponse: any) => {
    setError('');
    if (!credentialResponse.credential) {
      setError('Google authentication failed. No credential received.');
      return;
    }

    const result = await register({
      credential: credentialResponse.credential,
      provider: 'google',
      firstName: form.firstName,
      middleName: form.middleName,
      lastName: form.lastName,
      gender: form.gender as 'male' | 'female',
      birthday: form.birthday,
      maritalStatus: form.maritalStatus as 'single' | 'married',
      marriageDate: form.marriageDate,
      campusId: form.campusId,
      phone: form.phone,
      whatsapp: whatsappSame ? form.phone : form.whatsapp,
      ...(selectedFamily ? { familyMemberId: selectedFamily.id } : {}),
    });

    finishRegistration(result);
  };

  const handleNativeGoogleRegister = async () => {
    try {
      setError('');
      const user = await GoogleAuth.signIn();
      if (!user.authentication.idToken) {
        setError('Google authentication failed. No ID Token received.');
        return;
      }
      handleGoogleRegister({ credential: user.authentication.idToken });
    } catch (err: any) {
      console.error(err);
      const message = err?.message || err?.errorMessage || '';
      setError(
        /cancel/i.test(message)
          ? 'Google login was canceled.'
          : message || 'Native Google login failed. Please try again.'
      );
    }
  };

  const handleNativeAppleRegister = async () => {
    try {
      setError('');
      const result = await SignInWithApple.authorize({
        clientId: 'com.graceconnect.app',
        scopes: 'email name',
        redirectURI: 'https://graceconnect.graceahmedabad.org/register',
      });
      if (result.response && result.response.identityToken) {
        const authResult = await register({
          credential: result.response.identityToken,
          provider: 'apple',
          firstName: result.response.givenName || form.firstName, // Use Apple's provided name if available
          middleName: form.middleName,
          lastName: result.response.familyName || form.lastName,
          gender: form.gender as 'male' | 'female',
          birthday: form.birthday,
          maritalStatus: form.maritalStatus as 'single' | 'married',
          marriageDate: form.marriageDate,
          campusId: form.campusId,
          phone: form.phone,
          whatsapp: whatsappSame ? form.phone : form.whatsapp,
          ...(selectedFamily ? { familyMemberId: selectedFamily.id } : {}),
        });
        if (authResult.success) {
          finishRegistration(authResult);
        } else {
          setError(authResult.error || 'Registration failed');
        }
      } else {
        setError('Apple authentication failed. No ID token received.');
      }
    } catch (err: any) {
      console.error(err);
      setError('Native Apple login failed or was canceled.');
    }
  };

  const handleAppleWebRegister = async (response: any) => {
    setError('');
    if (response.error) {
      setError('Apple authentication failed or was canceled.');
      return;
    }
    const idToken = response.authorization?.id_token;
    if (!idToken) {
      setError('Apple authentication failed. No ID token received.');
      return;
    }

    let appleFirstName = form.firstName;
    let appleLastName = form.lastName;
    if (response.user) {
      try {
        const userObj = typeof response.user === 'string' ? JSON.parse(response.user) : response.user;
        appleFirstName = userObj.name?.firstName || appleFirstName;
        appleLastName = userObj.name?.lastName || appleLastName;
      } catch (e) {}
    }

    const authResult = await register({
      credential: idToken,
      provider: 'apple',
      firstName: appleFirstName,
      middleName: form.middleName,
      lastName: appleLastName,
      gender: form.gender as 'male' | 'female',
      birthday: form.birthday,
      maritalStatus: form.maritalStatus as 'single' | 'married',
      marriageDate: form.marriageDate,
      campusId: form.campusId,
      phone: form.phone,
      whatsapp: whatsappSame ? form.phone : form.whatsapp,
      ...(selectedFamily ? { familyMemberId: selectedFamily.id } : {}),
    });
    if (authResult.success) {
      finishRegistration(authResult);
    } else {
      setError(authResult.error || 'Registration failed');
    }
  };

  const handleGoogleError = () => {
    setError('Google authentication failed. Please try again.');
  };

  // ── Block access if no campus is locked (QR flow) ──
  if (!lockedCampusId || !lockedCampus) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <div className="fixed inset-0 overflow-hidden pointer-events-none">
          <div className="absolute top-0 left-1/4 w-96 h-96 bg-primary/5 rounded-full blur-3xl" />
          <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-accent/5 rounded-full blur-3xl" />
        </div>
        <div className="w-full max-w-lg relative z-10">
          <div className="text-center mb-8">
            <Link href="/" className="inline-flex items-center gap-2 mb-4">
              <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-primary to-accent flex items-center justify-center">
                <Church className="w-6 h-6 text-white" />
              </div>
            </Link>
          </div>
          <Card className="border-border/50 shadow-elevated">
            <CardContent className="p-10 text-center space-y-6">
              <div className="w-20 h-20 rounded-full bg-amber-500/10 flex items-center justify-center mx-auto">
                <ScanLine className="w-10 h-10 text-amber-500" />
              </div>
              <h2 className="text-2xl font-bold">QR Registration Required</h2>
              <p className="text-muted-foreground text-sm leading-relaxed">
                Registration is only available via campus-specific links. 
                Please scan the QR code at your local campus registration desk.
              </p>
              <div className="flex flex-col gap-3">
                <Link href="/register">
                  <Button className="w-full gap-2 h-12">
                    <QrIcon className="w-4 h-4" /> Go to QR Scanner
                  </Button>
                </Link>
                <Link href="/">
                  <Button variant="outline" className="w-full h-12">Back to Home</Button>
                </Link>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      {/* Background */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-primary/5 rounded-full blur-3xl" />
        <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-accent/5 rounded-full blur-3xl" />
      </div>

      <div className="w-full max-w-lg relative z-10">
        {/* Header */}
        <div className="text-center mb-8">
          <Link href="/" className="inline-flex items-center gap-2 mb-4">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-primary to-accent flex items-center justify-center">
              <Church className="w-6 h-6 text-white" />
            </div>
          </Link>
          <h1 className="text-3xl font-bold">Join Grace Community</h1>
          <p className="text-muted-foreground mt-2">
            {lockedCampus
              ? <>Register at <span className="text-primary font-semibold">{lockedCampus.name}</span></>
              : 'Create your church member account'
            }
          </p>
          {/* Scan QR Code button — only when campus is NOT locked */}
          {!lockedCampus && !submitted && (
            <Button
              variant="outline"
              size="sm"
              className="mt-4 gap-2 border-primary/30 text-primary hover:bg-primary/10"
              onClick={() => setShowScanner(true)}
            >
              <ScanLine className="w-4 h-4" />
              Scan Campus QR Code
            </Button>
          )}
        </div>

        {/* QR Scanner Overlay */}
        {showScanner && <QRScanner onClose={() => setShowScanner(false)} />}

        {/* Success Screen */}
        {submitted ? (
          <Card className="border-border/50 shadow-elevated">
            <CardContent className="p-8 text-center space-y-4">
              <div className="w-16 h-16 rounded-full bg-amber-500/10 flex items-center justify-center mx-auto overflow-hidden">
                {profilePhoto ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={profilePhoto} alt="" className="h-full w-full object-cover" />
                ) : (
                  <Clock className="w-8 h-8 text-amber-500" />
                )}
              </div>
              <h2 className="text-xl font-bold">Registration Submitted!</h2>
              <p className="text-muted-foreground text-sm leading-relaxed">
                Your registration is pending approval from your campus pastor.
                You&apos;ll be able to sign in once your request is approved.
              </p>
              <div className="bg-muted/30 rounded-lg p-4 text-left space-y-1">
                <p className="text-xs text-muted-foreground">Submitted as:</p>
                <p className="text-sm font-medium">{form.firstName} {form.lastName}</p>
                <p className="text-xs text-muted-foreground">
                  Campus: {campuses.find(c => c.id === form.campusId)?.name}
                </p>
              </div>
              <Link href="/">
                <Button variant="outline" className="mt-2">Back to Home</Button>
              </Link>
            </CardContent>
          </Card>
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

        <Card className="border-border/50 shadow-elevated">
          <CardContent className="p-6 space-y-5">
            {/* Step 1: Personal Info */}
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
                    <Label>Gender *</Label>
                    <Select value={form.gender} onValueChange={v => updateField('gender', v)}>
                      <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="male">Male</SelectItem>
                        <SelectItem value="female">Female</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Birthday *</Label>
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
                  <Label>Marital Status *</Label>
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
                <div className="flex gap-3">
                  <Button variant="outline" className="flex-1 gap-2" onClick={() => setStep(1)}>
                    <ArrowLeft className="w-4 h-4" /> Back
                  </Button>
                  <Button className="flex-1 gap-2" disabled={!canProceedStep2} onClick={() => setStep(3)}>
                    Continue <ArrowRight className="w-4 h-4" />
                  </Button>
                </div>
              </>
            )}

            {/* Step 3: Contact & Account */}
            {step === 3 && (
              <>
                <div className="space-y-2">
                  <Label>Phone Number *</Label>
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
                    <Label>WhatsApp Number *</Label>
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
                
                <div className="flex gap-3 pt-2">
                  <Button variant="outline" className="flex-1 gap-2" onClick={() => setStep(2)}>
                    <ArrowLeft className="w-4 h-4" /> Back
                  </Button>
                  <Button
                    className="flex-1 gap-2"
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
                    This is how your profile will appear. Confirm, then verify to finish.
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

                {error && (
                  <div className="p-3 rounded-lg bg-destructive/10 text-destructive text-sm">
                    {error}
                  </div>
                )}

                <div className="flex gap-3">
                  <Button variant="outline" className="flex-1 gap-2" onClick={() => setStep(3)}>
                    <ArrowLeft className="w-4 h-4" /> Back
                  </Button>
                </div>

                <div className="mt-2 pt-4 border-t border-border/50 flex flex-col items-center space-y-4">
                  <p className="text-sm font-medium">Verify & Register</p>

                  {!mounted ? (
                    <div className="w-full space-y-3">
                      <div className="w-full h-[44px] animate-pulse bg-[#F3EAE1]/50 rounded-lg"></div>
                      <div className="w-full h-[44px] animate-pulse bg-[#F3EAE1]/50 rounded-lg"></div>
                    </div>
                  ) : isNative ? (
                    <>
                      <button
                        onClick={handleNativeGoogleRegister}
                        className="w-full bg-white text-gray-700 border border-gray-300 font-medium text-sm rounded-md py-2.5 px-4 flex items-center justify-center gap-3 hover:bg-gray-50 transition-colors shadow-sm"
                      >
                        <img src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg" alt="Google" className="w-5 h-5" />
                        Register with Google
                      </button>
                      <button
                        onClick={handleNativeAppleRegister}
                        className="w-full bg-black text-white border border-black font-medium text-sm rounded-md py-2.5 px-4 flex items-center justify-center gap-3 hover:bg-gray-900 transition-colors shadow-sm"
                      >
                        <svg viewBox="0 0 384 512" className="w-5 h-5 fill-white"><path d="M318.7 268.7c-.2-36.7 16.4-64.4 50-84.8-18.8-26.9-47.2-41.7-84.1-44.6-35.9-2.8-74.3 22.7-93.1 22.7-18.9 0-50.1-22.1-78.8-22.1-41.1 0-79.6 23.3-100.9 61.2-42.9 76.5-11 190.2 30.6 248.9 20.4 28.7 44.5 61.2 75.3 60 30.3-1.2 41.5-19.6 77.9-19.6 36.1 0 46.5 19.3 78.2 19.3 32.5-.2 53.6-29.6 73.8-59 23.2-34 32.4-67.1 33-68.8-1-1-61.9-23.7-61.9-113.2zM250.7 77.7c16.5-20.1 27.6-47.8 24.6-75.7-24 1-52 14.1-69 32.2-15.1 16-27.9 44-24.3 71.1 26.6 2 52.2-14.8 68.7-27.6z"/></svg>
                        Register with Apple
                      </button>
                    </>
                  ) : (
                    <>
                      <div className="w-full flex justify-center [&>div]:!w-full [&>div>div]:!w-full [&_iframe]:!w-full">
                        <GoogleLogin
                          onSuccess={handleGoogleRegister}
                          onError={handleGoogleError}
                          useOneTap={false}
                          theme="outline"
                          size="large"
                          shape="rectangular"
                          text="signup_with"
                          width="100%"
                        />
                      </div>
                      <div className="w-full flex justify-center">
                        <AppleLogin
                          authOptions={{
                            clientId: process.env.NEXT_PUBLIC_APPLE_CLIENT_ID || 'com.graceconnect.web',
                            redirectURI: typeof window !== 'undefined' ? `${window.location.origin}/register` : '',
                            usePopup: true,
                            scope: 'email name'
                          }}
                          uiType="dark"
                          onSuccess={handleAppleWebRegister}
                          onError={(error: any) => handleAppleWebRegister({ error })}
                          render={(renderProps) => (
                            <button
                              onClick={renderProps.onClick}
                              className="w-full bg-black text-white border border-black font-medium text-sm rounded-md py-2.5 px-4 flex items-center justify-center gap-3 hover:bg-gray-900 transition-colors shadow-sm"
                            >
                              <svg viewBox="0 0 384 512" className="w-5 h-5 fill-white"><path d="M318.7 268.7c-.2-36.7 16.4-64.4 50-84.8-18.8-26.9-47.2-41.7-84.1-44.6-35.9-2.8-74.3 22.7-93.1 22.7-18.9 0-50.1-22.1-78.8-22.1-41.1 0-79.6 23.3-100.9 61.2-42.9 76.5-11 190.2 30.6 248.9 20.4 28.7 44.5 61.2 75.3 60 30.3-1.2 41.5-19.6 77.9-19.6 36.1 0 46.5 19.3 78.2 19.3 32.5-.2 53.6-29.6 73.8-59 23.2-34 32.4-67.1 33-68.8-1-1-61.9-23.7-61.9-113.2zM250.7 77.7c16.5-20.1 27.6-47.8 24.6-75.7-24 1-52 14.1-69 32.2-15.1 16-27.9 44-24.3 71.1 26.6 2 52.2-14.8 68.7-27.6z"/></svg>
                              Register with Apple
                            </button>
                          )}
                        />
                      </div>
                    </>
                  )}
                </div>
              </>
            )}
          </CardContent>
        </Card>

        <p className="text-center text-sm text-muted-foreground mt-6">
          Already have an account?{' '}
          <Link href="/login" className="text-primary font-semibold hover:underline">
            Sign In
          </Link>
        </p>
        </> /* end of !submitted */
        )}
      </div>
    </div>
  );
}
