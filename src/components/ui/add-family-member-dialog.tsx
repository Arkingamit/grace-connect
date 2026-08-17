"use client";

import { useAuth } from '@/lib/auth-context';
import { useAdminData } from '@/lib/admin-data-context';
import { Button } from './button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from './dialog';
import { Input } from './input';
import { Label } from './label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './select';
import { Checkbox } from './checkbox';
import { Check, ArrowRight, ArrowLeft, Heart, User, Phone, Camera, Pencil } from 'lucide-react';
import { useState } from 'react';
import { AvatarUploader } from '@/components/ui/avatar-uploader';
import { fileToDataUrl, setStoredAvatar } from '@/lib/avatar-storage';
import { getMaxBirthdayDate, isFutureBirthday } from '@/lib/date-utils';

interface AddFamilyMemberDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function AddFamilyMemberDialog({ open, onOpenChange }: AddFamilyMemberDialogProps) {
  const { addLinkedProfile } = useAuth();
  const { campuses } = useAdminData();

  const [step, setStep] = useState(1);
  const [firstName, setFirstName] = useState('');
  const [middleName, setMiddleName] = useState('');
  const [lastName, setLastName] = useState('');
  const [gender, setGender] = useState<'male' | 'female' | ''>('');
  const [birthday, setBirthday] = useState('');
  const [campusId, setCampusId] = useState('');
  const [maritalStatus, setMaritalStatus] = useState<'single' | 'married' | ''>('');
  const [marriageDate, setMarriageDate] = useState('');
  const [phone, setPhone] = useState('');
  const [whatsapp, setWhatsapp] = useState('');
  const [whatsappSame, setWhatsappSame] = useState(false);
  const [relation, setRelation] = useState('');
  const [otherRelation, setOtherRelation] = useState('');
  const [profilePhoto, setProfilePhoto] = useState('');

  const [submitting, setSubmitting] = useState(false);

  const displayName = `${firstName} ${lastName}`.trim() || 'Family member';
  const fullName = [firstName, middleName, lastName].filter(Boolean).join(' ');
  const initials = `${firstName?.[0] || ''}${lastName?.[0] || ''}`.toUpperCase() || '?';
  const relationLabel =
    relation === 'other'
      ? otherRelation || 'Other'
      : relation
        ? relation.charAt(0).toUpperCase() + relation.slice(1)
        : '';

  const formatBirthday = (dateStr: string) => {
    if (!dateStr) return '';
    const d = new Date(`${dateStr}T12:00:00`);
    if (Number.isNaN(d.getTime())) return dateStr;
    return d.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
  };

  const confirmDetails: { label: string; value: string }[] = [
    { label: 'Full name', value: fullName },
    { label: 'Gender', value: gender === 'male' ? 'Male' : gender === 'female' ? 'Female' : '' },
    { label: 'Birthday', value: formatBirthday(birthday) },
    { label: 'Relation', value: relationLabel },
    { label: 'Campus', value: campuses.find((c) => c.id === campusId)?.name || '' },
    {
      label: 'Marital status',
      value: maritalStatus === 'married' ? 'Married' : maritalStatus === 'single' ? 'Single' : '',
    },
    ...(maritalStatus === 'married' && marriageDate
      ? [{ label: 'Date of marriage', value: formatBirthday(marriageDate) }]
      : []),
    ...(phone ? [{ label: 'Phone', value: phone }] : []),
    ...(whatsappSame && phone
      ? [{ label: 'WhatsApp', value: `${phone} (same as phone)` }]
      : whatsapp
        ? [{ label: 'WhatsApp', value: whatsapp }]
        : []),
  ].filter((row) => row.value);

  const handleWhatsappToggle = (checked: boolean) => {
    setWhatsappSame(checked);
    if (checked) setWhatsapp(phone);
  };

  const handlePhotoUpload = async (file: File) => {
    const dataUrl = await fileToDataUrl(file);
    setProfilePhoto(dataUrl);
    return { success: true };
  };

  const resetForm = () => {
    setStep(1);
    setFirstName('');
    setMiddleName('');
    setLastName('');
    setGender('');
    setBirthday('');
    setCampusId('');
    setMaritalStatus('');
    setMarriageDate('');
    setPhone('');
    setWhatsapp('');
    setWhatsappSame(false);
    setRelation('');
    setOtherRelation('');
    setProfilePhoto('');
  };

