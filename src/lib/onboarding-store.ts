import { mkdir, readFile, unlink, writeFile } from "node:fs/promises";
import path from "node:path";
import {
  ONBOARDING_BUCKET,
  ONBOARDING_MAX_FILES_PER_ITEM,
  buildOnboardingRecords,
  deriveOnboardingStatus,
  isOnboardingItemType,
  isOnboardingSection,
  itemHasInput,
  nextItemStatus,
  onboardingProgress,
  onboardingStorageKey,
  parseCustomItemInput,
  projectNeedsOnboarding,
  validateOnboardingFile,
  validateOnboardingText,
  type OnboardingFileRow,
  type OnboardingItemRow,
  type OnboardingItemStatus,
  type OnboardingRow,
} from "@/lib/onboarding";
import { refreshClient } from "@/lib/refresh";
import { mutateStore, newId, nowIso, readStore, type Store } from "@/lib/workspace-store";

export type ActionOk<T extends object = object> = { ok: true } & T;
export type ActionErr = { ok: false; message: string };
export type ActionResult<T extends object = object> = ActionOk<T> | ActionErr;

export type OnboardingWorkspace = {
  onboarding: OnboardingRow;
  items: OnboardingItemRow[];
  files: OnboardingFileRow[];
  organization: { id: string; name: string };
  project: { id: string; title: string; type: string; organization_id: string };
};

export type OnboardingOverviewItem = {
  onboarding: OnboardingRow;
  organization: { id: string; name: string };
  project: { id: string; title: string; type: string };
  progress: ReturnType<typeof onboardingProgress>;
};

const localFilesDir = path.join("/tmp", "kopvast-onboarding-files");

function fail(message: string): ActionErr {
  return { ok: false, message };
}

function seedIntoStore(
  store: Store,
  project: { id: string; type: string; organization_id: string }
) {
  if (!projectNeedsOnboarding(project.type)) return null;
  if (store.onboardings.some((item) => item.project_id === project.id)) {
    return store.onboardings.find((item) => item.project_id === project.id) ?? null;
  }
  const built = buildOnboardingRecords({
    projectId: project.id,
    organizationId: project.organization_id,
    projectType: project.type,
    now: nowIso(),
    newId,
  });
  store.onboardings.unshift(built.onboarding);
  store.onboardingItems.push(...built.items);
  return built.onboarding;
}

async function seedIntoSupabase(project: { id: string; type: string; organization_id: string }) {
  const supabase = refreshClient();
  if (!supabase || !projectNeedsOnboarding(project.type)) return null;
  const { data: existing } = await supabase
    .from("kopvast_onboardings")
    .select("*")
    .eq("project_id", project.id)
    .maybeSingle();
  if (existing) return existing as OnboardingRow;
  const built = buildOnboardingRecords({
    projectId: project.id,
    organizationId: project.organization_id,
    projectType: project.type,
    now: nowIso(),
    newId,
  });
  const { error } = await supabase.from("kopvast_onboardings").insert(built.onboarding);
  if (error) {
    console.error("[kopvast] Onboarding aanmaken mislukt", error.message);
    return null;
  }
  const { error: itemsError } = await supabase.from("kopvast_onboarding_items").insert(built.items);
  if (itemsError) {
    console.error("[kopvast] Onboarding-items aanmaken mislukt", itemsError.message);
  }
  return built.onboarding;
}

export function addOnboardingToStore(
  store: Store,
  project: { id: string; type: string; organization_id: string }
) {
  return seedIntoStore(store, project);
}

export async function ensureOnboardingForProject(project: {
  id: string;
  type: string;
  organization_id: string;
}) {
  if (!projectNeedsOnboarding(project.type)) {
    return { ok: false as const, message: "Dit type opdracht heeft geen onboarding." };
  }
  const supabase = refreshClient();
  if (supabase) {
    const row = await seedIntoSupabase(project);
    if (!row) return fail("Onboarding aanmaken mislukt.");
    return { ok: true as const, onboarding: row };
  }
  const onboarding = await mutateStore((store) => seedIntoStore(store, project));
  if (!onboarding) return fail("Onboarding aanmaken mislukt.");
  return { ok: true as const, onboarding };
}

