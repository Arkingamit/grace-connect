"use client";

import React from "react";
import { MobileBottomNav } from "@/components/ui/mobile-bottom-nav";
import { Card } from "@/components/ui/card";
import { MapPin, Clock, Car, Coffee, Users, Heart } from "lucide-react";
import { motion } from "framer-motion";
import { CampusDetails } from "@/components/ui/campus-details";

export default function VisitPage() {
  return (
    <div className="min-h-screen bg-transparent pb-24 md:pb-12 text-[#3A2D27] selection:bg-[#8B2323]/20">

      <main className="max-w-4xl mx-auto px-4 md:px-8 py-12 md:py-16 space-y-12">
        {/* Service Times & Location */}
        <div className="-mx-4 md:mx-0">
          <CampusDetails />
        </div>

      </main>

      <MobileBottomNav />
    </div>
  );
}