  const handleAddSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (step !== 4) return;
    setSubmitting(true);
    const res = await addLinkedProfile({
      firstName,
      middleName,
      lastName,
      gender,
      birthday,
      maritalStatus,
      marriageDate,
      campusId,
      phone,
      whatsapp: whatsappSame ? phone : whatsapp,
      parentRelation: relation === 'other' ? otherRelation : relation,
    });
    setSubmitting(false);
    if (res.success) {
      if (res.id && profilePhoto) {
        setStoredAvatar(res.id, profilePhoto);
      }
      onOpenChange(false);
      resetForm();
    } else {
      alert(res.error);
    }
  };

  const canProceedStep1 =
    firstName &&
    lastName &&
    gender &&
    birthday &&
    !isFutureBirthday(birthday);
  const canProceedStep2 =
    campusId && maritalStatus && relation && (relation !== 'other' || otherRelation.trim() !== '');

  return (
    <Dialog
      open={open}
      onOpenChange={(isOpen) => {
        onOpenChange(isOpen);
        if (!isOpen) resetForm();
      }}
    >
      <DialogContent className="max-w-md rounded-[24px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Add Family Member</DialogTitle>
        </DialogHeader>

        {/* Step Indicator */}
        <div className="flex items-center justify-center gap-2 my-2">
          {[1, 2, 3, 4].map((s) => (
            <div key={s} className="flex items-center gap-2">
              <div
                className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold transition-all ${
                  step > s
                    ? 'bg-primary text-primary-foreground'
                    : step === s
                      ? 'bg-primary/20 text-primary border-2 border-primary'
                      : 'bg-muted text-muted-foreground'
                }`}
              >
                {step > s ? <Check className="w-3 h-3" /> : s}
              </div>
              {s < 4 && (
                <div className={`w-6 sm:w-8 h-[2px] ${step > s ? 'bg-primary' : 'bg-muted'} transition-all`} />
              )}
            </div>
          ))}
        </div>
        <p className="text-center text-[11px] text-muted-foreground -mt-1 mb-1">
          {step === 1 && 'Personal information'}
          {step === 2 && 'Relation & campus'}
          {step === 3 && 'Contact'}
          {step === 4 && 'Confirm profile'}
        </p>

        <form onSubmit={handleAddSubmit} className="space-y-4 py-2">
          {step === 1 && (
            <div className="space-y-4 animate-in fade-in zoom-in-95 duration-200">
              <div className="flex flex-col items-center gap-2">
                <AvatarUploader onUpload={handlePhotoUpload}>
                  <button
                    type="button"
                    className="group relative outline-none focus-visible:ring-2 focus-visible:ring-[#8B2323]/40 rounded-full"
                    aria-label="Add profile photo"
                  >
                    <div className="h-20 w-20 rounded-full overflow-hidden border-2 border-[#E5D5C5] bg-[#F3EAE1] shadow-sm">
                      {profilePhoto ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={profilePhoto} alt="Profile" className="h-full w-full object-cover" />
                      ) : (
                        <div className="flex h-full w-full flex-col items-center justify-center text-[#8B2323]/70">
                          <Camera className="h-6 w-6" />
                        </div>
                      )}
                    </div>
                    <span className="absolute bottom-0 right-0 flex h-7 w-7 items-center justify-center rounded-full border border-white bg-[#8B2323] text-white shadow-md">
                      <Pencil className="h-3 w-3" strokeWidth={2.5} />
                    </span>
                  </button>
                </AvatarUploader>
                <p className="text-[11px] text-muted-foreground">
                  {profilePhoto ? 'Tap to change photo' : 'Add a profile photo (optional)'}
                </p>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>First Name *</Label>
                  <Input
                    required
                    value={firstName}
                    onChange={(e) => setFirstName(e.target.value)}
                    placeholder="e.g. Noah"
                    className="rounded-xl"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Middle Name</Label>
                  <Input
                    value={middleName}
                    onChange={(e) => setMiddleName(e.target.value)}
                    placeholder="Optional"
                    className="rounded-xl"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Last Name *</Label>
                <Input
                  required
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
                  placeholder="e.g. Smith"
                  className="rounded-xl"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Gender *</Label>
                  <Select value={gender} onValueChange={(v: 'male' | 'female') => setGender(v)}>
                    <SelectTrigger className="rounded-xl">
                      <SelectValue placeholder="Select" />
                    </SelectTrigger>
                    <SelectContent className="rounded-xl">
                      <SelectItem value="male">Male</SelectItem>
                      <SelectItem value="female">Female</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Birthday *</Label>
                  <Input
                    type="date"
                    required
                    max={getMaxBirthdayDate()}
                    value={birthday}
                    onChange={(e) => setBirthday(e.target.value)}
                    className="rounded-xl"
                  />
                  {birthday && isFutureBirthday(birthday) && (
                    <p className="text-xs text-destructive">Birthday cannot be in the future.</p>
                  )}
                </div>
              </div>
              <DialogFooter className="pt-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => onOpenChange(false)}
                  className="rounded-full flex-1"
                >
                  Cancel
                </Button>
                <Button
                  type="button"
                  disabled={!canProceedStep1}
                  onClick={() => setStep(2)}
                  className="rounded-full flex-1 bg-[#8B2323] hover:bg-[#721515] gap-2"
                >
                  Next <ArrowRight className="w-4 h-4" />
                </Button>
              </DialogFooter>
            </div>
          )}

          {step === 2 && (
            <div className="space-y-4 animate-in fade-in zoom-in-95 duration-200">
              <div className="space-y-2">
                <Label>Relation to You *</Label>
                <Select value={relation} onValueChange={setRelation}>
                  <SelectTrigger className="rounded-xl">
                    <SelectValue placeholder="Select relation" />
                  </SelectTrigger>
                  <SelectContent className="rounded-xl">
                    <SelectItem value="father">Father</SelectItem>
                    <SelectItem value="mother">Mother</SelectItem>
                    <SelectItem value="son">Son</SelectItem>
                    <SelectItem value="daughter">Daughter</SelectItem>
                    <SelectItem value="brother">Brother</SelectItem>
                    <SelectItem value="sister">Sister</SelectItem>
                    <SelectItem value="grandfather">Grandfather</SelectItem>
                    <SelectItem value="grandmother">Grandmother</SelectItem>
                    <SelectItem value="other">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {relation === 'other' && (
                <div className="space-y-2 animate-in slide-in-from-top-2">
                  <Label>Specify Relation *</Label>
                  <Input
                    value={otherRelation}
                    onChange={(e) => setOtherRelation(e.target.value)}
                    className="rounded-xl"
                    placeholder="e.g. Uncle, Cousin"
                  />
                </div>
              )}

              <div className="space-y-2">
                <Label>Campus *</Label>
                <Select value={campusId} onValueChange={setCampusId}>
                  <SelectTrigger className="rounded-xl">
                    <SelectValue placeholder="Select a campus" />
                  </SelectTrigger>
                  <SelectContent className="rounded-xl">
                    {campuses.map((c) => (
                      <SelectItem key={c.id} value={c.id}>
                        {c.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-3">
                <Label>Marital Status *</Label>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => setMaritalStatus('single')}
                    className={`p-3 rounded-xl border-2 transition-all text-center ${
                      maritalStatus === 'single'
                        ? 'border-primary bg-primary/10 text-primary'
                        : 'border-border hover:border-primary/50'
                    }`}
                  >
                    <User className="w-5 h-5 mx-auto mb-1" />
                    <span className="text-xs font-medium">Single</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setMaritalStatus('married')}
                    className={`p-3 rounded-xl border-2 transition-all text-center ${
                      maritalStatus === 'married'
                        ? 'border-primary bg-primary/10 text-primary'
                        : 'border-border hover:border-primary/50'
                    }`}
                  >
                    <Heart className="w-5 h-5 mx-auto mb-1" />
                    <span className="text-xs font-medium">Married</span>
                  </button>
                </div>
              </div>

              {maritalStatus === 'married' && (
                <div className="space-y-2 animate-in slide-in-from-top-2">
                  <Label>Date of Marriage</Label>
                  <Input
                    type="date"
                    value={marriageDate}
                    onChange={(e) => setMarriageDate(e.target.value)}
                    className="rounded-xl"
                  />
                </div>
              )}

              <DialogFooter className="pt-4 flex gap-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setStep(1)}
                  className="rounded-full flex-1 gap-2"
                >
                  <ArrowLeft className="w-4 h-4" /> Back
                </Button>
                <Button
                  type="button"
                  disabled={!canProceedStep2}
                  onClick={() => setStep(3)}
                  className="rounded-full flex-1 bg-[#8B2323] hover:bg-[#721515] gap-2"
                >
                  Next <ArrowRight className="w-4 h-4" />
                </Button>
              </DialogFooter>
            </div>
          )}

          {step === 3 && (
            <div className="space-y-4 animate-in fade-in zoom-in-95 duration-200">
              <div className="space-y-2">
                <Label>Phone Number (Optional for children)</Label>
                <div className="relative">
                  <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    type="tel"
                    value={phone}
                    onChange={(e) => {
                      setPhone(e.target.value);
                      if (whatsappSame) setWhatsapp(e.target.value);
                    }}
                    placeholder="e.g. +91 99999 99999"
                    className="pl-9 rounded-xl"
                  />
                </div>
              </div>

              <div className="flex items-center gap-2">
                <Checkbox
                  id="whatsapp-same-switcher"
                  checked={whatsappSame}
                  onCheckedChange={(c) => handleWhatsappToggle(!!c)}
                />
                <Label htmlFor="whatsapp-same-switcher" className="cursor-pointer text-sm font-medium">
                  WhatsApp number is the same
                </Label>
              </div>

              {!whatsappSame && (
                <div className="space-y-2 animate-in slide-in-from-top-2">
                  <Label>WhatsApp Number</Label>
                  <Input
                    type="tel"
                    value={whatsapp}
                    onChange={(e) => setWhatsapp(e.target.value)}
                    placeholder="e.g. +91 99999 99999"
                    className="rounded-xl"
                  />
                </div>
              )}

              <DialogFooter className="pt-4 flex gap-2 sm:flex-col">
                <Button
                  type="button"
                  disabled={false}
                  onClick={() => setStep(4)}
                  className="rounded-full w-full bg-[#8B2323] hover:bg-[#721515] gap-2 order-1"
                >
                  Next <ArrowRight className="w-4 h-4" />
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setStep(2)}
                  className="rounded-full w-full gap-2 order-2"
                >
                  <ArrowLeft className="w-4 h-4" /> Back
                </Button>
              </DialogFooter>
            </div>
          )}

          {step === 4 && (
            <div className="space-y-4 animate-in fade-in zoom-in-95 duration-200">
              <p className="text-sm text-muted-foreground text-center">
                Confirm this profile, then submit for pastor approval.
              </p>

              <div className="flex flex-col items-center gap-3">
                <div className="relative h-40 w-40 overflow-hidden rounded-[1.75rem] border border-[#E5D5C5]/80 bg-white shadow-[0_8px_30px_-8px_rgba(92,17,17,0.25)]">
                  {profilePhoto ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={profilePhoto}
                      alt={displayName}
                      className="absolute inset-0 h-full w-full object-cover"
                    />
                  ) : (
                    <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-[#8B2323] to-[#5C1111]">
                      <span className="text-3xl font-bold text-white/90">{initials}</span>
                    </div>
                  )}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/55 via-black/10 to-transparent" />
                  <div className="absolute inset-x-0 bottom-0 p-3 text-center">
                    <span className="text-sm font-semibold leading-snug text-white drop-shadow-md">
                      {displayName}
                    </span>
                  </div>
                </div>

                <AvatarUploader onUpload={handlePhotoUpload}>
                  <button type="button" className="text-xs font-semibold text-[#8B2323] hover:underline">
                    {profilePhoto ? 'Change photo' : 'Add a photo'}
                  </button>
                </AvatarUploader>

                <div className="w-full rounded-xl border border-[#E5D5C5]/60 bg-[#FAF7F2] px-4 py-3 space-y-2.5">
                  <p className="text-xs font-bold uppercase tracking-wider text-[#7A6150]">
                    Profile details
                  </p>
                  {confirmDetails.map((row) => (
                    <div
                      key={row.label}
                      className="flex items-start justify-between gap-3 text-sm border-b border-[#E5D5C5]/40 pb-2 last:border-0 last:pb-0"
                    >
                      <span className="text-[#7A6150] shrink-0">{row.label}</span>
                      <span className="font-medium text-[#1A202C] text-right">{row.value}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="rounded-lg bg-amber-50 p-3">
                <p className="text-xs text-amber-800 leading-relaxed">
                  By submitting this, the profile will be sent to the Campus Pastor for approval.
                </p>
              </div>

              <DialogFooter className="pt-2 flex gap-2 sm:flex-col">
                <Button
                  type="submit"
                  disabled={submitting}
                  className="rounded-full w-full bg-[#8B2323] hover:bg-[#721515] order-1"
                >
                  {submitting ? 'Submitting...' : 'Submit Request'}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setStep(3)}
                  className="rounded-full w-full gap-2 order-2"
                >
                  <ArrowLeft className="w-4 h-4" /> Back
                </Button>
              </DialogFooter>
            </div>
          )}
        </form>
      </DialogContent>
    </Dialog>
  );
}