export async function ensureOnboardingsForProjects(
  projects: Array<{ id: string; type: string; organization_id: string }>
) {
  for (const project of projects) {
    if (!projectNeedsOnboarding(project.type)) continue;
    const supabase = refreshClient();
    if (supabase) await seedIntoSupabase(project);
    else {
      await mutateStore((store) => {
        seedIntoStore(store, project);
      });
    }
  }
}

async function loadProject(id: string) {
  const supabase = refreshClient();
  if (supabase) {
    const { data } = await supabase.from("kopvast_projects").select("*").eq("id", id).maybeSingle();
    return data as { id: string; title: string; type: string; organization_id: string } | null;
  }
  const project = (await readStore()).projects.find((item) => item.id === id);
  return project ? { id: project.id, title: project.title, type: project.type, organization_id: project.organization_id } : null;
}

async function loadOrganizationName(id: string) {
  const supabase = refreshClient();
  if (supabase) {
    const { data } = await supabase.from("kopvast_organizations").select("id, name").eq("id", id).maybeSingle();
    return data as { id: string; name: string } | null;
  }
  const org = (await readStore()).organizations.find((item) => item.id === id);
  return org ? { id: org.id, name: org.name } : null;
}

async function refreshDerivedStatus(onboardingId: string) {
  const bundle = await loadOnboardingRecord(onboardingId);
  if (!bundle) return;
  const derived = deriveOnboardingStatus({
    overrideReason: bundle.onboarding.override_reason,
    items: bundle.items,
    now: nowIso(),
  });
  if (
    derived.status === bundle.onboarding.status &&
    derived.ready_at === bundle.onboarding.ready_at
  ) {
    return;
  }
  const supabase = refreshClient();
  if (supabase) {
    await supabase
      .from("kopvast_onboardings")
      .update({ status: derived.status, ready_at: derived.ready_at, updated_at: nowIso() })
      .eq("id", onboardingId);
    return;
  }
  await mutateStore((store) => {
    const row = store.onboardings.find((item) => item.id === onboardingId);
    if (!row) return;
    row.status = derived.status;
    row.ready_at = derived.ready_at;
    row.updated_at = nowIso();
  });
}

async function loadOnboardingRecord(id: string) {
  const supabase = refreshClient();
  if (supabase) {
    const { data } = await supabase.from("kopvast_onboardings").select("*").eq("id", id).maybeSingle();
    if (!data) return null;
    const [items, files] = await Promise.all([
      supabase.from("kopvast_onboarding_items").select("*").eq("onboarding_id", id).order("sort_order"),
      supabase.from("kopvast_onboarding_files").select("*").eq("onboarding_id", id).order("created_at"),
    ]);
    return {
      onboarding: data as OnboardingRow,
      items: (items.data ?? []) as OnboardingItemRow[],
      files: (files.data ?? []) as OnboardingFileRow[],
    };
  }
  const store = await readStore();
  const onboarding = store.onboardings.find((item) => item.id === id);
  if (!onboarding) return null;
  return {
    onboarding,
    items: store.onboardingItems
      .filter((item) => item.onboarding_id === id)
      .sort((a, b) => a.sort_order - b.sort_order),
    files: store.onboardingFiles.filter((item) => item.onboarding_id === id),
  };
}

export async function loadOnboardingWorkspaceByProject(projectId: string): Promise<OnboardingWorkspace | null> {
  const project = await loadProject(projectId);
  if (!project) return null;
  await ensureOnboardingForProject(project);
  const supabase = refreshClient();
  let onboarding: OnboardingRow | null = null;
  if (supabase) {
    const { data } = await supabase.from("kopvast_onboardings").select("*").eq("project_id", projectId).maybeSingle();
    onboarding = (data as OnboardingRow | null) ?? null;
  } else {
    onboarding = (await readStore()).onboardings.find((item) => item.project_id === projectId) ?? null;
  }
  if (!onboarding) return null;
  const record = await loadOnboardingRecord(onboarding.id);
  const organization = await loadOrganizationName(project.organization_id);
  if (!record || !organization) return null;
  return { ...record, organization, project };
}

