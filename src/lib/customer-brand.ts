import { brandAssets, type BrandProfileRow } from "@/lib/customers";
import { loadOnboardingsForOrganization } from "@/lib/onboarding-store";
import type { OnboardingFileRow, OnboardingItemRow } from "@/lib/onboarding";
import { refreshClient } from "@/lib/refresh";
import { loadCustomerWorkspace, type AssetRow } from "@/lib/workspace";
import { readStore } from "@/lib/workspace-store";

export type CustomerBrandFile = {
  id: string;
  name: string;
  href: string;
  kind: string;
};

export type CustomerBrandView = {
  organizationName: string;
  name: string;
  tagline: string | null;
  primaryColor: string | null;
  secondaryColor: string | null;
  colorsText: string | null;
  typography: string | null;
  tone: string | null;
  notes: string | null;
  files: CustomerBrandFile[];
  hasContent: boolean;
};

export type CustomerPagesView = {
  outline: string | null;
};

export function firstHexColor(text: string | null | undefined) {
  const match = (text ?? "").match(/#(?:[0-9a-fA-F]{6}|[0-9a-fA-F]{3})\b/);
  return match?.[0] ?? null;
}

function itemValue(items: OnboardingItemRow[], key: string) {
  return items.map((item) => (item.key === key ? item.value_text?.trim() || "" : "")).find(Boolean) || null;
}

export function customerBrandFromSources(input: {
  organizationName: string;
  brand: BrandProfileRow | null;
  items: OnboardingItemRow[];
  files: OnboardingFileRow[];
  assets: Array<Pick<AssetRow, "id" | "kind" | "name" | "url"> & { note?: string | null }>;
}): CustomerBrandView {
  const merkItems = input.items.filter((item) => item.section === "merk");
  const colorsText = itemValue(merkItems, "kleuren");
  const files: CustomerBrandFile[] = [];
  for (const file of input.files) {
    const item = merkItems.find((row) => row.id === file.item_id);
    if (!item || (item.key !== "logo" && item.key !== "huisstijl")) continue;
    files.push({
      id: file.id,
      name: file.original_name,
      href: `/api/onboarding/files/${file.id}`,
      kind: item.key,
    });
  }
  for (const asset of brandAssets(input.assets.map((item) => ({ ...item, note: item.note ?? null })))) {
    if (!asset.url) continue;
    files.push({
      id: `asset-${asset.name}-${asset.url}`,
      name: asset.name,
      href: asset.url,
      kind: asset.kind,
    });
  }
  const primaryColor = input.brand?.primary_color || firstHexColor(colorsText);
  const secondaryColor = input.brand?.secondary_color || null;
  const typography = input.brand?.typography || itemValue(merkItems, "fonts");
  const tone = input.brand?.tone || itemValue(merkItems, "tone");
  const hasContent = Boolean(
    input.brand || primaryColor || secondaryColor || colorsText || typography || tone || files.length
  );
  return {
    organizationName: input.organizationName,
    name: input.brand?.name || input.organizationName,
    tagline: input.brand?.tagline || null,
    primaryColor,
    secondaryColor,
    colorsText,
    typography,
    tone,
    notes: input.brand?.notes || null,
    files,
    hasContent,
  };
}

export function customerPagesFromSources(items: OnboardingItemRow[]): CustomerPagesView {
  const outline = items
    .filter((item) => item.key === "paginas")
    .map((item) => item.value_text?.trim() || "")
    .find(Boolean);
  return { outline: outline || null };
}

async function loadBrandProfile(organizationId: string) {
  const supabase = refreshClient();
  if (supabase) {
    const { data } = await supabase
      .from("kopvast_brand_profiles")
      .select("*")
      .eq("organization_id", organizationId)
      .maybeSingle();
    return (data as BrandProfileRow | null) ?? null;
  }
  return (await readStore()).brandProfiles.find((item) => item.organization_id === organizationId) ?? null;
}

export async function loadCustomerBrand(organizationId: string) {
  const [workspace, onboardings, brand] = await Promise.all([
    loadCustomerWorkspace(organizationId),
    loadOnboardingsForOrganization(organizationId),
    loadBrandProfile(organizationId),
  ]);
  if (!workspace) return null;
  return customerBrandFromSources({
    organizationName: workspace.organization.name,
    brand,
    items: onboardings.flatMap((item) => item.items),
    files: onboardings.flatMap((item) => item.files),
    assets: workspace.assets,
  });
}

export async function loadCustomerPages(organizationId: string) {
  const onboardings = await loadOnboardingsForOrganization(organizationId);
  return customerPagesFromSources(onboardings.flatMap((item) => item.items));
}
