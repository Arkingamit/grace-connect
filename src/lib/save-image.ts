import { Capacitor, registerPlugin } from '@capacitor/core';

interface GraceMediaPlugin {
  savePng(options: { data: string; filename: string }): Promise<{ uri?: string }>;
  saveAndOpen(options: {
    data: string;
    filename: string;
    mimeType: string;
  }): Promise<{ uri?: string }>;
}

const GraceMedia = registerPlugin<GraceMediaPlugin>('GraceMedia');

function pluginMissing(err: unknown) {
  return /not implemented/i.test(
    String((err as { message?: string; errorMessage?: string } | null)?.message
      || (err as { errorMessage?: string } | null)?.errorMessage
      || ''),
  );
}

async function blobToBase64(blob: Blob): Promise<string> {
  const buffer = await blob.arrayBuffer();
  const bytes = new Uint8Array(buffer);
  let binary = '';
  const chunk = 0x8000;
  for (let i = 0; i < bytes.length; i += chunk) {
    binary += String.fromCharCode(...bytes.subarray(i, i + chunk));
  }
  return btoa(binary);
}

function triggerBrowserDownload(blob: Blob, filename: string) {
  const blobUrl = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = blobUrl;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.setTimeout(() => URL.revokeObjectURL(blobUrl), 2000);
}

function safeFilename(filename: string, fallback: string) {
  return filename.replace(/[^a-zA-Z0-9._-]+/g, '-').replace(/^-+|-+$/g, '') || fallback;
}

/**
 * Save a file on the phone and show the system "Open with" sheet so the
 * member can preview it (Gallery / Photos for images, PDF apps for PDFs).
 */
export async function saveAndPreviewFile(
  blob: Blob,
  filename: string,
  mimeType: 'image/png' | 'application/pdf',
): Promise<'preview' | 'share' | 'download'> {
  const fallback = mimeType === 'application/pdf' ? 'export.pdf' : 'campus-qr-code.png';
  const safeName = safeFilename(filename, fallback);

  if (Capacitor.isNativePlatform() && Capacitor.isPluginAvailable('GraceMedia')) {
    try {
      await GraceMedia.saveAndOpen({
        data: await blobToBase64(blob),
        filename: safeName,
        mimeType,
      });
      return 'preview';
    } catch (err) {
      if (!pluginMissing(err)) throw err;
    }
  }

  const file = new File([blob], safeName, { type: mimeType });
  if (typeof navigator.canShare === 'function' && navigator.canShare({ files: [file] })) {
    await navigator.share({ files: [file], title: safeName });
    return 'share';
  }

  triggerBrowserDownload(blob, safeName);
  return 'download';
}

export async function savePngToDevice(
  blob: Blob,
  filename: string,
): Promise<'preview' | 'share' | 'download'> {
  return saveAndPreviewFile(blob, filename, 'image/png');
}

export async function savePdfToDevice(
  blob: Blob,
  filename: string,
): Promise<'preview' | 'share' | 'download'> {
  return saveAndPreviewFile(blob, filename, 'application/pdf');
}

/** jsPDF `doc.save()` replacement that opens a PDF viewer on the phone. */
export async function saveJsPdf(doc: { output: (type: 'blob') => Blob }, filename: string) {
  await savePdfToDevice(doc.output('blob'), filename);
}
