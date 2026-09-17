"use client";

import React, { useState, useEffect, useRef } from 'react';
import { Input } from '@/components/ui/input';
import { Calendar } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface DateInputProps {
  value?: string;
  onChange: (isoDate: string) => void;
  max?: string;
  min?: string;
  placeholder?: string;
  className?: string;
  disabled?: boolean;
  required?: boolean;
  id?: string;
}

export function formatDigitsToDDMMYYYY(digits: string): string {
  if (digits.length <= 2) return digits;
  if (digits.length <= 4) return `${digits.slice(0, 2)}/${digits.slice(2)}`;
  return `${digits.slice(0, 2)}/${digits.slice(2, 4)}/${digits.slice(4, 8)}`;
}

export function isoToDDMMYYYY(iso: string): string {
  if (!iso) return '';
  if (/^\d{4}-\d{2}-\d{2}$/.test(iso)) {
    const [y, m, d] = iso.split('-');
    return `${d}/${m}/${y}`;
  }
  return iso;
}

export const DateInput = React.forwardRef<HTMLInputElement, DateInputProps>(
  (
    {
      value = '',
      onChange,
      max,
      min,
      placeholder = 'DD/MM/YYYY',
      className,
      disabled = false,
      required = false,
      id,
    },
    ref
  ) => {
    const [displayValue, setDisplayValue] = useState(() => isoToDDMMYYYY(value));
    const [localError, setLocalError] = useState('');
    const pickerRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
      if (value) {
        setDisplayValue(isoToDDMMYYYY(value));
      } else {
        setDisplayValue('');
      }
    }, [value]);

    const handleTextChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const raw = e.target.value;
      const digits = raw.replace(/\D/g, '').slice(0, 8);
      const formatted = formatDigitsToDDMMYYYY(digits);
      setDisplayValue(formatted);

      if (digits.length === 8) {
        const d = parseInt(digits.slice(0, 2), 10);
        const m = parseInt(digits.slice(2, 4), 10);
        const y = parseInt(digits.slice(4, 8), 10);

        if (m >= 1 && m <= 12 && d >= 1 && d <= 31 && y >= 1900 && y <= 2100) {
          const daysInMonth = new Date(y, m, 0).getDate();
          if (d <= daysInMonth) {
            const iso = `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
            setLocalError('');
            onChange(iso);
            return;
          }
        }
        setLocalError('Invalid date (DD/MM/YYYY)');
        onChange('');
      } else {
        setLocalError('');
        onChange('');
      }
    };

    const handleBlur = () => {
      const digits = displayValue.replace(/\D/g, '');
      if (digits.length > 0 && digits.length < 8) {
        setLocalError('Please enter a complete date (DD/MM/YYYY)');
      }
    };

    const handleFocus = () => {
      if (localError === 'Please enter a complete date (DD/MM/YYYY)') {
        setLocalError('');
      }
    };

    const handlePickerChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const iso = e.target.value;
      if (iso && /^\d{4}-\d{2}-\d{2}$/.test(iso)) {
        setDisplayValue(isoToDDMMYYYY(iso));
        setLocalError('');
        onChange(iso);
      }
    };

    const handleCalendarClick = () => {
      if (disabled) return;
      if (pickerRef.current && typeof pickerRef.current.showPicker === 'function') {
        try {
          pickerRef.current.showPicker();
        } catch {
          // fallback
        }
      }
    };

    return (
      <div className="space-y-1">
        <div className="relative flex items-center">
          <Input
            ref={ref}
            id={id}
            type="text"
            inputMode="numeric"
            placeholder={placeholder}
            value={displayValue}
            onChange={handleTextChange}
            onBlur={handleBlur}
            onFocus={handleFocus}
            maxLength={10}
            disabled={disabled}
            required={required}
            className={cn(
              "pr-10 tracking-wider placeholder:tracking-normal",
              localError && "border-destructive focus-visible:ring-destructive",
              className
            )}
          />
          <div className="absolute right-2.5 top-1/2 -translate-y-1/2 flex items-center">
            <button
              type="button"
              onClick={handleCalendarClick}
              disabled={disabled}
              className="relative flex items-center justify-center w-7 h-7 text-muted-foreground hover:text-foreground cursor-pointer rounded-md hover:bg-muted/50 transition-colors focus:outline-none"
              title="Choose date from calendar"
              tabIndex={-1}
            >
              <Calendar className="w-4 h-4 text-muted-foreground pointer-events-none" />
              <input
                ref={pickerRef}
                type="date"
                max={max}
                min={min}
                value={value && /^\d{4}-\d{2}-\d{2}$/.test(value) ? value : ''}
                onChange={handlePickerChange}
                disabled={disabled}
                className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
                title="Choose date from calendar"
                tabIndex={-1}
                aria-hidden="true"
              />
            </button>
          </div>
        </div>
        {localError && (
          <p className="text-xs text-destructive">{localError}</p>
        )}
      </div>
    );
  }
);

DateInput.displayName = 'DateInput';
