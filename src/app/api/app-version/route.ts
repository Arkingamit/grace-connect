import { NextResponse } from "next/server";
import connectToDatabase from "@/lib/db";
import { SystemSettings, type ISystemSettings } from "@/models/SystemSettings";
import { DEFAULT_PLAY_STORE_URL } from "@/lib/campus-invite";

const DEFAULT_FORCE_MESSAGE =
  "A critical update is required to continue using Grace Connect. Please update to the latest version.";

export async function GET() {
  try {
    await connectToDatabase();
    const settings = ((await SystemSettings.findOne().lean()) || {}) as Partial<ISystemSettings>;

    return NextResponse.json({
      // Shared fields are unused by native clients; kept empty so old shells
      // cannot treat an Android publish as an iOS (or vice versa) update.
      minimum_version: "0.0.0",
      latest_version: "",
      android: {
        minimum_version: settings.minAppVersionAndroid || "0.0.0",
        latest_version: settings.latestAppVersionAndroid || "",
        update_url: settings.androidStoreUrl || DEFAULT_PLAY_STORE_URL,
      },
      ios: {
        minimum_version: settings.minAppVersionIos || "0.0.0",
        latest_version: settings.latestAppVersionIos || "",
        update_url: settings.iosStoreUrl || process.env.NEXT_PUBLIC_IOS_APP_STORE_URL || "",
      },
      update_url_android: settings.androidStoreUrl || DEFAULT_PLAY_STORE_URL,
      update_url_ios: settings.iosStoreUrl || process.env.NEXT_PUBLIC_IOS_APP_STORE_URL || "",
      force_update_message: settings.forceUpdateMessage || DEFAULT_FORCE_MESSAGE,
    });
  } catch (error) {
    console.error("App version check error:", error);
    return NextResponse.json({
      minimum_version: "0.0.0",
      latest_version: "0.0.0",
      android: { minimum_version: "0.0.0", latest_version: "", update_url: "" },
      ios: { minimum_version: "0.0.0", latest_version: "", update_url: "" },
      update_url_android: "",
      update_url_ios: "",
      force_update_message: "",
    });
  }
}
