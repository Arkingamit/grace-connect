"use client";

import React from "react";
import { Navigation } from "@/components/ui/navigation";
import { MobileBottomNav } from "@/components/ui/mobile-bottom-nav";
import { Card } from "@/components/ui/card";
import { MapPin, Clock, Car, Coffee, Users, Heart } from "lucide-react";
import { motion } from "framer-motion";

export default function VisitPage() {
  return (
    <div className="min-h-screen bg-transparent pb-24 md:pb-12 text-[#3A2D27] selection:bg-[#8B2323]/20">
      <Navigation />

      {/* Hero Section */}
      <div className="relative bg-[#3A2D27] py-20 px-6 overflow-hidden">
        <div className="absolute inset-0 opacity-10 bg-[url('https://www.transparenttextures.com/patterns/stardust.png')]" />
        <div className="absolute inset-0 bg-gradient-to-b from-transparent to-[#3A2D27]" />
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="relative max-w-4xl mx-auto text-center"
        >
          <span className="text-[#E5D5C5] font-semibold tracking-wider uppercase text-sm mb-4 block">Plan Your Visit</span>
          <h1 className="text-4xl md:text-6xl font-serif font-bold text-white mb-6">Welcome Home</h1>
          <p className="text-xl text-white/80 max-w-2xl mx-auto">
            We can't wait to host you this Sunday. Whether you've grown up in church or this is your first time, you belong here.
          </p>
        </motion.div>
      </div>

      <main className="max-w-4xl mx-auto px-4 md:px-8 py-12 md:py-16 -mt-8 relative z-10 space-y-12">
        {/* Service Times & Location */}
        <div className="grid md:grid-cols-2 gap-6">
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
          >
            <Card className="p-8 border-none shadow-[0_8px_30px_rgb(0,0,0,0.04)] bg-white/60 backdrop-blur-sm h-full rounded-3xl">
              <div className="w-12 h-12 bg-[#FBE8E8] rounded-2xl flex items-center justify-center mb-6">
                <Clock className="w-6 h-6 text-[#8B2323]" />
              </div>
              <h2 className="text-2xl font-serif font-bold text-[#1A202C] mb-4">Service Times</h2>
              <div className="space-y-4">
                <div className="flex items-center justify-between p-4 bg-[#FAF7F2] rounded-xl border border-[#F3EAE1]">
                  <span className="font-semibold text-[#3A2D27]">Sunday Morning</span>
                  <span className="text-[#8B2323] font-bold">9:00 AM</span>
                </div>
                <div className="flex items-center justify-between p-4 bg-[#FAF7F2] rounded-xl border border-[#F3EAE1]">
                  <span className="font-semibold text-[#3A2D27]">Sunday Afternoon</span>
                  <span className="text-[#8B2323] font-bold">11:30 AM</span>
                </div>
                <div className="flex items-center justify-between p-4 bg-[#FAF7F2] rounded-xl border border-[#F3EAE1]">
                  <span className="font-semibold text-[#3A2D27]">Wednesday Youth</span>
                  <span className="text-[#8B2323] font-bold">7:00 PM</span>
                </div>
              </div>
            </Card>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.6, delay: 0.3 }}
          >
            <Card className="p-8 border-none shadow-[0_8px_30px_rgb(0,0,0,0.04)] bg-white/60 backdrop-blur-sm h-full rounded-3xl">
              <div className="w-12 h-12 bg-[#FBE8E8] rounded-2xl flex items-center justify-center mb-6">
                <MapPin className="w-6 h-6 text-[#8B2323]" />
              </div>
              <h2 className="text-2xl font-serif font-bold text-[#1A202C] mb-4">Location</h2>
              <p className="text-[#7A6150] mb-6">
                123 Grace Avenue<br />
                San Francisco, CA 94110
              </p>
              <div className="aspect-video bg-[#F3EAE1] rounded-xl flex items-center justify-center relative overflow-hidden group">
                <div className="absolute inset-0 bg-black/5 group-hover:bg-black/0 transition-colors z-10" />
                {/* Placeholder for real map embed */}
                <iframe 
                  src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1m2!1s0x80859a6d00690021%3A0x4a501367f076adff!2sSan%20Francisco%2C%20CA!5e0!3m2!1sen!2sus!4v1709669046647!5m2!1sen!2sus" 
                  width="100%" 
                  height="100%" 
                  style={{ border: 0 }} 
                  allowFullScreen 
                  loading="lazy" 
                  referrerPolicy="no-referrer-when-downgrade"
                  className="absolute inset-0"
                ></iframe>
              </div>
            </Card>
          </motion.div>
        </div>

        {/* What to Expect */}
        <div>
          <div className="text-center mb-10">
            <h2 className="text-3xl font-serif font-bold text-[#1A202C] mb-4">What to Expect</h2>
            <p className="text-[#7A6150] max-w-2xl mx-auto">We want you to feel completely comfortable when you visit. Here is a quick breakdown of a typical Sunday.</p>
          </div>
          
          <div className="grid sm:grid-cols-2 md:grid-cols-4 gap-4">
            {[
              { icon: Car, title: "Parking", desc: "Reserved guest parking right at the front entrance." },
              { icon: Coffee, title: "Coffee", desc: "Free coffee and pastries in the lobby before service." },
              { icon: Heart, title: "Worship", desc: "Engaging, contemporary worship music." },
              { icon: Users, title: "Kids", desc: "Safe, fun, and secure Grace Kids ministry." }
            ].map((item, idx) => (
              <motion.div 
                key={idx}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: idx * 0.1 }}
                className="bg-white/50 p-6 rounded-2xl border border-white"
              >
                <div className="w-10 h-10 bg-[#FAF7F2] rounded-full flex items-center justify-center mb-4 text-[#8B2323]">
                  <item.icon className="w-5 h-5" />
                </div>
                <h3 className="font-bold text-[#3A2D27] mb-2">{item.title}</h3>
                <p className="text-sm text-[#7A6150] leading-relaxed">{item.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </main>

      <MobileBottomNav />
    </div>
  );
}
