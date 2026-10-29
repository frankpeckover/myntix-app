import { permanentRedirect } from "next/navigation";
import { appConfig } from "@/lib/config/app-config";

export default function DataRetentionPage() {
  permanentRedirect(new URL("/data-retention", appConfig.marketingSiteUrl).href);
}
