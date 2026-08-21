"use client";

import React, { useState } from 'react';
import ModernLoginSignup from '@/components/ui/modern-login-signup';
import { QRScanner } from '@/components/ui/qr-scanner';

export default function RegisterEntryPage() {
  const [showScanner, setShowScanner] = useState(false);

  return (
    <>
      <ModernLoginSignup
        initialMode="signup"
        loginHref="/login"
        onScanCampus={() => setShowScanner(true)}
        registerHref="/register"
        privacyHref="/privacy-policy"
      />
      {showScanner && <QRScanner onClose={() => setShowScanner(false)} />}
    </>
  );
}