export async function loadOnboardingsForOrganization(organizationId: string): Promise<OnboardingWorkspace[]> {
  const supabase = refreshClient();
  const projects = supabase
    ? ((
        await supabase.from("kopvast_projects").select("id, title, type, organization_id").eq("organization_id", organizationId)
      ).data ?? [])
    : (await readStore()).projects.filter((item) => item.organization_id === organizationId);
  const workspaces: OnboardingWorkspace[] = [];
  for (const project of projects) {
    if (!projectNeedsOnboarding(project.type)) continue;
    const workspace = await loadOnboardingWorkspaceByProject(project.id);
    if (workspace) workspaces.push(workspace);
  }
  return workspaces;
}

export async function loadOnboardingOverview(): Promise<OnboardingOverviewItem[]> {
  const supabase = refreshClient();
  const projects = supabase
    ? ((await supabase.from("kopvast_projects").select("id, title, type, organization_id").order("created_at", { ascending: false })).data ?? [])
    : (await readStore()).projects;
  const orgs = supabase
    ? ((await supabase.from("kopvast_organizations").select("id, name")).data ?? [])
    : (await readStore()).organizations.map((item) => ({ id: item.id, name: item.name }));
  const names = new Map(orgs.map((item) => [item.id, item.name]));
  const rows: OnboardingOverviewItem[] = [];
  for (const project of projects) {
    if (!projectNeedsOnboarding(project.type)) continue;
    const workspace = await loadOnboardingWorkspaceByProject(project.id);
    if (!workspace) continue;
    rows.push({
      onboarding: workspace.onboarding,
      organization: { id: project.organization_id, name: names.get(project.organization_id) ?? workspace.organization.name },
      project: { id: project.id, title: project.title, type: project.type },
      progress: onboardingProgress(workspace.onboarding, workspace.items),
    });
  }
  return rows.sort(
    (a, b) => Number(a.progress.ready) - Number(b.progress.ready) || a.progress.completed - b.progress.completed
  );
}

function filesForItem(files: OnboardingFileRow[], itemId: string) {
  return files.filter((file) => file.item_id === itemId);
}

function recomputeItemStatus(item: OnboardingItemRow, fileCount: number, notRequired: boolean): OnboardingItemStatus {
  return nextItemStatus({
    current: item.status,
    required: item.required,
    notRequired,
    hasInput: itemHasInput(item, fileCount),
  });
}

export async function saveOnboardingItem(input: {
  itemId: string;
  organizationId: string;
  value?: string;
  note?: string;
  notRequired?: boolean;
}) {
  const record = await findItem(input.itemId);
  if (!record) return fail("Item niet gevonden.");
  if (record.onboarding.organization_id !== input.organizationId) return fail("Dit item hoort niet bij jouw omgeving.");
  const text = validateOnboardingText(input.value ?? record.item.value_text ?? "");
  if (!text.ok) return text;
  const note = validateOnboardingText(input.note ?? record.item.note ?? "");
  if (!note.ok) return note;
  const fileCount = record.files.length;
  const status = recomputeItemStatus(
    { ...record.item, value_text: text.value || null },
    fileCount,
    Boolean(input.notRequired)
  );
  const patch = {
    value_text: text.value || null,
    note: note.value || null,
    status,
    updated_at: nowIso(),
  };
  const supabase = refreshClient();
  if (supabase) {
    const { error } = await supabase.from("kopvast_onboarding_items").update(patch).eq("id", input.itemId);
    if (error) return fail(error.message);
  } else {
    await mutateStore((store) => {
      const item = store.onboardingItems.find((row) => row.id === input.itemId);
      if (!item) return;
      Object.assign(item, patch);
    });
  }
  await refreshDerivedStatus(record.onboarding.id);
  return { ok: true as const };
}

