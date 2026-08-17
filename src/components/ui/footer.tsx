"use client";

import React from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Heart, MapPin, Phone, Mail, Facebook, Instagram, Youtube, Clock } from 'lucide-react';

export const Footer = () => {
  return (
    <footer className="bg-primary text-primary-foreground">
      <div className="container mx-auto px-4 py-10 sm:py-16">
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
          {/* Church Info */}
          <div className="space-y-6">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-primary-foreground/10 rounded-lg flex items-center justify-center">
                <Heart className="w-6 h-6" />
              </div>
              <div>
                <h1 className="text-xl font-bold">Grace Community</h1>
                <p className="text-sm text-primary-foreground/80">Where hearts unite</p>
              </div>
            </div>
            <p className="text-primary-foreground/80 leading-relaxed">
              A welcoming community where faith grows, hearts connect, and lives are transformed through God's love.
            </p>
            <div className="flex space-x-3">
              <Button variant="ghost" size="sm" className="text-primary-foreground hover:bg-primary-foreground/10">
                <Facebook className="w-4 h-4" />
              </Button>
              <Button variant="ghost" size="sm" className="text-primary-foreground hover:bg-primary-foreground/10">
                <Instagram className="w-4 h-4" />
              </Button>
              <Button variant="ghost" size="sm" className="text-primary-foreground hover:bg-primary-foreground/10">
                <Youtube className="w-4 h-4" />
              </Button>
            </div>
          </div>

          {/* Quick Links */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold">Quick Links</h3>
            <div className="space-y-2">
              <Link href="/events" className="block text-primary-foreground/80 hover:text-primary-foreground transition-colors">Events</Link>
              <Link href="/sermons" className="block text-primary-foreground/80 hover:text-primary-foreground transition-colors">Sermons</Link>
              <Link href="/broadcasts" className="block text-primary-foreground/80 hover:text-primary-foreground transition-colors">Notes</Link>
              <Link href="/gallery" className="block text-primary-foreground/80 hover:text-primary-foreground transition-colors">Gallery</Link>
              <Link href="/prayer-wall" className="block text-primary-foreground/80 hover:text-primary-foreground transition-colors">Prayer Wall</Link>
            </div>
          </div>

          {/* Contact Info */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold">Contact Us</h3>
            <div className="space-y-3">
              <div className="flex items-start gap-3">
                <MapPin className="w-4 h-4 mt-1 text-primary-foreground/80" />
                <div>
                  <p className="text-sm">Shri Balaji Mall, 303-304, SG Road, Gujarat State Highway 41</p>
                  <p className="text-sm">Motera, Ahmedabad, Gujarat 380005</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <Phone className="w-4 h-4 text-primary-foreground/80" />
                <p className="text-sm">+91 9913037373</p>
              </div>
              <div className="flex items-center gap-3">
                <Mail className="w-4 h-4 text-primary-foreground/80" />
                <p className="text-sm">Grace Ahmedabad@gmail.com</p>
              </div>
              <div className="flex items-start gap-3">
                <Clock className="w-4 h-4 mt-1 text-primary-foreground/80" />
                <div>
                  <p className="text-sm font-medium">Service Times</p>
                  <p className="text-sm">Sunday: 9:00 AM to 12:00 pm</p>
                  
                </div>
              </div>
            </div>
          </div>

          {/* Newsletter */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold">Stay Connected</h3>
            <p className="text-sm text-primary-foreground/80">
              Subscribe to our newsletter for updates on events, sermons, and community news.
            </p>
            <div className="space-y-2">
              <Input 
                placeholder="Your Email Address"
                className="bg-primary-foreground/10 border-primary-foreground/20 text-primary-foreground placeholder:text-primary-foreground/60"
              />
              <Button 
                className="w-full bg-primary-foreground text-primary hover:bg-primary-foreground/90"
              >
                Subscribe
              </Button>
            </div>
            <p className="text-xs text-primary-foreground/60">
              We respect your privacy. Unsubscribe at any time.
            </p>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="border-t border-primary-foreground/20 mt-12 pt-8 flex flex-col md:flex-row justify-between items-center gap-4">
          <p className="text-sm text-primary-foreground/80">
            © 2026 Grace Community Church. All rights reserved.
          </p>
          <div className="flex gap-6 text-sm">
            <a href="#privacy" className="text-primary-foreground/80 hover:text-primary-foreground transition-colors">
              Privacy Policy
            </a>
            <a href="#terms" className="text-primary-foreground/80 hover:text-primary-foreground transition-colors">
              Terms of Service
            </a>
          </div>
        </div>
      </div>
    </footer>
  );
};