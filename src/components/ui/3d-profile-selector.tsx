"use client";

import React, { useState } from "react";
import {
  motion,
  useMotionTemplate,
  useMotionValue,
  useSpring,
  useTransform,
  type Variants,
  type MotionValue,
} from "framer-motion";
import { Pencil, Plus, Heart, Anchor, Sun } from "lucide-react";

/* ---------- Types ---------- */

export interface Profile {
  id: string;
  name: string;
  image?: string;
}

export interface ProfileSelectProps {
  profiles?: Profile[];
  title?: string;
  onSelect?: (profile: Profile) => void;
  onAdd?: () => void;
  onManage?: () => void;
  onEdit?: (profile: Profile) => void;
  className?: string;
}

/** Warm Grace Community card gradients */
const AVATAR_COLORS = [
  "from-[#8B2323] to-[#5C1111]",
  "from-[#A04A00] to-[#6B3200]",
  "from-[#721515] to-[#3A0A0A]",
  "from-[#7A6150] to-[#4A382E]",
  "from-[#8B2323] via-[#A04A00] to-[#5C1111]",
];

function colorForId(id: string) {
  let hash = 0;
  for (let i = 0; i < id.length; i++) {
    hash = (hash + id.charCodeAt(i) * 17) % AVATAR_COLORS.length;
  }
  return AVATAR_COLORS[hash];
}

const CHRISTIAN_ICONS = [
  <svg key="cross" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="h-16 w-16 text-white/30"><path d="M12 3v18M8 8h8" /></svg>,
  <svg key="dove" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="h-16 w-16 text-white/30"><path d="M15 4c-3 0-6 4-6 4S7 7 4 8c0 0 4 2 4 5 0 3-4 6-4 6s6-3 8-3c2 0 6 3 6 3 0-3-2-6-2-6s2-3 2-5c0-2-3-4-3-4z" /></svg>,
  <svg key="crown" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="h-16 w-16 text-white/30"><path d="M2 20h20M4 20l2-10 4 5 2-8 2 8 4-5 2 10" /></svg>,
  <svg key="bible" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="h-16 w-16 text-white/30"><path d="M4 19.5v-15A2.5 2.5 0 0 1 6.5 2H20v20H6.5a2.5 2.5 0 0 1 0-5H20" /></svg>,
  <svg key="fire" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="h-16 w-16 text-white/30"><path d="M12 22c5 0 9-4 9-9 0-4-3-6-5-9-1-1-2-2-4-2s-3 1-4 2c-2 3-5 5-5 9 0 5 4 9 9 9z M12 22v-6" /></svg>,
  <Heart key="heart" className="h-16 w-16 text-white/30" strokeWidth={1.5} />,
  <Anchor key="anchor" className="h-16 w-16 text-white/30" strokeWidth={1.5} />,
  <Sun key="sun" className="h-16 w-16 text-white/30" strokeWidth={1.5} />,
];

function iconForId(id: string) {
  let hash = 0;
  for (let i = 0; i < id.length; i++) {
    hash = (hash + id.charCodeAt(i) * 31) % CHRISTIAN_ICONS.length;
  }
  return CHRISTIAN_ICONS[hash];
}

const DEFAULT_PROFILES: Profile[] = [
  { id: "alpha", name: "Alpha" },
  { id: "nova", name: "Nova" },
  { id: "zen", name: "Zen" },
];

const sectionVariants: Variants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.15, delayChildren: 0.2 },
  },
};

const titleVariants: Variants = {
  hidden: { opacity: 0, y: 20, filter: "blur(10px)" },
  visible: {
    opacity: 1,
    y: 0,
    filter: "blur(0px)",
    transition: { duration: 0.8, ease: "easeOut" },
  },
};

const cardVariants: Variants = {
  hidden: { opacity: 0, scale: 0.8, y: 50 },
  visible: {
    opacity: 1,
    scale: 1,
    y: 0,
    transition: { type: "spring", stiffness: 100, damping: 20 },
  },
};