export async function reviewOnboardingItem(input: {
  itemId: string;
  status: "approved" | "rejected" | "not_required" | "missing";
  adminNote?: string;
  required?: boolean;
}) {
  const record = await findItem(input.itemId);
  if (!record) return fail("Item niet gevonden.");
  const note = validateOnboardingText(input.adminNote ?? "");
  if (!note.ok) return note;
  if (input.status === "rejected" && !note.value) {
    return fail("Geef aan wat er nog moet.");
  }
  const patch: Partial<OnboardingItemRow> = {
    status: input.status,
    admin_note: note.value || null,
    updated_at: nowIso(),
  };
  if (typeof input.required === "boolean") patch.required = input.required;
  const supabase = refreshClient();
  if (supabase) {
    const { error } = await supabase.from("kopvast_onboarding_items").update(patch).eq("id", input.itemId);
    if (error) return fail(error.message);
  } else {
    await mutateStore((store) => {
      const item = store.onboardingItems.find((row) => row.id === input.itemId);
      if (!item) return;
      Object.assign(item, patch);
    });
  }
  await refreshDerivedStatus(record.onboarding.id);
  return { ok: true as const };
}

export async function setOnboardingItemRequired(itemId: string, required: boolean) {
  const record = await findItem(itemId);
  if (!record) return fail("Item niet gevonden.");
  const supabase = refreshClient();
  if (supabase) {
    const { error } = await supabase
      .from("kopvast_onboarding_items")
      .update({ required, updated_at: nowIso() })
      .eq("id", itemId);
    if (error) return fail(error.message);
  } else {
    await mutateStore((store) => {
      const item = store.onboardingItems.find((row) => row.id === itemId);
      if (item) {
        item.required = required;
        item.updated_at = nowIso();
      }
    });
  }
  await refreshDerivedStatus(record.onboarding.id);
  return { ok: true as const };
}

export async function addCustomOnboardingItem(input: {
  onboardingId: string;
  title: string;
  section?: string;
  itemType?: string;
  required?: boolean;
  helpText?: string;
}) {
  const parsed = parseCustomItemInput(input);
  if (!parsed.ok) return parsed;
  const record = await loadOnboardingRecord(input.onboardingId);
  if (!record) return fail("Onboarding niet gevonden.");
  if (!isOnboardingSection(parsed.section) || !isOnboardingItemType(parsed.itemType)) {
    return fail("Ongeldig item.");
  }
  const now = nowIso();
  const keyBase = parsed.key;
  const existingKeys = new Set(record.items.map((item) => item.key));
  let key = keyBase;
  let n = 2;
  while (existingKeys.has(key)) {
    key = `${keyBase}-${n}`;
    n += 1;
  }
  const row: OnboardingItemRow = {
    id: newId(),
    onboarding_id: input.onboardingId,
    section: parsed.section,
    key,
    title: parsed.title,
    help_text: parsed.helpText,
    item_type: parsed.itemType,
    required: parsed.required,
    custom: true,
    status: "missing",
    value_text: null,
    note: null,
    admin_note: null,
    sort_order: (record.items.at(-1)?.sort_order ?? 0) + 1,
    created_at: now,
    updated_at: now,
  };
  const supabase = refreshClient();
  if (supabase) {
    const { error } = await supabase.from("kopvast_onboarding_items").insert(row);
    if (error) return fail(error.message);
  } else {
    await mutateStore((store) => {
      store.onboardingItems.push(row);
    });
  }
  await refreshDerivedStatus(input.onboardingId);
  return { ok: true as const, item: row };
}

export async function deleteCustomOnboardingItem(itemId: string) {
  const record = await findItem(itemId);
  if (!record) return fail("Item niet gevonden.");
  if (!record.item.custom) return fail("Standaarditems kun je niet verwijderen. Zet ze op niet verplicht of n.v.t.");
  for (const file of record.files) {
    await deleteStoredFile(file);
  }
  const supabase = refreshClient();
  if (supabase) {
    const { error } = await supabase.from("kopvast_onboarding_items").delete().eq("id", itemId);
    if (error) return fail(error.message);
  } else {
    await mutateStore((store) => {
      store.onboardingItems = store.onboardingItems.filter((item) => item.id !== itemId);
      store.onboardingFiles = store.onboardingFiles.filter((item) => item.item_id !== itemId);
    });
  }
  await refreshDerivedStatus(record.onboarding.id);
  return { ok: true as const };
}

