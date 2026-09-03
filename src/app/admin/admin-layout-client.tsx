"use client";

import React, { useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import {
  useAdminData,
  canAccessAdmin,
  hasPermission,
  ROLE_LABELS,
  getRoleLabel,
  ROLE_HIERARCHY,
  type UserRole,
} from '@/lib/admin-data-context';
import { useAuth } from '@/lib/auth-context';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/components/ui/use-toast';
import {
  LayoutDashboard,
  Calendar,
  Megaphone,
  Users,
  Settings,
  Church,
  ArrowLeft,
  Shield,
  ShieldCheck,
  User,
  Crown,
  UserPlus,
  QrCode,
  Music,
  Tv,
  UserCheck,
  Heart,
  BookOpen,
  Menu,
  X,
  MapPin,
  FileText,
  Camera,
  FlipHorizontal,
  Gift,
  Flag
} from 'lucide-react';

const roleIcons: Record<UserRole, React.ElementType> = {
  member: User,
  group_leader: UserCheck,
  campus_leader: Shield,
  admin: ShieldCheck,
  super_admin: Crown,
};

const roleColors: Record<UserRole, string> = {
  member: 'text-muted-foreground border-muted-foreground/30',
  group_leader: 'text-emerald-500 border-emerald-500/30',
  campus_leader: 'text-blue-500 border-blue-500/30',
  admin: 'text-amber-500 border-amber-500/30',
  super_admin: 'text-purple-500 border-purple-500/30',
};

export default function AdminLayoutClient({ children }: { children: React.ReactNode }) {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const pathname = usePathname();
  const router = useRouter();
  const { currentUser, setCurrentUser, campuses } = useAdminData();
  const { getPendingRequests, refreshMembers, getSessionMember } = useAuth();
  const { toast } = useToast();
  const hasShownRoleToast = React.useRef(false);

  React.useEffect(() => {
    refreshMembers();
  }, [refreshMembers]);

  React.useEffect(() => {
    const sessionMember = getSessionMember();
    if (!sessionMember) return;
    const id = sessionMember._id || sessionMember.id;
    setCurrentUser({
      id,
      name: `${sessionMember.firstName || ''} ${sessionMember.lastName || ''}`.trim() || sessionMember.email,
      email: sessionMember.email,
      role: sessionMember.role as UserRole,
      campusId: sessionMember.campusId || 'main',
      groups: sessionMember.groups || [],
      permissions: sessionMember.permissions || [],
    });
  }, [getSessionMember, setCurrentUser]);

  const roleBadgeLabel =
    currentUser.role === 'group_leader'
      ? (currentUser.campusId === 'global' ? 'Core Team Leader' : 'FASL Leader')
      : getRoleLabel(currentUser.role, currentUser.campusId);

  React.useEffect(() => {
    if (hasShownRoleToast.current || !currentUser.id || !canAccessAdmin(currentUser)) return;
    hasShownRoleToast.current = true;
    
    toast({
      title: 'Welcome to Admin Panel',
      description: `You are logged in as: ${roleBadgeLabel}`,
    });
  }, [currentUser.id, roleBadgeLabel, toast]);

  const isCampusLeader = currentUser.role === 'campus_leader';
  const pendingCount = isCampusLeader
    ? getPendingRequests(currentUser.campusId).length
    : getPendingRequests().length;
    
  const { getPendingPrayerRequests } = useAdminData();
  const pendingPrayersCount = isCampusLeader
    ? getPendingPrayerRequests(currentUser.campusId).length
    : getPendingPrayerRequests().length;

  // Build sidebar items based on role
  const sidebarItems = [
    { label: 'Dashboard', href: '/admin', icon: LayoutDashboard, minRole: 'group_leader' as UserRole },
    { label: 'Events', href: '/admin/events', icon: Calendar, minRole: 'group_leader' as UserRole },
    { label: 'Announcements', href: '/admin/announcements', icon: Megaphone, minRole: 'group_leader' as UserRole, module: 'announcements' },
    { label: 'Note Share', href: '/admin/broadcasts', icon: FileText, minRole: 'group_leader' as UserRole, module: 'broadcasts' },
    { label: 'Sermons', href: '/admin/sermons', icon: Tv, minRole: 'admin' as UserRole, module: 'sermons' },
    { label: 'Worship Videos', href: '/admin/worship', icon: Music, minRole: 'admin' as UserRole, module: 'worship' },
    { label: 'Prayer Wall', href: '/admin/prayers', icon: Heart, minRole: 'campus_leader' as UserRole },
    { label: 'Moderation', href: '/admin/moderation', icon: Flag, minRole: 'campus_leader' as UserRole },
    { label: 'Greetings', href: '/admin/greetings', icon: Gift, minRole: 'campus_leader' as UserRole, module: 'greetings' },
    { label: 'Daily Verses', href: '/admin/verses', icon: BookOpen, minRole: 'admin' as UserRole },
    { label: 'Highlights Cards', href: '/admin/hero-cards', icon: FlipHorizontal, minRole: 'admin' as UserRole },
    { label: 'Requests', href: '/admin/requests', icon: UserPlus, minRole: 'campus_leader' as UserRole, badge: pendingCount, module: 'members' },
    { label: 'Attendance', href: '/admin/attendance', icon: MapPin, minRole: 'group_leader' as UserRole, module: 'attendance' },
    { label: 'ePass Scanner', href: '/admin/scanner', icon: Camera, minRole: 'group_leader' as UserRole, module: 'attendance' },
    { label: 'QR Codes', href: '/admin/qr-codes', icon: QrCode, minRole: 'campus_leader' as UserRole },
    { label: 'Members', href: '/admin/users', icon: Users, minRole: 'group_leader' as UserRole, module: 'members' },
    { label: 'Settings', href: '/admin/settings', icon: Settings, minRole: 'campus_leader' as UserRole },
  ];

  const visibleItems = sidebarItems.filter(item => {
    if (ROLE_HIERARCHY[currentUser.role] >= ROLE_HIERARCHY[item.minRole]) return true;
    if (item.module && hasPermission(currentUser, item.module)) return true;
    return false;
  });

  // Access denied for members without permissions
  if (!canAccessAdmin(currentUser)) {
    return (
      <div className="min-h-screen bg-transparent flex items-center justify-center">
        <div className="text-center space-y-4 max-w-md mx-auto p-6">
          <div className="w-16 h-16 rounded-2xl bg-destructive/10 flex items-center justify-center mx-auto">
            <Shield className="w-8 h-8 text-destructive" />
          </div>
          <h1 className="text-2xl font-bold">Access Denied</h1>
          <p className="text-muted-foreground">
            You need at least FASL Leader or Core Team Leader access to view the admin dashboard.
          </p>
          <Button onClick={() => router.push('/')} variant="outline">
            <ArrowLeft className="w-4 h-4 mr-2" /> Back to Home
          </Button>
        </div>
      </div>
    );
  }

  const RoleIcon = roleIcons[currentUser.role];

  const handleLinkClick = () => {
    setIsSidebarOpen(false);
  };

  return (
    <div className="min-h-screen bg-transparent flex flex-col">
      {/* Top sticky header */}
      <header className="sticky top-0 h-16 bg-card/85 backdrop-blur-md border-b border-border/50 z-30 flex items-center justify-between md:justify-end px-4 md:px-6 shrink-0">
        <div className="flex items-center gap-3 md:hidden">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setIsSidebarOpen(true)}
            className="text-foreground hover:bg-muted"
            aria-label="Open navigation menu"
          >
            <Menu className="w-5 h-5" />
          </Button>
          
          <Link href="/admin" className="flex items-center gap-2">
            <div className="w-10 h-10 flex items-center justify-center shrink-0">
              <img src="/logo.png" alt="Grace Logo" className="w-9 h-9 object-contain" />
            </div>
            <div>
              <span className="text-lg font-bold truncate gradient-text block leading-none">Grace Admin</span>
              <span className="text-[12px] text-muted-foreground block mt-0.5">Management Portal</span>
            </div>
          </Link>
        </div>

        <div className="flex items-center gap-4">
          <Badge variant="outline" className={`text-[10px] hidden sm:inline-flex ${roleColors[currentUser.role]}`}>
            {roleBadgeLabel}
            {currentUser.role === 'campus_leader' && (
              <span className="ml-1">· {campuses.find(c => c.id === currentUser.campusId)?.name}</span>
            )}
          </Badge>
          
          <Link href="/">
            <Button variant="ghost" size="sm" className="text-muted-foreground hover:text-foreground text-xs gap-1.5 px-2.5">
              <ArrowLeft className="w-3.5 h-3.5" /> Home Page
            </Button>
          </Link>
        </div>
      </header>

      {/* Main Container */}
      <div className="flex-1 flex relative min-h-0 min-w-0 md:pl-64">
        {/* Backdrop Overlay when drawer is open */}
        {isSidebarOpen && (
          <div 
            onClick={() => setIsSidebarOpen(false)}
            className="fixed inset-0 bg-black/40 backdrop-blur-sm z-40 transition-all duration-300 animate-in fade-in md:hidden"
          />
        )}

        {/* Drawer Sidebar */}
        <aside
          className={`fixed top-0 left-0 h-screen w-64 bg-card border-r border-border/50 z-50 flex flex-col transition-transform duration-300 ease-in-out shadow-2xl md:translate-x-0 md:shadow-none md:z-40 ${
            isSidebarOpen ? 'translate-x-0' : '-translate-x-full'
          }`}
        >
          {/* Logo & Close Button */}
          <div className="flex items-center justify-between px-4 h-16 border-b border-border/50">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 flex items-center justify-center shrink-0">
                <img src="/logo.png" alt="Grace Logo" className="w-8 h-8 object-contain" />
              </div>
              <div>
                <h2 className="text-sm font-bold truncate gradient-text">Grace Admin</h2>
                <p className="text-[9px] text-muted-foreground">Management Portal</p>
              </div>
            </div>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setIsSidebarOpen(false)}
              className="text-muted-foreground hover:text-foreground hover:bg-muted md:hidden"
            >
              <X className="w-4.5 h-4.5" />
            </Button>
          </div>

          {/* Nav Items */}
          <nav className="flex-1 py-4 px-2 space-y-1 overflow-y-auto">
            {visibleItems.map((item) => {
              const isActive = pathname === item.href;
              return (
                <Link key={item.href} href={item.href} onClick={handleLinkClick}>
                  <div
                    className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 cursor-pointer ${
                      isActive
                        ? 'bg-primary/10 text-primary shadow-sm'
                        : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'
                    }`}
                  >
                    <item.icon className={`w-5 h-5 shrink-0 ${isActive ? 'text-primary' : ''}`} />
                    <span className="truncate">{item.label}</span>
                    {'badge' in item && (item as any).badge > 0 && (
                      <span className="ml-auto w-5 h-5 rounded-full bg-destructive text-destructive-foreground text-[10px] font-bold flex items-center justify-center">
                        {(item as any).badge}
                      </span>
                    )}
                  </div>
                </Link>
              );
            })}
          </nav>

          {/* Bottom: Signed-in User Info */}
          <div className="p-4 border-t border-border/50 space-y-3 bg-muted/10">
            <div className="space-y-1">
              <div className="flex items-center gap-2 text-[10px] text-muted-foreground uppercase tracking-wider font-semibold">
                <RoleIcon className="w-3.5 h-3.5 text-primary" />
                Signed in as
              </div>
              <p className="text-xs font-bold text-foreground truncate mt-1">{currentUser.name}</p>
              <p className="text-[10px] text-muted-foreground truncate">{currentUser.email}</p>
            </div>

            <Badge variant="outline" className={`text-[10px] w-full justify-center py-1 mt-1 ${roleColors[currentUser.role]}`}>
              {roleBadgeLabel}
              {currentUser.role === 'campus_leader' && (
                <span className="ml-1 truncate">· {campuses.find(c => c.id === currentUser.campusId)?.name}</span>
              )}
            </Badge>
          </div>
        </aside>

        {/* Main Content Area */}
        <main className="flex-1 min-w-0 min-h-[calc(100vh-4rem)] overflow-y-auto overflow-x-hidden bg-background/50">
          <div className="w-full max-w-7xl mx-auto px-3 py-4 sm:p-4 md:p-6 lg:p-8">{children}</div>
        </main>
      </div>
    </div>
  );
}
