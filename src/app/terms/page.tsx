import { permanentRedirect } from "next/navigation";
import { appConfig } from "@/lib/config/app-config";

export default function TermsPage() {
  permanentRedirect(new URL("/terms", appConfig.marketingSiteUrl).href);
}
