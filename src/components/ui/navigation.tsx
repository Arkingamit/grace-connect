"use client";

import React, { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { useAuth } from '@/lib/auth-context';
import { Button } from '@/components/ui/button';
import { ProfileSwitcher } from './profile-switcher';

const AnimatedNavLink = ({ href, children }: { href: string; children: React.ReactNode }) => {
  const defaultTextColor = 'text-muted-foreground';
  const hoverTextColor = 'text-primary';
  const textSizeClass = 'text-sm';

  const content = (
    <div className={`group relative overflow-hidden h-5 flex items-start ${textSizeClass}`}>
      <div className="flex flex-col transition-transform duration-400 ease-out transform group-hover:-translate-y-1/2">
        <span className={`${defaultTextColor} h-5 flex items-center`}>{children}</span>
        <span className={`${hoverTextColor} h-5 flex items-center`}>{children}</span>
      </div>
    </div>
  );

  if (href.startsWith("/")) {
    return <Link href={href} className="flex">{content}</Link>;
  }

  return <a href={href} className="flex">{content}</a>;
};

export const Navigation = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [headerShapeClass, setHeaderShapeClass] = useState('rounded-full');
  const shapeTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const [isScrolledDown, setIsScrolledDown] = useState(false);
  const [lastScrollY, setLastScrollY] = useState(0);

  const { session } = useAuth();

  useEffect(() => {
    const handleScroll = () => {
      const currentScrollY = window.scrollY;
      if (currentScrollY > lastScrollY && currentScrollY > 80) {
        setIsScrolledDown(true);
      } else {
        setIsScrolledDown(false);
      }
      setLastScrollY(currentScrollY);
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, [lastScrollY]);

  const toggleMenu = () => {
    setIsOpen(!isOpen);
  };

  useEffect(() => {
    if (shapeTimeoutRef.current) {
      clearTimeout(shapeTimeoutRef.current);
    }

    if (isOpen) {
      setHeaderShapeClass('rounded-2xl');
    } else {
      shapeTimeoutRef.current = setTimeout(() => {
        setHeaderShapeClass('rounded-full');
      }, 300);
    }

    return () => {
      if (shapeTimeoutRef.current) {
        clearTimeout(shapeTimeoutRef.current);
      }
    };
  }, [isOpen]);

  const navLinksData = [
    { label: 'Events', href: '/#events' },
    { label: 'Sermons', href: '/#sermons' },
    { label: 'Notes', href: '/#notes' },
    { label: 'Gallery', href: '/#gallery' },
    { label: 'Prayer Wall', href: '/#prayer-wall' },
  ];

  const logoElement = (
    <Link href="/" className="flex items-center space-x-2 group cursor-pointer mr-auto sm:mr-10">
      <div className="w-8 h-8 sm:w-14 sm:h-14 flex items-center justify-center shrink-0">
        <img
          src="/logo.png"
          alt="Grace Logo"
          className="w-20 h-0 sm:w-16 sm:h-16 object-contain opacity-90"
        />
      </div>
    </Link>
  );

  const loginButtonElement = (
    <Link href="/login" className="w-full sm:w-auto">
      <Button variant="outline" size="sm" className="w-full font-medium">
        Sign In
      </Button>
    </Link>
  );

  const signupButtonElement = (
    <Link href="/register" className="w-full sm:w-auto">
      <Button variant="default" size="sm" className="w-full shadow-sm font-semibold">
        Signup
      </Button>
    </Link>
  );

  return (
    <header
      className={`fixed top-4 left-0 right-0 mx-auto z-50
                       flex flex-col items-center
                       px-3 sm:px-6 lg:px-10 py-2 sm:py-3 backdrop-blur-md shadow-lg
                       rounded-[2rem] md:rounded-full
                       border border-border bg-card/95
                       w-[calc(100%-2rem)] md:min-w-[700px] lg:min-w-[900px] md:w-max max-w-5xl
                       transition-[border-radius,transform,opacity] duration-300 ease-in-out
                       ${isScrolledDown ? '-translate-y-24 opacity-0 pointer-events-none' : 'translate-y-0 opacity-100 pointer-events-auto'}
                       ${headerShapeClass}`}
    >
      <div className="flex items-center justify-between w-full gap-x-6 sm:gap-x-10">
        <div className="flex items-center">
          {logoElement}
        </div>

        <nav className="hidden md:flex items-center space-x-8">
          {navLinksData.map((link) => (
            <AnimatedNavLink key={link.href} href={link.href}>
              {link.label}
            </AnimatedNavLink>
          ))}
        </nav>

        <div className="hidden md:flex items-center gap-4 ml-auto">
          {session ? (
            <ProfileSwitcher variant="pill" />
          ) : (
            <>
              {loginButtonElement}
              {signupButtonElement}
            </>
          )}
        </div>

        <button
          className="md:hidden flex items-center justify-center w-10 h-10 text-foreground hover:text-primary bg-secondary/10 hover:bg-secondary/20 rounded-full focus:outline-none ml-auto transition-colors"
          onClick={toggleMenu}
          aria-label={isOpen ? 'Close Menu' : 'Open Menu'}
        >
          {isOpen ? (
            <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path></svg>
          ) : (
            <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 12h16M4 18h16"></path></svg>
          )}
        </button>
      </div>

      <div
        className={`md:hidden flex flex-col items-center w-full transition-all ease-in-out duration-300 overflow-y-auto
                       ${isOpen ? 'max-h-[70vh] opacity-100 pt-4 pb-2' : 'max-h-0 opacity-0 pt-0 pb-0 pointer-events-none'}`}
      >
        <nav className="flex flex-col items-center space-y-1 w-full border-t border-border pt-4 mt-2">
          {navLinksData.map((link) => {
            const content = (
              <span className="text-foreground hover:text-primary hover:bg-muted rounded-xl py-3.5 transition-colors w-full text-center font-medium block text-base">
                {link.label}
              </span>
            );

            if (link.href.startsWith("/")) {
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  onClick={() => setIsOpen(false)}
                  className="w-full px-2"
                >
                  {content}
                </Link>
              );
            }

            return (
              <a
                key={link.href}
                href={link.href}
                onClick={() => setIsOpen(false)}
                className="w-full px-2"
              >
                {content}
              </a>
            );
          })}
        </nav>
        <div className="flex flex-col items-center space-y-3 mt-4 w-full border-t border-border pt-6 px-4">
          {session ? (
            <div className="flex w-full justify-center py-1">
              <ProfileSwitcher variant="pill" />
            </div>
          ) : (
            <div className="flex flex-col gap-3 w-full">
              {loginButtonElement}
              {signupButtonElement}
            </div>
          )}
        </div>
      </div>
    </header>
  );
};
