import { permanentRedirect } from "next/navigation";
import { appConfig } from "@/lib/config/app-config";

export default function PrivacyPage() {
  permanentRedirect(new URL("/privacy", appConfig.marketingSiteUrl).href);
}
