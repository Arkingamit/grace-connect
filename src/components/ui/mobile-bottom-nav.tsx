"use client";

import React from "react";
import { usePathname, useRouter } from "next/navigation";
import { Home, PlayCircle, CalendarHeart, FileText } from "lucide-react";

type NavItem = {
    label: string;
    href: string;
    icon: React.ComponentType<{ className?: string; strokeWidth?: number | string }>;
    exact?: boolean;
};

export function MobileBottomNav() {
    const pathname = usePathname();
    const router = useRouter();

    const navItems: NavItem[] = [
        { label: "Home", href: "/", icon: Home, exact: true },
        { label: "Sermons", href: "/sermons", icon: PlayCircle },
        { label: "Notes", href: "/broadcasts", icon: FileText },
        { label: "Events", href: "/events", icon: CalendarHeart },
    ];

    return (
        <nav className="fixed inset-x-0 bottom-0 z-50 md:hidden bg-[#FAF7F2] dark:bg-[#1C1917] border-t border-[#a59d94]/60 shadow-[0_-4px_16px_-2px_rgba(58,45,39,0.12)]">
            <div className="mx-auto max-w-screen-sm px-2 py-1.5">
                <div className="grid grid-cols-4 gap-1">
                    {navItems.map((item) => {
                        const Icon = item.icon;
                        const isActive = item.exact
                            ? pathname === item.href
                            : pathname === item.href || (item.href !== "/" && pathname.startsWith(item.href));

                        return (
                            <button
                                key={item.href}
                                type="button"
                                onClick={() => {
                                    // Replace so Android back does not walk tab history
                                    if (pathname !== item.href) router.replace(item.href);
                                }}
                                className={`flex flex-col items-center justify-center gap-0.5 rounded-full px-2 py-1.5 text-[11px] font-medium transition-colors ${isActive
                                    ? "bg-[#FBE8E8] text-[#8B2323]"
                                    : "text-[#7A6150] hover:bg-[#E5D5C5] hover:text-[#3A2D27]"
                                    }`}
                            >
                                <Icon strokeWidth={isActive ? 2 : 1.5} className={`h-5 w-5 ${isActive ? "text-[#8B2323]" : "text-[#7A6150]"}`} />
                                <span className="leading-none">{item.label}</span>
                            </button>
                        );
                    })}
                </div>
            </div>
            {/* Blocks any content from peeking out below the screen edge without increasing navbar height */}
            <div className="absolute top-full inset-x-0 h-40 bg-[#FAF7F2] dark:bg-[#1C1917] pointer-events-none" />
        </nav>
    );
}
