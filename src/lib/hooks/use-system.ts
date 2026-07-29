import { useState } from 'react';
import { SystemSettings, FlipCardConfig } from '@/lib/types';

const defaultFlipCardConfig: FlipCardConfig = {
  isActive: true,
  items: [
    { id: '1', type: 'custom', title: 'Welcome to Grace', description: 'Join us for worship this Sunday.', buttonText: 'Plan a Visit', buttonLink: '/visit' }
  ]
};

export function useSystem() {
  const [systemSettings, setSystemSettings] = useState<SystemSettings>({
    minAppVersion: '1.0.0',
    minAppVersionAndroid: '1.0.0',
    minAppVersionIos: '1.0.0',
  });
  const [flipCardConfig, setFlipCardConfig] = useState<FlipCardConfig>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('grace_flipCardConfig');
      if (saved) {
        try {
          return JSON.parse(saved);
        } catch (e) {
          console.error("Error parsing flip card config", e);
        }
      }
    }
    return defaultFlipCardConfig;
  });

  const updateFlipCardConfig = (config: FlipCardConfig) => {
    setFlipCardConfig(config);
    if (typeof window !== 'undefined') {
      localStorage.setItem('grace_flipCardConfig', JSON.stringify(config));
    }
  };

  return {
    systemSettings,
    setSystemSettings,
    flipCardConfig,
    setFlipCardConfig,
    updateFlipCardConfig,
  };
}
