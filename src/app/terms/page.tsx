import React from 'react';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { TERMS_LAST_UPDATED } from '@/lib/terms';

export const metadata = {
  title: 'Terms of Use (EULA) | Grace Connect',
};

export default function TermsPage() {
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

        <h1 className="text-3xl font-bold tracking-tight text-gray-900 mb-8">
          Terms of Use / End User Licence Agreement
        </h1>

        <div className="prose prose-gray max-w-none space-y-6 text-gray-600">
          <p className="text-sm font-medium text-gray-500">Last updated: {TERMS_LAST_UPDATED}</p>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 mt-8 mb-4">1. Acceptance of these Terms</h2>
            <p>
              These Terms of Use (the &ldquo;Terms&rdquo; or &ldquo;EULA&rdquo;) are a binding agreement between you and
              Grace Community Church, Ahmedabad (&ldquo;Grace&rdquo;, &ldquo;we&rdquo;, &ldquo;us&rdquo;) governing your use of the
              Grace Connect application and website (the &ldquo;App&rdquo;). By creating an account, signing
              in, or using the App, you confirm that you have read, understood, and agreed to these
              Terms. If you do not agree, you must not use the App.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 mt-8 mb-4">2. Licence</h2>
            <p>
              We grant you a personal, limited, non-exclusive, non-transferable, revocable licence to
              use the App for your own non-commercial participation in the life of the Grace
              community. You may not copy, modify, reverse engineer, resell, or redistribute the App
              or attempt to gain unauthorised access to any part of it.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 mt-8 mb-4">3. Your Account</h2>
            <p>
              You must provide accurate information when creating your account and keep your sign-in
              credentials secure. You are responsible for all activity that takes place under your
              account. You may delete your account at any time from Profile &rarr; Delete Account.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 mt-8 mb-4">
              4. Zero Tolerance for Objectionable Content and Abusive Users
            </h2>
            <p className="font-semibold text-gray-900">
              There is absolutely no tolerance for objectionable content or abusive behaviour in
              Grace Connect.
            </p>
            <p>
              The App allows members to submit content, such as prayer requests. When you submit
              content you agree that you will not post, upload, or transmit anything that:
            </p>
            <ul className="list-disc pl-5 mt-2 space-y-2">
              <li>is obscene, sexually explicit, vulgar, or pornographic;</li>
              <li>is hateful, discriminatory, or attacks any person or group on the basis of religion, caste, race, ethnicity, nationality, sex, gender, disability, or sexual orientation;</li>
              <li>harasses, bullies, threatens, defames, stalks, or intimidates any person;</li>
              <li>promotes violence, self-harm, terrorism, or any illegal activity;</li>
              <li>infringes anyone&rsquo;s privacy, publishes another person&rsquo;s personal information, or impersonates another person;</li>
              <li>is spam, fraudulent, deceptive, or a solicitation; or</li>
              <li>is otherwise unlawful or objectionable.</li>
            </ul>
            <p className="mt-3">
              You are solely responsible for the content you submit. You grant Grace the right to
              display, store, moderate, edit, or remove your content in connection with operating the
              App.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 mt-8 mb-4">5. Moderation and Enforcement</h2>
            <p>
              We take the following steps to keep the community safe:
            </p>
            <ul className="list-disc pl-5 mt-2 space-y-2">
              <li>
                <strong>Automated filtering.</strong> Submitted content is screened automatically and
                content containing objectionable language is rejected.
              </li>
              <li>
                <strong>Review before publication.</strong> Member-submitted content is held for review
                and is only visible to the community after a campus pastor or moderator approves it.
              </li>
              <li>
                <strong>Reporting.</strong> Every piece of member content can be reported from within the
                App using the <em>Report</em> action.
              </li>
              <li>
                <strong>Blocking.</strong> You can block any member from within the App. Blocking
                immediately removes that member&rsquo;s content from your view and alerts our
                moderators.
              </li>
              <li>
                <strong>Action within 24 hours.</strong> We review every report and act on objectionable
                content within 24 hours by removing the content and ejecting the member who
                submitted it.
              </li>
            </ul>
            <p className="mt-3">
              Members who post objectionable content or behave abusively will have their content
              removed and their account suspended or permanently terminated, without notice and at
              our sole discretion.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 mt-8 mb-4">6. Reporting Objectionable Content</h2>
            <p>
              To report content or a member, tap the <em>Report</em> action on the item inside the App,
              or email{' '}
              <a href="mailto:gfagapp@gmail.com" className="text-[#8B2323] underline">
                gfagapp@gmail.com
              </a>
              . Please include what you saw and where you saw it. Reports are reviewed and acted upon
              within 24 hours.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 mt-8 mb-4">7. Privacy</h2>
            <p>
              Our{' '}
              <Link href="/privacy-policy" className="text-[#8B2323] underline">
                Privacy Policy
              </Link>{' '}
              explains what personal data we collect and how we use it. Only your name, email
              address, and campus are needed to use the App; details such as gender, birthday,
              marital status, and phone numbers are entirely optional.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 mt-8 mb-4">8. Disclaimer and Limitation of Liability</h2>
            <p>
              The App is provided &ldquo;as is&rdquo; without warranties of any kind. Content submitted by
              members represents the views of those members and not of Grace. To the fullest extent
              permitted by law, Grace is not liable for any indirect or consequential loss arising
              from your use of the App.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 mt-8 mb-4">9. Termination</h2>
            <p>
              We may suspend or terminate your access to the App at any time if you breach these
              Terms, in particular the zero-tolerance policy in section 4.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 mt-8 mb-4">10. Changes to these Terms</h2>
            <p>
              We may update these Terms from time to time. Continued use of the App after an update
              means you accept the revised Terms.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 mt-8 mb-4">11. Contact</h2>
            <p className="mt-2 font-medium">
              Grace Community Church, Ahmedabad
              <br />
              Email:{' '}
              <a href="mailto:gfagapp@gmail.com" className="text-[#8B2323] underline">
                gfagapp@gmail.com
              </a>
              <br />
              Support:{' '}
              <Link href="/support" className="text-[#8B2323] underline">
                graceconnect.graceahmedabad.org/support
              </Link>
            </p>
          </section>
        </div>
      </div>
    </div>
  );
}
