"use client";

import { useAuth } from '@/lib/auth-context';
import { useAdminData } from '@/lib/admin-data-context';
import { Button } from './button';
import Link from 'next/link';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from './dropdown-menu';
import { Avatar, AvatarFallback } from './avatar';
import { UserPlus, UserCircle, Check, ArrowRight, ArrowLeft, Heart, User, Building2, Phone } from 'lucide-react';
import { useState } from 'react';
import { Checkbox } from './checkbox';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from './dialog';
import { Input } from './input';
import { Label } from './label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './select';

export function ProfileSwitcher() {
  const { session, getSessionMember, linkedProfiles, switchProfile, addLinkedProfile, logout } = useAuth();
  const { campuses } = useAdminData();
  const activeMember = getSessionMember();
  const [isAdding, setIsAdding] = useState(false);
  
  // Add profile form state
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
  
  const [submitting, setSubmitting] = useState(false);

  const handleWhatsappToggle = (checked: boolean) => {
    setWhatsappSame(checked);
    if (checked) setWhatsapp(phone);
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
  };

  if (!session || !activeMember) return null;

  const getInitials = (name: string) => name.substring(0, 2).toUpperCase();

  const handleAddSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
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
    });
    setSubmitting(false);
    if (res.success) {
      setIsAdding(false);
      resetForm();
    } else {
      alert(res.error);
    }
  };

  const canProceedStep1 = firstName && lastName && gender && birthday;
  const canProceedStep2 = campusId && maritalStatus;
  const canProceedStep3 = phone && (whatsapp || whatsappSame);

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button className="w-10 h-10 rounded-full bg-[#721515] flex items-center justify-center border border-[#E5D5C5]/60 shadow-sm outline-none">
            <span className="text-xs font-bold text-white uppercase">{getInitials((activeMember as any).name || activeMember.firstName)}</span>
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-64 rounded-2xl p-2 border-[#E5D5C5]">
          <DropdownMenuLabel className="font-bold text-[#1A202C]">{(activeMember as any).name || `${activeMember.firstName} ${activeMember.lastName}`}</DropdownMenuLabel>
          <DropdownMenuSeparator />

          <DropdownMenuItem asChild className="rounded-xl cursor-pointer">
            <Link href="/profile">My Profile</Link>
          </DropdownMenuItem>
          {['admin', 'superadmin', 'super_admin', 'staff', 'group_leader', 'campus_leader'].includes(session.role?.toLowerCase() || '') && (
            <DropdownMenuItem asChild className="rounded-xl cursor-pointer text-[#8B2323] font-bold">
              <Link href="/admin">Admin Panel</Link>
            </DropdownMenuItem>
          )}

          <DropdownMenuSeparator />
          
          <DropdownMenuLabel className="text-[10px] text-muted-foreground uppercase tracking-wider px-2 pt-2">Switch Profile</DropdownMenuLabel>
          
          <DropdownMenuItem onClick={() => switchProfile(null)} className="rounded-xl flex items-center gap-2 cursor-pointer">
            <Avatar className="w-6 h-6">
              <AvatarFallback className="text-[10px]">{getInitials(session.name)}</AvatarFallback>
            </Avatar>
            <span className="flex-1 truncate text-sm">{session.name} <span className="text-xs text-muted-foreground">(You)</span></span>
            {!linkedProfiles.find(p => p.id === activeMember.id) && <Check className="w-4 h-4 text-primary" />}
          </DropdownMenuItem>

          {linkedProfiles.map((profile) => (
            <DropdownMenuItem key={profile.id} onClick={() => switchProfile(profile.id)} className="rounded-xl flex items-center gap-2 cursor-pointer">
              <Avatar className="w-6 h-6">
                <AvatarFallback className="text-[10px] bg-muted">{getInitials(profile.name)}</AvatarFallback>
              </Avatar>
              <span className="flex-1 truncate text-sm">{profile.name}</span>
              {activeMember.id === profile.id && <Check className="w-4 h-4 text-primary" />}
            </DropdownMenuItem>
          ))}

          <DropdownMenuItem onClick={() => setIsAdding(true)} className="rounded-xl gap-2 cursor-pointer text-primary mt-1">
            <UserPlus className="w-4 h-4" />
            <span className="text-sm">Add Family Member</span>
          </DropdownMenuItem>

          <DropdownMenuSeparator />
          <DropdownMenuItem
            onClick={async () => {
              await logout();
              window.location.href = '/';
            }}
            className="rounded-xl cursor-pointer text-red-600 font-bold focus:text-red-600"
          >
            Logout
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <Dialog open={isAdding} onOpenChange={(open) => {
        setIsAdding(open);
        if (!open) resetForm();
      }}>
        <DialogContent className="max-w-md rounded-[24px]">
          <DialogHeader>
            <DialogTitle>Add Family Member</DialogTitle>
          </DialogHeader>

          {/* Step Indicator */}
          <div className="flex items-center justify-center gap-2 my-2">
            {[1, 2, 3].map(s => (
              <div key={s} className="flex items-center gap-2">
                <div className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold transition-all ${
                  step > s ? 'bg-primary text-primary-foreground' : step === s ? 'bg-primary/20 text-primary border-2 border-primary' : 'bg-muted text-muted-foreground'
                }`}>
                  {step > s ? <Check className="w-3 h-3" /> : s}
                </div>
                {s < 3 && <div className={`w-8 h-[2px] ${step > s ? 'bg-primary' : 'bg-muted'} transition-all`} />}
              </div>
            ))}
          </div>

          <form onSubmit={handleAddSubmit} className="space-y-4 py-2">
            
            {step === 1 && (
              <div className="space-y-4 animate-in fade-in zoom-in-95 duration-200">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>First Name *</Label>
                    <Input required value={firstName} onChange={e => setFirstName(e.target.value)} placeholder="e.g. Noah" className="rounded-xl" />
                  </div>
                  <div className="space-y-2">
                    <Label>Middle Name</Label>
                    <Input value={middleName} onChange={e => setMiddleName(e.target.value)} placeholder="Optional" className="rounded-xl" />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Last Name *</Label>
                  <Input required value={lastName} onChange={e => setLastName(e.target.value)} placeholder="e.g. Smith" className="rounded-xl" />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Gender *</Label>
                    <Select value={gender} onValueChange={(v: 'male'|'female') => setGender(v)}>
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
                    <Input type="date" required value={birthday} onChange={e => setBirthday(e.target.value)} className="rounded-xl" />
                  </div>
                </div>
                <DialogFooter className="pt-4">
                  <Button type="button" variant="outline" onClick={() => setIsAdding(false)} className="rounded-full flex-1">Cancel</Button>
                  <Button type="button" disabled={!canProceedStep1} onClick={() => setStep(2)} className="rounded-full flex-1 bg-[#8B2323] hover:bg-[#721515] gap-2">
                    Next <ArrowRight className="w-4 h-4" />
                  </Button>
                </DialogFooter>
              </div>
            )}

            {step === 2 && (
              <div className="space-y-4 animate-in fade-in zoom-in-95 duration-200">
                <div className="space-y-2">
                  <Label>Campus *</Label>
                  <Select value={campusId} onValueChange={setCampusId}>
                    <SelectTrigger className="rounded-xl">
                      <SelectValue placeholder="Select a campus" />
                    </SelectTrigger>
                    <SelectContent className="rounded-xl">
                      {campuses.map(c => (
                        <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
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
                        maritalStatus === 'single' ? 'border-primary bg-primary/10 text-primary' : 'border-border hover:border-primary/50'
                      }`}
                    >
                      <User className="w-5 h-5 mx-auto mb-1" />
                      <span className="text-xs font-medium">Single</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setMaritalStatus('married')}
                      className={`p-3 rounded-xl border-2 transition-all text-center ${
                        maritalStatus === 'married' ? 'border-primary bg-primary/10 text-primary' : 'border-border hover:border-primary/50'
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
                    <Input type="date" value={marriageDate} onChange={e => setMarriageDate(e.target.value)} className="rounded-xl" />
                  </div>
                )}
                
                <DialogFooter className="pt-4 flex gap-2">
                  <Button type="button" variant="outline" onClick={() => setStep(1)} className="rounded-full flex-1 gap-2">
                    <ArrowLeft className="w-4 h-4" /> Back
                  </Button>
                  <Button type="button" disabled={!canProceedStep2} onClick={() => setStep(3)} className="rounded-full flex-1 bg-[#8B2323] hover:bg-[#721515] gap-2">
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
                    <Input type="tel" value={phone} onChange={e => { setPhone(e.target.value); if(whatsappSame) setWhatsapp(e.target.value); }} placeholder="e.g. +91 99999 99999" className="pl-9 rounded-xl" />
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <Checkbox id="whatsapp-same-switcher" checked={whatsappSame} onCheckedChange={(c) => handleWhatsappToggle(!!c)} />
                  <Label htmlFor="whatsapp-same-switcher" className="cursor-pointer text-sm font-medium">
                    WhatsApp number is the same
                  </Label>
                </div>

                {!whatsappSame && (
                  <div className="space-y-2 animate-in slide-in-from-top-2">
                    <Label>WhatsApp Number</Label>
                    <Input type="tel" value={whatsapp} onChange={e => setWhatsapp(e.target.value)} placeholder="e.g. +91 99999 99999" className="rounded-xl" />
                  </div>
                )}
                
                <div className="rounded-lg bg-amber-50 p-3 mt-4">
                  <p className="text-xs text-amber-800 leading-relaxed">
                    By submitting this, the profile will be sent to the Campus Leader for approval.
                  </p>
                </div>

                <DialogFooter className="pt-4 flex gap-2">
                  <Button type="button" variant="outline" onClick={() => setStep(2)} className="rounded-full flex-1 gap-2">
                    <ArrowLeft className="w-4 h-4" /> Back
                  </Button>
                  <Button type="submit" disabled={submitting} className="rounded-full flex-1 bg-[#8B2323] hover:bg-[#721515]">
                    {submitting ? 'Submitting...' : 'Submit Request'}
                  </Button>
                </DialogFooter>
              </div>
            )}
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}
