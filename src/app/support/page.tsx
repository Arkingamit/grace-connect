import React from "react";
import Link from "next/link";
import type { Metadata } from "next";
import { ArrowLeft, Mail, MapPin, Clock, MessageCircle } from "lucide-react";

export const metadata: Metadata = {
  title: "Support | Grace Connect",
  description:
    "Get help with the Grace Connect app. Contact Grace Community Church in Ahmedabad by email, phone, or in person.",
};

export default function SupportPage() {
  return (
    <div className="min-h-screen bg-[#FAF7F2] px-4 py-12 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-3xl rounded-2xl border border-[#E5D5C5]/60 bg-white p-8 shadow-sm sm:p-12">
        <Link
          href="/"
          className="mb-8 inline-flex items-center text-sm font-medium text-[#7A6150] hover:text-[#1A202C]"
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Home
        </Link>

        <h1 className="text-3xl font-bold tracking-tight text-[#1A202C]">App Support</h1>
        <p className="mt-3 text-sm leading-relaxed text-[#7A6150]">
          Grace Connect is the official church app for Grace Community, Ahmedabad. Use this page to
          ask questions, report a problem, or request help with your account.
        </p>

        <section className="mt-8 space-y-4">
          <h2 className="text-xl font-semibold text-[#1A202C]">How to contact us</h2>
          <div className="space-y-4 rounded-2xl border border-[#E5D5C5]/60 bg-[#FAF7F2] p-5">
            <a
              href="mailto:gfagapp@gmail.com"
              className="flex items-start gap-3 text-sm text-[#1A202C] hover:text-[#8B2323]"
            >
              <Mail className="mt-0.5 h-5 w-5 shrink-0 text-[#8B2323]" />
              <span>
                <span className="block font-semibold">Email</span>
                gfagapp@gmail.com
              </span>
            </a>
            <div className="flex items-start gap-3 text-sm text-[#1A202C]">
              <MapPin className="mt-0.5 h-5 w-5 shrink-0 text-[#8B2323]" />
              <span>
                <span className="block font-semibold">Church office</span>
                Shri Balaji Mall, 303-304, SG Road, Gujarat State Highway 41
                <br />
                Motera, Ahmedabad, Gujarat 380005, India
              </span>
            </div>
            <div className="flex items-start gap-3 text-sm text-[#1A202C]">
              <Clock className="mt-0.5 h-5 w-5 shrink-0 text-[#8B2323]" />
              <span>
                <span className="block font-semibold">Service times</span>
                Sunday, 9:00 AM to 12:00 PM
              </span>
            </div>
          </div>
        </section>

        <section className="mt-8 space-y-3">
          <h2 className="text-xl font-semibold text-[#1A202C]">What we can help with</h2>
          <ul className="list-disc space-y-2 pl-5 text-sm text-[#7A6150]">
            <li>Signing in with Google or Apple</li>
            <li>Member registration</li>
            <li>Event RSVPs, ePass, and attendance check-in</li>
            <li>Notifications, account, or profile issues</li>
            <li>Privacy requests, including account deletion</li>
          </ul>
        </section>

        <section className="mt-8 space-y-3">
          <h2 className="text-xl font-semibold text-[#1A202C]">Before you write</h2>
          <p className="flex items-start gap-2 text-sm text-[#7A6150]">
            <MessageCircle className="mt-0.5 h-4 w-4 shrink-0 text-[#8B2323]" />
            Include your name, the email on your Grace Connect account, your device (iPhone, iPad,
            or Android), and a short description of the issue.
          </p>
        </section>

        <p className="mt-10 text-sm text-[#7A6150]">
          See also our{" "}
          <Link href="/privacy-policy" className="font-medium text-[#8B2323] underline">
            Privacy Policy
          </Link>
          .
        </p>
      </div>
    </div>
  );
}
