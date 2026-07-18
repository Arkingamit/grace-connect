"use client";

import { useAuth } from '@/lib/auth-context';
import { useAdminData } from '@/lib/admin-data-context';
import { Button } from './button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from './dialog';
import { Input } from './input';
import { Label } from './label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './select';
import { Checkbox } from './checkbox';
import { Check, ArrowRight, ArrowLeft, Heart, User, Phone } from 'lucide-react';
import { useState } from 'react';

interface AddFamilyMemberDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function AddFamilyMemberDialog({ open, onOpenChange }: AddFamilyMemberDialogProps) {
  const { addLinkedProfile } = useAuth();
  const { campuses } = useAdminData();
  
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
      onOpenChange(false);
      resetForm();
    } else {
      alert(res.error);
    }
  };

  const canProceedStep1 = firstName && lastName && gender && birthday;
  const canProceedStep2 = campusId && maritalStatus;

  return (
    <Dialog open={open} onOpenChange={(isOpen) => {
      onOpenChange(isOpen);
      if (!isOpen) resetForm();
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
                <Button type="button" variant="outline" onClick={() => onOpenChange(false)} className="rounded-full flex-1">Cancel</Button>
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
  );
}