export default function ProfileSelect({
  profiles = DEFAULT_PROFILES,
  title = "Choose your profile",
  onSelect,
  onAdd,
  onManage,
  onEdit,
  className,
}: ProfileSelectProps) {
  const [isManaging, setIsManaging] = useState(false);
  const mouseX = useMotionValue(0);
  const mouseY = useMotionValue(0);

  const handleMouseMove = ({
    currentTarget,
    clientX,
    clientY,
  }: React.MouseEvent<HTMLDivElement>) => {
    const rect = currentTarget.getBoundingClientRect();
    mouseX.set(clientX - rect.left);
    mouseY.set(clientY - rect.top);
  };

  return (
    <div
      className={`relative min-h-screen w-full overflow-hidden bg-[#FAF7F2] text-[#1A202C] selection:bg-[#8B2323]/15 ${className ?? ""}`}
      onMouseMove={handleMouseMove}
    >
      {/* Soft parchment atmosphere */}
      <div
        className="pointer-events-none absolute inset-0 opacity-40"
        style={{ backgroundImage: "var(--bg-pattern)", backgroundSize: "100px 100px" }}
      />
      <div className="pointer-events-none absolute top-[-10%] right-[-5%] h-[28rem] w-[28rem] rounded-full bg-[#8B2323]/10 blur-[100px]" />
      <div className="pointer-events-none absolute bottom-[-10%] left-[-5%] h-[28rem] w-[28rem] rounded-full bg-[#A04A00]/10 blur-[100px]" />

      <Spotlight mouseX={mouseX} mouseY={mouseY} />

      <motion.div
        className="relative z-10 flex min-h-screen flex-col items-center justify-center px-4 pb-24"
        variants={sectionVariants}
        initial="hidden"
        animate="visible"
      >
        <motion.h1
          className="mb-12 text-center font-serif text-4xl font-bold tracking-tight text-[#1A202C] sm:mb-16 sm:text-6xl"
          variants={titleVariants}
        >
          {isManaging ? "Edit profile" : title}
        </motion.h1>

        <motion.div
          className="flex flex-wrap items-center justify-center gap-x-6 gap-y-14 perspective-[1000px] sm:gap-x-8 sm:gap-y-16"
          variants={{
            hidden: {},
            visible: {
              transition: { staggerChildren: 0.15, delayChildren: 0.1 },
            },
          }}
        >
          {profiles.map((profile) => (
            <TiltCard
              key={profile.id}
              profile={profile}
              isManaging={isManaging}
              onSelect={onSelect}
              onEdit={onEdit}
            />
          ))}
          <AddProfileCard onAdd={onAdd} />
        </motion.div>

        <motion.button
          type="button"
          onClick={() => {
            if (isManaging) {
              setIsManaging(false);
              return;
            }
            if (onEdit || onManage) {
              setIsManaging(true);
              return;
            }
            onManage?.();
          }}
          variants={{
            hidden: { opacity: 0 },
            visible: { opacity: 1 },
          }}
          whileHover={{ scale: 1.03 }}
          whileTap={{ scale: 0.98 }}
          className="mt-12 border-2 border-[#E5D5C5] bg-white/70 px-8 py-2.5 text-sm font-semibold uppercase tracking-widest text-[#7A6150] shadow-sm backdrop-blur transition-colors hover:border-[#8B2323]/40 hover:bg-white hover:text-[#8B2323] sm:mt-16"
        >
          {isManaging ? "Done" : "Manage Profiles"}
        </motion.button>
      </motion.div>
    </div>
  );
}

function Spotlight({
  mouseX,
  mouseY,
}: {
  mouseX: MotionValue<number>;
  mouseY: MotionValue<number>;
}) {
  const background = useMotionTemplate`radial-gradient(
    650px circle at ${mouseX}px ${mouseY}px,
    rgba(139, 35, 35, 0.08),
    transparent 80%
  )`;

  return (
    <motion.div
      className="pointer-events-none absolute inset-0 opacity-0 transition-opacity duration-300 md:opacity-100"
      style={{ background }}
    />
  );
}

