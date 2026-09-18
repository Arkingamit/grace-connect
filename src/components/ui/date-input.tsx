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
      <div className="w-full min-w-0 space-y-1">
        <div className="relative flex min-w-0 items-center overflow-hidden">
          <Input
            ref={ref}
            id={id}
            type="text"
            inputMode="numeric"
            size={10}
            placeholder={placeholder}
            value={displayValue}
            onChange={handleTextChange}
            onBlur={handleBlur}
            onFocus={handleFocus}
            maxLength={10}
            disabled={disabled}
            required={required}
            className={cn(
              "min-w-0 pr-10 text-sm tracking-wide placeholder:tracking-normal",
              localError && "border-destructive focus-visible:ring-destructive",
              className
            )}
          />
          <div className="absolute right-2 top-1/2 z-10 flex h-7 w-7 shrink-0 -translate-y-1/2 items-center overflow-hidden">
            <button
              type="button"
              onClick={handleCalendarClick}
              disabled={disabled}
              className="relative flex h-7 w-7 items-center justify-center overflow-hidden rounded-md text-muted-foreground transition-colors hover:bg-muted/50 hover:text-foreground focus:outline-none disabled:cursor-not-allowed"
              title="Choose date from calendar"
              tabIndex={-1}
            >
              <Calendar className="pointer-events-none h-4 w-4 text-muted-foreground" />
              <input
                ref={pickerRef}
                type="date"
                max={max}
                min={min}
                value={value && /^\d{4}-\d{2}-\d{2}$/.test(value) ? value : ''}
                onChange={handlePickerChange}
                disabled={disabled}
                className="absolute inset-0 h-7 w-7 max-w-7 min-w-0 cursor-pointer p-0 opacity-0 [appearance:none] [color-scheme:light] [&::-webkit-calendar-picker-indicator]:absolute [&::-webkit-calendar-picker-indicator]:inset-0 [&::-webkit-calendar-picker-indicator]:m-0 [&::-webkit-calendar-picker-indicator]:h-full [&::-webkit-calendar-picker-indicator]:w-full [&::-webkit-calendar-picker-indicator]:cursor-pointer [&::-webkit-calendar-picker-indicator]:opacity-0 [&::-webkit-date-and-time-value]:hidden [&::-webkit-datetime-edit]:hidden"
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
