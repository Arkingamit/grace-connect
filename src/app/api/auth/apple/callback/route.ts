import { NextResponse } from 'next/server';
import connectToDatabase from '@/lib/db';
import AppleAuthSession from '@/models/AppleAuthSession';
import { APPLE_WEB_CLIENT_ID, verifyAppleIdToken } from '@/lib/apple-auth';

function page(title: string, message: string, tone: 'success' | 'error') {
  const accent = tone === 'success' ? '#1F7A4C' : '#8B2323';
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>${title}</title>
<style>
  body { margin:0; min-height:100vh; display:flex; align-items:center; justify-content:center;
         background:#FAF7F2; color:#1A202C; padding:24px;
         font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,sans-serif; }
  .card { max-width:22rem; width:100%; background:#fff; border:1px solid #E5D5C5; border-radius:1.5rem;
          padding:2rem; text-align:center; box-shadow:0 10px 30px rgba(0,0,0,.06); }
  h1 { margin:0 0 .5rem; font-size:1.25rem; color:${accent}; }
  p { margin:0; font-size:.9rem; line-height:1.5; color:#7A6150; }
</style>
</head>
<body>
  <div class="card">
    <h1>${title}</h1>
    <p>${message}</p>
  </div>
  <script>setTimeout(function () { try { window.close(); } catch (e) {} }, 2500);</script>
</body>
</html>`;
}

function html(body: string, status = 200) {
  return new NextResponse(body, {
    status,
    headers: { 'content-type': 'text/html; charset=utf-8', 'cache-control': 'no-store' },
  });
}

export async function POST(req: Request) {
  let state = '';
  try {
    const form = await req.formData();
    state = String(form.get('state') || '');
    const idToken = String(form.get('id_token') || '');
    const appleError = String(form.get('error') || '');

    await connectToDatabase();

    const session = state ? await AppleAuthSession.findOne({ state }) : null;
    if (!session || session.expiresAt.getTime() < Date.now()) {
      return html(
        page('Sign-in expired', 'Please return to Grace Connect and tap Continue with Apple again.', 'error'),
        400,
      );
    }

    if (appleError) {
      session.status = 'error';
      session.errorMessage = /cancel/i.test(appleError)
        ? 'Apple sign-in was canceled.'
        : 'Apple sign-in failed. Please try again.';
      await session.save();
      return html(page('Sign-in canceled', 'You can close this tab and return to Grace Connect.', 'error'));
    }

    const payload = await verifyAppleIdToken(idToken, {
      audience: APPLE_WEB_CLIENT_ID,
      nonce: session.nonce,
    });

    const email = typeof payload.email === 'string' ? payload.email.toLowerCase() : '';
    if (!email) {
      session.status = 'error';
      session.errorMessage = 'Apple did not share an email address with this app.';
      await session.save();
      return html(
        page('Missing email', 'Apple did not share an email address. Please try again and choose to share your email.', 'error'),
        400,
      );
    }

    session.status = 'complete';
    session.email = email;
    await session.save();

    return html(
      page('Signed in with Apple', 'You can close this tab now — Grace Connect is finishing your sign-in.', 'success'),
    );
  } catch (error) {
    console.error('Apple callback error:', error);
    if (state) {
      await AppleAuthSession.updateOne(
        { state },
        { $set: { status: 'error', errorMessage: 'Could not verify your Apple sign-in. Please try again.' } },
      ).catch(() => {});
    }
    return html(
      page('Sign-in failed', 'Please close this tab and try signing in again from Grace Connect.', 'error'),
      400,
    );
  }
}

/** Apple only uses POST here; a GET means someone opened the URL directly. */
export async function GET() {
  return html(page('Nothing to see here', 'Start Apple sign-in from the Grace Connect login screen.', 'error'), 405);
}
