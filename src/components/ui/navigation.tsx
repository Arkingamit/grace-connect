"use client";

import React, { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import { LogOut, User, Sun, Moon, QrCode, UserPlus, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useTheme } from 'next-themes';
import { AddFamilyMemberDialog } from './add-family-member-dialog';

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

  // Use Next Link for internal routes to ensure navigation is connected.
  if (href.startsWith("/")) {
    return <Link href={href} className="flex">{content}</Link>;
  }

  // Keep hash anchors for in-page navigation.
  return <a href={href} className="flex">{content}</a>;
};

export const Navigation = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [headerShapeClass, setHeaderShapeClass] = useState('rounded-full');
  const { theme, setTheme, resolvedTheme } = useTheme();
  const shapeTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Existing scroll hiding state
  const [isScrolledDown, setIsScrolledDown] = useState(false);
  const [lastScrollY, setLastScrollY] = useState(0);

  // Existing auth state
  const { session, logout, getSessionMember, linkedProfiles, switchProfile } = useAuth();
  const activeMember = getSessionMember();
  const router = useRouter();
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [hasActiveSession, setHasActiveSession] = useState(false);
  const [isAddingMember, setIsAddingMember] = useState(false);

  useEffect(() => {
    if (session) {
      fetch('/api/attendance/active?all=true')
        .then(res => res.json())
        .then(data => {
          if (Array.isArray(data) && data.length > 0) {
            setHasActiveSession(true);
          }
        })
        .catch(() => {});
    }
  }, [session]);

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

  const handleLogout = () => {
    logout();
    setUserMenuOpen(false);
    setIsOpen(false);
    router.push('/');
  };

  const getInitials = (name: string) => {
    return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
  };

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

  const userDropdownElement = session ? (
    <div className="relative">
      <button
        onClick={() => setUserMenuOpen(!userMenuOpen)}
        className="flex items-center gap-2 px-2 py-1.5 rounded-full border border-border bg-card hover:bg-muted hover:border-primary/50 transition-all"
      >
        <div className="w-6 h-6 rounded-full bg-gradient-to-br from-primary/20 to-accent/20 flex items-center justify-center">
          <span className="text-[9px] font-bold text-foreground">{getInitials((activeMember as any)?.name || activeMember?.firstName || session.name)}</span>
        </div>
        <span className="text-sm font-medium text-foreground hidden sm:block max-w-[80px] truncate">{((activeMember as any)?.name || activeMember?.firstName || session.name).split(' ')[0]}</span>
      </button>
      {userMenuOpen && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setUserMenuOpen(false)} />
          <div className="absolute right-0 top-full mt-3 w-48 py-1 rounded-md border border-border bg-card shadow-2xl z-50 overflow-hidden">
            <div className="px-3 py-2.5 border-b border-border bg-muted/30">
              <p className="text-xs text-muted-foreground truncate">{session.email}</p>
            </div>
            {hasActiveSession && (
              <Link
                href="/profile"
                onClick={() => setUserMenuOpen(false)}
                className="w-full flex items-center gap-2 px-3 py-2.5 text-sm font-semibold text-[#8B2323] hover:bg-muted transition-colors border-b border-border"
              >
                <QrCode className="w-4 h-4" /> My ePass
              </Link>
            )}
            {['admin', 'superadmin', 'super_admin', 'staff', 'group_leader', 'campus_leader'].includes(session.role?.toLowerCase() || '') && (
              <Link
                href="/admin"
                onClick={() => setUserMenuOpen(false)}
                className="w-full flex items-center px-3 py-2.5 text-sm text-foreground hover:bg-muted transition-colors"
              >
                Admin Panel
              </Link>
            )}
            <Link
              href="/profile"
              onClick={() => setUserMenuOpen(false)}
              className="w-full flex items-center gap-2 px-3 py-2.5 text-sm text-foreground hover:bg-muted transition-colors"
            >
              <User className="w-4 h-4 text-muted-foreground" /> Profile
            </Link>

            <div className="px-3 py-1.5 mt-1 text-[10px] text-muted-foreground uppercase tracking-wider">Switch Profile</div>
            
            <button
              onClick={() => { switchProfile(null); setUserMenuOpen(false); }}
              className="w-full flex items-center gap-2 px-3 py-2 text-sm text-foreground hover:bg-muted transition-colors text-left"
            >
              <div className="w-5 h-5 rounded-full bg-muted flex items-center justify-center text-[8px] font-bold shrink-0">{getInitials(session.name)}</div>
              <span className="flex-1 truncate">{session.name} <span className="text-[10px] text-muted-foreground">(You)</span></span>
              {!linkedProfiles.find(p => p.id === activeMember?.id) && <Check className="w-3 h-3 text-primary shrink-0" />}
            </button>
            
            {linkedProfiles.map((profile) => (
              <button
                key={profile.id}
                onClick={() => { switchProfile(profile.id); setUserMenuOpen(false); }}
                className="w-full flex items-center gap-2 px-3 py-2 text-sm text-foreground hover:bg-muted transition-colors text-left"
              >
                <div className="w-5 h-5 rounded-full bg-muted flex items-center justify-center text-[8px] font-bold shrink-0">{getInitials(profile.name || profile.firstName)}</div>
                <span className="flex-1 truncate">{profile.name || profile.firstName}</span>
                {activeMember?.id === profile.id && <Check className="w-3 h-3 text-primary shrink-0" />}
              </button>
            ))}

            <button
              onClick={() => {
                setUserMenuOpen(false);
                setIsAddingMember(true);
              }}
              className="w-full flex items-center gap-2 px-3 py-2 text-sm text-foreground hover:bg-muted transition-colors"
            >
              <UserPlus className="w-4 h-4 text-muted-foreground" /> Add Member
            </button>
            <div className="border-t border-border mt-1"></div>
            <button
              onClick={handleLogout}
              className="w-full flex items-center gap-2 px-3 py-2.5 text-sm text-destructive hover:bg-destructive/10 transition-colors"
            >
              <LogOut className="w-4 h-4" /> Sign Out
            </button>
          </div>
        </>
      )}
    </div>
  ) : null;

  return (
    <header className={`fixed top-4 left-0 right-0 mx-auto z-50
                       flex flex-col items-center
                       px-3 sm:px-6 lg:px-10 py-2 sm:py-3 backdrop-blur-md shadow-lg
                       rounded-[2rem] md:rounded-full
                       border border-border bg-card/95
                       w-[calc(100%-2rem)] md:min-w-[700px] lg:min-w-[900px] md:w-max max-w-5xl
                       transition-[border-radius,transform,opacity] duration-300 ease-in-out
                       ${isScrolledDown ? '-translate-y-24 opacity-0 pointer-events-none' : 'translate-y-0 opacity-100 pointer-events-auto'}`}>

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
            userDropdownElement
          ) : (
            <>
              {loginButtonElement}
              {signupButtonElement}
            </>
          )}
        </div>

        <button className="md:hidden flex items-center justify-center w-10 h-10 text-foreground hover:text-primary bg-secondary/10 hover:bg-secondary/20 rounded-full focus:outline-none ml-auto transition-colors" onClick={toggleMenu} aria-label={isOpen ? 'Close Menu' : 'Open Menu'}>
          {isOpen ? (
            <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path></svg>
          ) : (
            <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 12h16M4 18h16"></path></svg>
          )}
        </button>
      </div>

      {/* Mobile Menu Content */}
      <div className={`md:hidden flex flex-col items-center w-full transition-all ease-in-out duration-300 overflow-y-auto
                       ${isOpen ? 'max-h-[70vh] opacity-100 pt-4 pb-2' : 'max-h-0 opacity-0 pt-0 pb-0 pointer-events-none'}`}>
        <nav className="flex flex-col items-center space-y-1 w-full border-t border-border pt-4 mt-2">
          {navLinksData.map((link) => {
            const content = (
              <span className="text-foreground hover:text-primary hover:bg-muted rounded-xl py-3.5 transition-colors w-full text-center font-medium block text-base">
                {link.label}
              </span>
            );

            // Always close mobile menu on any navigation click.
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
            <>
              <div className="flex items-center gap-3 mb-2">
                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-primary/20 to-accent/20 flex items-center justify-center">
                  <span className="text-xs font-bold text-foreground">{getInitials(session.name)}</span>
                </div>
                <div className="flex flex-col">
                  <span className="text-sm font-medium text-foreground">{session.name}</span>
                  <span className="text-xs text-muted-foreground">{session.email}</span>
                </div>
              </div>
              {(session.role === 'admin' || session.role === 'super_admin' || session.role === 'campus_leader') && (
                <Link href="/admin" onClick={() => setIsOpen(false)} className="w-full">
                  <Button variant="outline" className="w-full">Admin Panel</Button>
                </Link>
              )}
              <Link href="/profile" onClick={() => setIsOpen(false)} className="w-full">
                <Button variant="outline" className="w-full">Profile</Button>
              </Link>
              <Button onClick={handleLogout} variant="destructive" className="w-full">Sign Out</Button>
            </>
          ) : (
            <div className="flex flex-col gap-3 w-full">
              {loginButtonElement}
              {signupButtonElement}
            </div>
          )}
        </div>
      </div>
      <AddFamilyMemberDialog open={isAddingMember} onOpenChange={setIsAddingMember} />
    </header>
  );
};