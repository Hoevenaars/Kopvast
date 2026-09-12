"use server";

import { scanWebsite, type ScanResult } from "@/lib/scan";

export async function runScan(_previous: ScanResult | null, formData: FormData): Promise<ScanResult> {
  return scanWebsite(String(formData.get("url") ?? ""));
}