function TiltCard({
  profile,
  isManaging,
  onSelect,
  onEdit,
}: {
  profile: Profile;
  isManaging: boolean;
  onSelect?: (profile: Profile) => void;
  onEdit?: (profile: Profile) => void;
}) {
  const x = useMotionValue(0);
  const y = useMotionValue(0);

  const mouseXSpring = useSpring(x, { stiffness: 200, damping: 30 });
  const mouseYSpring = useSpring(y, { stiffness: 200, damping: 30 });

  const rotateX = useTransform(mouseYSpring, [-0.5, 0.5], ["12deg", "-12deg"]);
  const rotateY = useTransform(mouseXSpring, [-0.5, 0.5], ["-12deg", "12deg"]);

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (isManaging) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;
    x.set(mouseX / rect.width - 0.5);
    y.set(mouseY / rect.height - 0.5);
  };

  const handleMouseLeave = () => {
    x.set(0);
    y.set(0);
  };

  const handleActivate = () => {
    if (isManaging) {
      onEdit?.(profile);
      return;
    }
    onSelect?.(profile);
  };

  return (
    <motion.div
      variants={cardVariants}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      onClick={handleActivate}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          handleActivate();
        }
      }}
      style={{ rotateX, rotateY, transformStyle: "preserve-3d" }}
      className="group relative h-40 w-40 cursor-pointer sm:h-52 sm:w-52"
    >
      <div
        style={{ transform: "translateZ(50px)" }}
        className="absolute inset-0 overflow-hidden rounded-[1.75rem] border border-[#E5D5C5]/80 bg-white shadow-[0_8px_30px_-8px_rgba(92,17,17,0.25)] transition-shadow duration-500 group-hover:shadow-[0_16px_40px_-10px_rgba(139,35,35,0.35)]"
      >
        {profile.image ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={profile.image}
            alt={profile.name}
            referrerPolicy="no-referrer"
            className={`absolute inset-0 h-full w-full object-cover transition-all duration-500 group-hover:scale-110 ${
              isManaging ? "opacity-70" : "opacity-90 group-hover:opacity-100"
            }`}
          />
        ) : (
          <div
            className={`absolute inset-0 flex items-center justify-center bg-gradient-to-br ${colorForId(profile.id)} transition-transform duration-500 group-hover:scale-105 ${
              isManaging ? "opacity-80" : ""
            }`}
          >
            {iconForId(profile.id)}
          </div>
        )}
        {isManaging && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/25">
            <span className="flex h-12 w-12 items-center justify-center rounded-full border-2 border-white/90 bg-[#8B2323] text-white shadow-lg sm:h-14 sm:w-14">
              <Pencil className="h-5 w-5 sm:h-6 sm:w-6" strokeWidth={2} />
            </span>
          </div>
        )}
      </div>

      <div
        style={{ transform: "translateZ(40px)" }}
        className="absolute inset-0 rounded-[1.75rem] ring-1 ring-inset ring-[#8B2323]/15 transition-colors duration-300 group-hover:ring-[#8B2323]/35"
      />

      {/* Always-visible edit hint */}
      {!isManaging && (
        <button
          type="button"
          aria-label={`Edit ${profile.name}`}
          onClick={(e) => {
            e.stopPropagation();
            onEdit?.(profile);
          }}
          style={{ transform: "translateZ(90px)" }}
          className="absolute bottom-3 right-3 flex h-8 w-8 items-center justify-center rounded-full border border-white/80 bg-[#8B2323] text-white shadow-md transition-transform hover:scale-110 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#8B2323]/50 sm:h-9 sm:w-9"
        >
          <Pencil className="h-3.5 w-3.5 sm:h-4 sm:w-4" strokeWidth={2.25} />
        </button>
      )}

      <div
        style={{ transform: "translateZ(30px)" }}
        className="absolute top-full left-0 right-0 mt-3.5 px-2 text-center"
      >
        <span className="block truncate text-base font-semibold leading-snug text-[#1A202C] sm:text-lg">
          {profile.name}
        </span>
      </div>
    </motion.div>
  );
}

function AddProfileCard({ onAdd }: { onAdd?: () => void }) {
  return (
    <motion.div
      variants={cardVariants}
      whileHover={{ scale: 1.05 }}
      whileTap={{ scale: 0.95 }}
      onClick={onAdd}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onAdd?.();
        }
      }}
      className="group relative flex h-40 w-40 cursor-pointer flex-col items-center justify-center sm:h-52 sm:w-52"
    >
      <div className="absolute inset-0 overflow-hidden rounded-[1.75rem]">
        <div className="absolute inset-[-50%] animate-[spin_4s_linear_infinite] bg-[conic-gradient(from_0deg,transparent_0_340deg,#8B2323_360deg)] opacity-0 transition-opacity duration-500 group-hover:opacity-25" />
      </div>

      <div className="absolute inset-px flex flex-col items-center justify-center rounded-[1.7rem] border border-[#E5D5C5] bg-[#F3EAE1]/90 shadow-sm backdrop-blur-md transition-colors duration-300 group-hover:bg-[#F3EAE1]">
        <motion.div
          className="relative flex h-14 w-14 items-center justify-center rounded-full border border-[#E5D5C5] bg-white shadow-inner sm:h-16 sm:w-16"
          animate={{
            boxShadow: [
              "0px 0px 0px rgba(139,35,35,0)",
              "0px 0px 18px rgba(139,35,35,0.18)",
              "0px 0px 0px rgba(139,35,35,0)",
            ],
          }}
          transition={{ duration: 3, repeat: Infinity }}
        >
          <motion.div
            className="text-[#8B2323]"
            whileHover={{ rotate: 90, scale: 1.15 }}
            transition={{ type: "spring", stiffness: 200, damping: 10 }}
          >
            <Plus size={28} strokeWidth={1.75} />
          </motion.div>
        </motion.div>

        <span className="mt-3 text-base font-semibold text-[#7A6150] transition-colors group-hover:text-[#8B2323] sm:mt-4 sm:text-lg">
          Add Profile
        </span>
      </div>
    </motion.div>
  );
}