export async function overrideOnboardingReady(input: {
  onboardingId: string;
  reason: string;
  actorEmail: string;
}) {
  const reason = validateOnboardingText(input.reason);
  if (!reason.ok) return reason;
  if (reason.value.length < 8) return fail("Geef een korte reden voor de override.");
  const now = nowIso();
  const patch = {
    status: "ready" as const,
    ready_at: now,
    override_reason: reason.value,
    overridden_by: input.actorEmail,
    overridden_at: now,
    updated_at: now,
  };
  const supabase = refreshClient();
  if (supabase) {
    const { error } = await supabase.from("kopvast_onboardings").update(patch).eq("id", input.onboardingId);
    if (error) return fail(error.message);
    return { ok: true as const };
  }
  const updated = await mutateStore((store) => {
    const row = store.onboardings.find((item) => item.id === input.onboardingId);
    if (!row) return false;
    Object.assign(row, patch);
    return true;
  });
  if (!updated) return fail("Onboarding niet gevonden.");
  return { ok: true as const };
}

export async function clearOnboardingOverride(onboardingId: string) {
  const supabase = refreshClient();
  if (supabase) {
    const { error } = await supabase
      .from("kopvast_onboardings")
      .update({
        override_reason: null,
        overridden_by: null,
        overridden_at: null,
        updated_at: nowIso(),
      })
      .eq("id", onboardingId);
    if (error) return fail(error.message);
  } else {
    await mutateStore((store) => {
      const row = store.onboardings.find((item) => item.id === onboardingId);
      if (!row) return;
      row.override_reason = null;
      row.overridden_by = null;
      row.overridden_at = null;
      row.updated_at = nowIso();
    });
  }
  await refreshDerivedStatus(onboardingId);
  return { ok: true as const };
}

async function findItem(itemId: string) {
  const supabase = refreshClient();
  if (supabase) {
    const { data: item } = await supabase.from("kopvast_onboarding_items").select("*").eq("id", itemId).maybeSingle();
    if (!item) return null;
    const { data: onboarding } = await supabase
      .from("kopvast_onboardings")
      .select("*")
      .eq("id", item.onboarding_id)
      .maybeSingle();
    if (!onboarding) return null;
    const { data: files } = await supabase.from("kopvast_onboarding_files").select("*").eq("item_id", itemId);
    return {
      item: item as OnboardingItemRow,
      onboarding: onboarding as OnboardingRow,
      files: (files ?? []) as OnboardingFileRow[],
    };
  }
  const store = await readStore();
  const item = store.onboardingItems.find((row) => row.id === itemId);
  if (!item) return null;
  const onboarding = store.onboardings.find((row) => row.id === item.onboarding_id);
  if (!onboarding) return null;
  return {
    item,
    onboarding,
    files: store.onboardingFiles.filter((row) => row.item_id === itemId),
  };
}

async function writeLocalBytes(fileId: string, bytes: Buffer) {
  await mkdir(localFilesDir, { recursive: true });
  await writeFile(path.join(localFilesDir, fileId), bytes);
}

async function readLocalBytes(fileId: string) {
  return readFile(path.join(localFilesDir, fileId));
}

async function deleteStoredFile(file: OnboardingFileRow) {
  const supabase = refreshClient();
  if (supabase) {
    await supabase.storage.from(ONBOARDING_BUCKET).remove([file.storage_key]);
    await supabase.from("kopvast_onboarding_files").delete().eq("id", file.id);
    return;
  }
  await unlink(path.join(localFilesDir, file.id)).catch(() => undefined);
  await mutateStore((store) => {
    store.onboardingFiles = store.onboardingFiles.filter((item) => item.id !== file.id);
  });
}

