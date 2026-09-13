"use server";

import { after } from "next/server";
import { acquireScan } from "@/lib/acquire";
import { scanWebsite, type ScanResult } from "@/lib/scan";

export async function runScan(_previous: ScanResult | null, formData: FormData): Promise<ScanResult> {
  const submittedUrl = String(formData.get("url") ?? "");
  const result = await scanWebsite(submittedUrl);
  after(() =>
    acquireScan(result, submittedUrl).catch((error) => {
      console.error("[kopvast] Acquire na websitecheck mislukt", error);
    })
  );
  return result;
}
