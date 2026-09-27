import { supabase } from "@/lib/supabase";

type PlannerData = Record<string, { goal: string; minutes: number }>;
type Theme = "light" | "warm";
type LegacyNote = { id?: string | number; title?: string; content?: string; body?: string };
type ProfileRecord = { id: string; display_name: string | null; theme: string | null };
type PlannerRecord = { plan_date: string; goal: string | null; minutes: number | null };
type NoteRecord = { id: number; title: string; content: string; created_at: string; updated_at: string };

export type UserData = {
  name: string;
  theme: Theme;
  planner: PlannerData;
  notes: { id: string; title: string; content: string; createdAt: string; updatedAt: string }[];
  profileMigrated: boolean;
  plannerMigrated: boolean;
  notesMigrated: boolean;
  errors: string[];
};

const marker = (userId: string, kind: "profile" | "planner" | "notes") => `studyforge-v33b:${userId}:${kind}`;

function readLegacyNotes(): LegacyNote[] {
  try {
    const value = JSON.parse(localStorage.getItem("studyforge-v2") ?? "{}") as { notes?: LegacyNote[] };
    return Array.isArray(value.notes) ? value.notes : [];
  } catch {
    return [];
  }
}

function mapPlanner(rows: PlannerRecord[]): PlannerData {
  return Object.fromEntries(rows.map((row) => [row.plan_date, { goal: row.goal ?? "", minutes: row.minutes ?? 0 }]));
}

function mapNotes(rows: NoteRecord[]) {
  return rows.map((row) => ({ id: String(row.id), title: row.title, content: row.content, createdAt: row.created_at, updatedAt: row.updated_at }));
}

export async function loadUserData(userId: string, fallback: { name: string; theme: Theme; planner: PlannerData }): Promise<UserData> {
  const result: UserData = { ...fallback, notes: [], profileMigrated: false, plannerMigrated: false, notesMigrated: false, errors: [] };
  const [profileResponse, plannerResponse, notesResponse] = await Promise.all([
    supabase.from("profiles").select("id,display_name,theme").eq("id", userId).maybeSingle(),
    supabase.from("planner").select("plan_date,goal,minutes").eq("user_id", userId),
    supabase.from("notes").select("id,title,content,created_at,updated_at").eq("user_id", userId).order("updated_at", { ascending: false }),
  ]);

  if (profileResponse.error) {
    result.errors.push(`Could not load profile: ${profileResponse.error.message}`);
  } else {
    let profile = profileResponse.data as ProfileRecord | null;
    if (!profile) {
      const inserted = await supabase.from("profiles").upsert({ id: userId, display_name: fallback.name || "Student", theme: fallback.theme }, { onConflict: "id" }).select("id,display_name,theme").single();
      if (inserted.error) result.errors.push(`Could not create profile: ${inserted.error.message}`);
      else profile = inserted.data as ProfileRecord;
    }
    if (profile) {
      result.name = profile.display_name || fallback.name || "Student";
      result.theme = profile.theme === "warm" ? "warm" : "light";
      localStorage.setItem(marker(userId, "profile"), "true");
      result.profileMigrated = true;
    }
  }

  if (plannerResponse.error) {
    result.errors.push(`Could not load planner: ${plannerResponse.error.message}`);
  } else {
    const existing = (plannerResponse.data ?? []) as PlannerRecord[];
    let merged = mapPlanner(existing);
    if (localStorage.getItem(marker(userId, "planner")) !== "true") {
      const missing = Object.entries(fallback.planner).filter(([date]) => !Object.hasOwn(merged, date));
      if (missing.length) {
        const rows = missing.map(([plan_date, value]) => ({ user_id: userId, plan_date, goal: value.goal, minutes: value.minutes }));
        const imported = await supabase.from("planner").upsert(rows, { onConflict: "user_id,plan_date" }).select("plan_date,goal,minutes");
        if (imported.error) result.errors.push(`Could not migrate planner: ${imported.error.message}`);
        else merged = { ...merged, ...mapPlanner((imported.data ?? []) as PlannerRecord[]) };
      }
      if (!result.errors.some((error) => error.startsWith("Could not migrate planner:"))) {
        localStorage.setItem(marker(userId, "planner"), "true");
        result.plannerMigrated = true;
      }
    } else result.plannerMigrated = true;
    result.planner = merged;
  }

  if (notesResponse.error) {
    result.errors.push(`Could not load notes: ${notesResponse.error.message}`);
  } else {
    let notes = (notesResponse.data ?? []) as NoteRecord[];
    if (localStorage.getItem(marker(userId, "notes")) !== "true") {
      const legacyNotes = readLegacyNotes();
      if (legacyNotes.length) {
        const rows = legacyNotes.map((note, index) => ({
          user_id: userId,
          title: note.title?.trim() || "Untitled note",
          content: note.content ?? note.body ?? "",
          legacy_key: String(note.id ?? `legacy-${index}`),
        }));
        const imported = await supabase.from("notes").upsert(rows, { onConflict: "user_id,legacy_key", ignoreDuplicates: true }).select("id,title,content,created_at,updated_at");
        if (imported.error) result.errors.push(`Could not migrate notes: ${imported.error.message}`);
        else notes = [...((imported.data ?? []) as NoteRecord[]), ...notes];
      }
      if (!result.errors.some((error) => error.startsWith("Could not migrate notes:"))) {
        localStorage.setItem(marker(userId, "notes"), "true");
        result.notesMigrated = true;
      }
    } else result.notesMigrated = true;
    result.notes = mapNotes(notes);
  }

  return result;
}