export async function uploadOnboardingFile(input: {
  itemId: string;
  organizationId: string;
  uploadedBy: string;
  replace?: boolean;
  file: { name: string; mime: string; size: number; bytes: Buffer };
}) {
  const check = validateOnboardingFile(input.file);
  if (!check.ok) return check;
  const record = await findItem(input.itemId);
  if (!record) return fail("Item niet gevonden.");
  if (record.onboarding.organization_id !== input.organizationId) return fail("Dit bestand hoort niet bij jouw omgeving.");
  if (record.item.item_type !== "file" && record.item.item_type !== "files") {
    return fail("Dit item neemt geen bestanden aan.");
  }
  if (record.item.item_type === "file" || input.replace) {
    for (const file of record.files) await deleteStoredFile(file);
  } else if (record.files.length >= ONBOARDING_MAX_FILES_PER_ITEM) {
    return fail("Je kunt hier maximaal 12 bestanden kwijt.");
  }
  const fileId = newId();
  const storageKey = onboardingStorageKey({
    organizationId: record.onboarding.organization_id,
    projectId: record.onboarding.project_id,
    itemId: record.item.id,
    fileId,
    fileName: input.file.name,
  });
  const row: OnboardingFileRow = {
    id: fileId,
    onboarding_id: record.onboarding.id,
    item_id: record.item.id,
    organization_id: record.onboarding.organization_id,
    project_id: record.onboarding.project_id,
    storage_key: storageKey,
    original_name: input.file.name,
    mime_type: input.file.mime,
    size_bytes: input.file.size,
    uploaded_by: input.uploadedBy,
    created_at: nowIso(),
  };
  const supabase = refreshClient();
  if (supabase) {
    const { error: uploadError } = await supabase.storage.from(ONBOARDING_BUCKET).upload(storageKey, input.file.bytes, {
      contentType: input.file.mime,
      upsert: true,
    });
    if (uploadError) {
      console.error("[kopvast] Upload mislukt", uploadError.message);
      return fail("Bestand opslaan is tijdelijk niet beschikbaar.");
    }
    const { error } = await supabase.from("kopvast_onboarding_files").insert(row);
    if (error) return fail(error.message);
  } else {
    await writeLocalBytes(fileId, input.file.bytes);
    await mutateStore((store) => {
      store.onboardingFiles.push(row);
    });
  }
  const fresh = await findItem(input.itemId);
  if (fresh) {
    const status = recomputeItemStatus(fresh.item, fresh.files.length, false);
    const patch = { status, updated_at: nowIso() };
    if (supabase) {
      await supabase.from("kopvast_onboarding_items").update(patch).eq("id", input.itemId);
    } else {
      await mutateStore((store) => {
        const item = store.onboardingItems.find((row) => row.id === input.itemId);
        if (item) Object.assign(item, patch);
      });
    }
    await refreshDerivedStatus(record.onboarding.id);
  }
  return { ok: true as const, file: row };
}

export async function deleteOnboardingFile(input: { fileId: string; organizationId: string }) {
  const supabase = refreshClient();
  let file: OnboardingFileRow | null = null;
  if (supabase) {
    const { data } = await supabase.from("kopvast_onboarding_files").select("*").eq("id", input.fileId).maybeSingle();
    file = (data as OnboardingFileRow | null) ?? null;
  } else {
    file = (await readStore()).onboardingFiles.find((item) => item.id === input.fileId) ?? null;
  }
  if (!file) return fail("Bestand niet gevonden.");
  if (file.organization_id !== input.organizationId) return fail("Dit bestand hoort niet bij jouw omgeving.");
  const itemId = file.item_id;
  await deleteStoredFile(file);
  const record = await findItem(itemId);
  if (record) {
    const status = recomputeItemStatus(record.item, record.files.length, record.item.status === "not_required");
    const patch = { status, updated_at: nowIso() };
    if (supabase) {
      await supabase.from("kopvast_onboarding_items").update(patch).eq("id", itemId);
    } else {
      await mutateStore((store) => {
        const item = store.onboardingItems.find((row) => row.id === itemId);
        if (item) Object.assign(item, patch);
      });
    }
    await refreshDerivedStatus(record.onboarding.id);
  }
  return { ok: true as const };
}

export async function loadOnboardingFileForDownload(fileId: string) {
  const supabase = refreshClient();
  if (supabase) {
    const { data } = await supabase.from("kopvast_onboarding_files").select("*").eq("id", fileId).maybeSingle();
    if (!data) return null;
    const file = data as OnboardingFileRow;
    const { data: blob, error } = await supabase.storage.from(ONBOARDING_BUCKET).download(file.storage_key);
    if (error || !blob) return null;
    return { file, bytes: Buffer.from(await blob.arrayBuffer()) };
  }
  const file = (await readStore()).onboardingFiles.find((item) => item.id === fileId) ?? null;
  if (!file) return null;
  try {
    return { file, bytes: await readLocalBytes(file.id) };
  } catch {
    return null;
  }
}

export { filesForItem };
