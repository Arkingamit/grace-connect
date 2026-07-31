import React from 'react';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';

export default function PrivacyPolicyPage() {
  return (
    <div className="min-h-screen bg-gray-50/50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-3xl mx-auto bg-white p-8 sm:p-12 rounded-2xl shadow-sm border border-gray-100">
        <div className="mb-8">
          <Link 
            href="/" 
            className="inline-flex items-center text-sm font-medium text-gray-500 hover:text-gray-900 transition-colors"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Home
          </Link>
        </div>

        <h1 className="text-3xl font-bold tracking-tight text-gray-900 mb-8">Privacy Policy</h1>
        
        <div className="prose prose-gray max-w-none space-y-6 text-gray-600">
          <p className="text-sm font-medium text-gray-500">Last updated: {new Date().toLocaleDateString()}</p>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 mt-8 mb-4">1. Introduction</h2>
            <p>
              Welcome to Grace Connect ("we," "our," or "us"). We respect your privacy and are committed to protecting your personal data. 
              This privacy policy will inform you about how we look after your personal data when you visit our website or use our mobile application 
              (Grace Connect) and tell you about your privacy rights and how the law protects you.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 mt-8 mb-4">2. The Data We Collect About You</h2>
            <p>We may collect, use, store, and transfer different kinds of personal data about you which we have grouped together as follows:</p>
            <ul className="list-disc pl-5 mt-2 space-y-2">
              <li><strong>Identity Data:</strong> includes first name, last name, username or similar identifier, and profile pictures.</li>
              <li><strong>Contact Data:</strong> includes email address and telephone numbers.</li>
              <li><strong>Technical Data:</strong> includes internet protocol (IP) address, your login data, browser type and version, time zone setting and location, and operating system and platform.</li>
              <li><strong>Device Data:</strong> includes device identifiers used for sending push notifications (via Apple Push Notification service and Google Firebase Cloud Messaging).</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 mt-8 mb-4">3. How We Use Your Personal Data</h2>
            <p>We will only use your personal data when the law allows us to. Most commonly, we will use your personal data in the following circumstances:</p>
            <ul className="list-disc pl-5 mt-2 space-y-2">
              <li>To register you as a new user and manage your account.</li>
              <li>To provide church-related communications, event updates, and notifications.</li>
              <li>To manage your attendance at church events.</li>
              <li>To administer and protect our community and this app (including troubleshooting, data analysis, testing, system maintenance, support, reporting, and hosting of data).</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 mt-8 mb-4">4. Authentication and Third-Party Services</h2>
            <p>
              We use secure third-party authentication services, including <strong>Google Sign-In</strong> and <strong>Sign In with Apple</strong>, to allow you to log into our application safely. 
              These services may provide us with your name and email address to create your account. We also utilize Google Firebase for secure push notification delivery and MongoDB for database storage. 
              We do not sell your personal data to any third parties.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 mt-8 mb-4">5. Data Security</h2>
            <p>
              We have put in place appropriate security measures to prevent your personal data from being accidentally lost, used, or accessed in an unauthorized way, altered, or disclosed. 
              In addition, we limit access to your personal data to those employees, agents, contractors, and other third parties who have a business need to know. 
              They will only process your personal data on our instructions, and they are subject to a duty of confidentiality.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 mt-8 mb-4">6. Data Retention and Deletion</h2>
            <p>
              We will only retain your personal data for as long as reasonably necessary to fulfill the purposes we collected it for. 
              You have the right to request the deletion of your account and associated personal data at any time. You can do this by navigating to your Profile settings within the app and selecting "Delete Account," or by contacting us directly.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 mt-8 mb-4">7. Contact Us</h2>
            <p>
              If you have any questions about this privacy policy or our privacy practices, please contact us at:
            </p>
            <p className="mt-2 font-medium">
              Grace Community Church<br />
              Email: gfagapp@gmail.com<br />
              Website: graceconnect.graceahmedabad.org
            </p>
          </section>
        </div>
      </div>
    </div>
  );
}
