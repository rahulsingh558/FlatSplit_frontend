import { NextResponse } from 'next/server';

export const dynamic = "force-static";

// Update these values whenever you release a new version of the Android App.
// The Android app will compare its current version to this one.
const LATEST_ANDROID_VERSION = "1.0.0"; // e.g. 1.0.1
const APK_DOWNLOAD_URL = "https://flatsplit.meals4heal.in/downloads/app-release.apk"; // Provide the full URL where the new APK is hosted
const RELEASE_NOTES = "Bug fixes and performance improvements.";

export async function GET() {
  return NextResponse.json({
    version: LATEST_ANDROID_VERSION,
    apkUrl: APK_DOWNLOAD_URL,
    releaseNotes: RELEASE_NOTES,
    forceUpdate: false // Set to true if users must update
  });
}
