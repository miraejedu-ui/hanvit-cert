import bcrypt from "bcryptjs";
import { v4 as uuid } from "uuid";
import type {
  ApplicationStatus,
  Database,
  ExamCriteriaDetails,
  LegacyCriteriaBlock,
  LegacyCriteriaSubject,
} from "./types";
import { getSupabase, UPLOAD_BUCKET } from "./supabase";

const JSON_STORE_ID = "hcai";
const LEGACY_STORE_ID = "main";
/** Bump to force re-import from legacy site_store main */
const STORE_VERSION = 3;

type Backend = "relational" | "json";
let backend: Backend | null = null;

type StoredDb = Database & { _storeVersion?: number };

function emptyDb(): Database {
  return {
    users: [],
    majors: [],
    jobFields: [],
    certifications: [],
    notices: [],
    criteria: [],
    eligibilityPresets: [],
    applications: [],
    exams: [],
    attempts: [],
    chatRooms: [],
    chatMessages: [],
    issuedCertificates: [],
    authenticity: [],
    certificateRequests: [],
  };
}

function nowIso() {
  return new Date().toISOString();
}

/** Returns true if the DB object was mutated and should be persisted */
function ensureAdminInDb(db: Database): boolean {
  const existing = db.users.find((u) => u.email === "seorun05");
  if (existing) {
    let changed = false;
    if (!existing.password || !bcrypt.compareSync("hanvit01", existing.password)) {
      existing.password = bcrypt.hashSync("hanvit01", 10);
      changed = true;
    }
    if (existing.role !== "admin") {
      existing.role = "admin";
      changed = true;
    }
    return changed;
  }
  db.users.push({
    id: uuid(),
    email: "seorun05",
    password: bcrypt.hashSync("hanvit01", 10),
    name: "관리자",
    role: "admin",
    createdAt: nowIso(),
  });
  return true;
}

function mapLegacySubjects(raw: unknown): LegacyCriteriaSubject[] {
  if (!Array.isArray(raw)) return [];
  return raw.map((s) => {
    const subject = s as Record<string, unknown>;
    const majors = Array.isArray(subject.majors) ? subject.majors : [];
    return {
      name: String(subject.name ?? ""),
      questions: subject.questions as string | number | undefined,
      majors: majors.map((m) => {
        const major = m as Record<string, unknown>;
        const details = Array.isArray(major.details) ? major.details : [];
        return {
          name: String(major.name ?? ""),
          details: details.map((d) => {
            const detail = d as Record<string, unknown>;
            const items = Array.isArray(detail.items) ? detail.items : [];
            return {
              name: String(detail.name ?? ""),
              items: items.map((it) => ({
                text: String((it as Record<string, unknown>).text ?? ""),
              })),
            };
          }),
        };
      }),
    };
  });
}

function toLegacyBlock(raw: Record<string, unknown> | undefined): LegacyCriteriaBlock | undefined {
  if (!raw) return undefined;
  return {
    method: raw.method != null ? String(raw.method) : undefined,
    process:
      raw.process != null
        ? String(raw.process)
        : raw.examProcess != null
          ? String(raw.examProcess)
          : undefined,
    duration: raw.duration != null ? String(raw.duration) : undefined,
    subjects: mapLegacySubjects(raw.subjects),
  };
}

function resolveEligibilityText(
  value: unknown,
  presets: Record<string, string[]>
): string {
  const keys = Array.isArray(value)
    ? value.map(String)
    : typeof value === "string" && value
      ? [value]
      : [];
  if (!keys.length) return "";
  const lines: string[] = [];
  for (const key of keys) {
    const presetKey =
      Object.keys(presets).find((k) => k === key || k.startsWith(key) || k.includes(`${key}유형`)) ||
      `${key}유형`;
    const items = presets[presetKey] || presets[key];
    if (items?.length) {
      lines.push(`[${presetKey}]`);
      lines.push(...items.map((x) => `· ${x}`));
    } else {
      lines.push(key);
    }
  }
  return lines.join("\n");
}

async function resolveBackend(): Promise<Backend> {
  if (backend) return backend;
  const sb = getSupabase();
  const { error } = await sb.from("users").select("id").limit(1);
  if (error && (error.code === "PGRST205" || /Could not find the table/i.test(error.message))) {
    backend = "json";
  } else if (error) {
    // Prefer json store when schema is missing/misconfigured
    backend = "json";
  } else {
    backend = "relational";
  }
  return backend;
}

function mapStatus(raw: unknown): ApplicationStatus {
  const s = String(raw || "");
  if (s.includes("승인") || s === "approved") return "approved";
  if (s.includes("보완") || s === "supplement") return "supplement";
  if (s.includes("반려") || s.includes("거절") || s === "rejected") return "rejected";
  return "pending";
}

function importLegacy(main: Record<string, unknown>): StoredDb {
  const db = emptyDb() as StoredDb;
  db._storeVersion = STORE_VERSION;
  const adminId = uuid();
  db.users.push({
    id: adminId,
    email: "seorun05",
    password: bcrypt.hashSync("hanvit01", 10),
    name: "관리자",
    role: "admin",
    createdAt: nowIso(),
  });

  const eligRaw = main.eligibilityPresets;
  const eligMap: Record<string, string[]> = {};
  if (eligRaw && typeof eligRaw === "object" && !Array.isArray(eligRaw)) {
    for (const [name, content] of Object.entries(eligRaw as Record<string, unknown>)) {
      eligMap[name] = Array.isArray(content) ? content.map(String) : [String(content ?? "")];
      db.eligibilityPresets.push({
        id: uuid(),
        name,
        content: eligMap[name].join("\n"),
        createdAt: nowIso(),
      });
    }
  }

  // Legacy jobs: { name, majors: "전공A,전공B", similar: "유사직무…" }
  // departments are 주관교육기관 names — NOT majors
  const jobs = Array.isArray(main.jobs) ? main.jobs : [];
  const splitCsv = (v: unknown) =>
    String(v || "")
      .split(/[,，]/)
      .map((s) => s.trim())
      .filter(Boolean);

  db.jobFields = jobs.map((j, i) => {
    const obj = j as Record<string, unknown>;
    return {
      id: String(obj.id ?? `job-${i + 1}`),
      name: String(obj.name ?? ""),
      relatedMajors: splitCsv(obj.majors),
      similarJobs: splitCsv(obj.similar),
    };
  });

  // Invert job→majors into major→relatedJobs (자가진단용)
  const majorToJobs = new Map<string, Set<string>>();
  for (const jf of db.jobFields) {
    for (const majorName of jf.relatedMajors) {
      if (!majorToJobs.has(majorName)) majorToJobs.set(majorName, new Set());
      majorToJobs.get(majorName)!.add(jf.name);
    }
  }
  db.majors = [...majorToJobs.entries()].map(([name, jobSet], i) => ({
    id: `major-${i + 1}`,
    name,
    relatedJobs: [...jobSet],
  }));

  const jobById = new Map(db.jobFields.map((j) => [j.id, j]));
  const jobNameById = new Map(db.jobFields.map((j) => [j.id, j.name]));

  const quals = Array.isArray(main.qualifications) ? main.qualifications : [];
  for (const raw of quals) {
    const q = raw as Record<string, unknown>;
    const id = String(q.id ?? uuid());
    const subjects = Array.isArray(q.subjects) ? q.subjects.map(String) : [];
    const jobIds = Array.isArray(q.jobIds) ? q.jobIds.map(String) : [];
    const linkedJobs = jobIds
      .map((jid) => jobById.get(jid) || jobById.get(String(Number(jid))))
      .filter(Boolean);
    const jobNames = linkedJobs.map((j) => j!.name);
    const relatedMajors = [
      ...new Set(linkedJobs.flatMap((j) => j!.relatedMajors)),
    ];

    db.certifications.push({
      id,
      name: String(q.name ?? ""),
      organization: String(q.department ?? ""),
      relatedMajors,
      jobFields: jobNames.length ? jobNames : jobIds.map((jid) => jobNameById.get(jid) || jid),
      subjects,
      passCriteria: String(q.passing ?? ""),
      overview: String(q.trend ?? ""),
      duties: "",
      career: String(q.englishName ? `영문명: ${q.englishName}` : ""),
      eligibility: resolveEligibilityText(q.eligibility, eligMap),
      createdAt: nowIso(),
    });

    const examCriteria = q.examCriteria as Record<string, unknown> | undefined;
    if (examCriteria && typeof examCriteria === "object") {
      const written = examCriteria.written as Record<string, unknown> | undefined;
      const practical = examCriteria.practical as Record<string, unknown> | undefined;
      const details: ExamCriteriaDetails = {};
      const legacyWritten = toLegacyBlock(written);
      const legacyPractical = toLegacyBlock(practical);
      if (legacyWritten) details.legacyWritten = legacyWritten;
      if (legacyPractical) details.legacyPractical = legacyPractical;

      if (written) {
        const writtenSubjects = Array.isArray(written.subjects) ? written.subjects : [];
        details.written = {
          examMethod: String(written.method ?? "객관식"),
          questionCount:
            writtenSubjects.reduce((sum: number, s) => {
              const n = Number((s as Record<string, unknown>)?.questions ?? 0);
              return sum + (Number.isFinite(n) ? n : 0);
            }, 0) || "60",
          duration: String(written.duration ?? ""),
          questionsPerSubject: 20,
        };
      }
      if (practical) {
        details.practical = {
          process: String(practical.process ?? practical.examProcess ?? ""),
          examMethod: String(practical.method ?? ""),
          duration: String(practical.duration ?? ""),
        };
      }
      if (details.legacyWritten && details.legacyPractical) details.kind = "both";
      else if (details.legacyWritten || details.written) details.kind = "written";
      else if (details.legacyPractical || details.practical) details.kind = "practical";

      const summary: string[] = [];
      if (details.written) {
        summary.push(
          "[필기]",
          `검정방법: ${details.written.examMethod}`,
          `문제수: ${details.written.questionCount}`,
          `시험시간: ${details.written.duration}`
        );
      }
      if (details.practical) {
        summary.push(
          "[실기]",
          `시험과정: ${details.practical.process}`,
          `검정방법: ${details.practical.examMethod}`,
          `시험시간: ${details.practical.duration}`
        );
      }

      db.criteria.push({
        id: `criteria-${id}`,
        certificationId: id,
        title: `${String(q.name ?? "")} 출제기준`.trim(),
        content: summary.join("\n"),
        createdAt: nowIso(),
        details,
      });
    }
  }

  const notices = Array.isArray(main.notices) ? main.notices : [];
  db.notices = notices.map((n) => {
    const obj = n as Record<string, unknown>;
    const dateRaw = String(obj.date || "");
    const parsed = dateRaw ? new Date(dateRaw.replace(/\./g, "-")) : new Date();
    return {
      id: String(obj.id ?? uuid()),
      title: String(obj.title ?? ""),
      content: String(obj.content ?? ""),
      authorId: adminId,
      createdAt: Number.isNaN(parsed.getTime()) ? nowIso() : parsed.toISOString(),
    };
  });

  if (Array.isArray(eligRaw)) {
    db.eligibilityPresets = eligRaw.map((p) => {
      const obj = p as Record<string, unknown>;
      return {
        id: String(obj.id ?? uuid()),
        name: String(obj.name ?? ""),
        content: Array.isArray(obj.content)
          ? obj.content.map(String).join("\n")
          : String(obj.content ?? ""),
        createdAt: String(obj.createdAt ?? nowIso()),
      };
    });
  }

  const apps = Array.isArray(main.applications) ? main.applications : [];
  db.applications = apps.map((a) => {
    const obj = a as Record<string, unknown>;
    const cert =
      db.certifications.find((c) => c.name === String(obj.examName ?? "")) ||
      db.certifications[0];
    return {
      id: String(obj.id ?? uuid()),
      userId: adminId,
      certificationId: cert?.id || "",
      name: String(obj.applicant ?? ""),
      birthDate: "",
      phone: "",
      email: "",
      documentFileName: obj.documentName ? String(obj.documentName) : undefined,
      status: mapStatus(obj.status),
      statusReason: obj.reviewNote ? String(obj.reviewNote) : undefined,
      createdAt: nowIso(),
      updatedAt: nowIso(),
    };
  });

  return db;
}

async function loadLegacyAndSave(): Promise<StoredDb> {
  const sb = getSupabase();
  const [legacy, existingRes] = await Promise.all([
    sb.from("site_store").select("data").eq("id", LEGACY_STORE_ID).maybeSingle(),
    sb.from("site_store").select("data").eq("id", JSON_STORE_ID).maybeSingle(),
  ]);
  if (legacy.error) throw legacy.error;
  if (existingRes.error) throw existingRes.error;

  const imported =
    legacy.data?.data && typeof legacy.data.data === "object"
      ? importLegacy(legacy.data.data as Record<string, unknown>)
      : (emptyDb() as StoredDb);
  imported._storeVersion = STORE_VERSION;

  const prev = existingRes.data?.data as StoredDb | undefined;
  if (prev && typeof prev === "object") {
    // Keep operational records not present in legacy qualifications dump
    imported.authenticity = prev.authenticity || [];
    imported.chatRooms = prev.chatRooms || [];
    imported.chatMessages = prev.chatMessages || [];
    imported.issuedCertificates = prev.issuedCertificates || [];
    imported.certificateRequests = prev.certificateRequests || [];
    imported.exams = prev.exams || [];
    imported.attempts = prev.attempts || [];

    const mainCertIds = new Set(imported.certifications.map((c) => c.id));
    const extraCerts = (prev.certifications || []).filter((c) => !mainCertIds.has(c.id));
    imported.certifications.push(...extraCerts);
    const mainCriteriaIds = new Set(imported.criteria.map((c) => c.id));
    imported.criteria.push(
      ...(prev.criteria || []).filter(
        (c) => !mainCriteriaIds.has(c.id) && (extraCerts.some((x) => x.id === c.certificationId) || !mainCertIds.has(c.certificationId))
      )
    );
  }

  ensureAdminInDb(imported);

  const { error: upsertError } = await sb.from("site_store").upsert({
    id: JSON_STORE_ID,
    data: imported,
    updated_at: nowIso(),
  });
  if (upsertError) throw upsertError;
  return imported;
}

async function readJsonDb(): Promise<Database> {
  const sb = getSupabase();
  const { data, error } = await sb
    .from("site_store")
    .select("data")
    .eq("id", JSON_STORE_ID)
    .maybeSingle();
  if (error) throw error;

  if (data?.data && typeof data.data === "object") {
    const stored = data.data as StoredDb;
    if (stored._storeVersion === STORE_VERSION) {
      const db = { ...emptyDb(), ...stored } as StoredDb;
      db.jobFields = (db.jobFields || []).map((j) => ({
        ...j,
        relatedMajors: j.relatedMajors || [],
        similarJobs: j.similarJobs || [],
      }));
      if (ensureAdminInDb(db)) await writeJsonDb(db);
      return db;
    }
  }

  return loadLegacyAndSave();
}

async function writeJsonDb(db: Database) {
  ensureAdminInDb(db);
  const payload = { ...(db as StoredDb), _storeVersion: STORE_VERSION };
  const sb = getSupabase();
  const { error } = await sb.from("site_store").upsert({
    id: JSON_STORE_ID,
    data: payload,
    updated_at: nowIso(),
  });
  if (error) throw error;
}

async function ensureAdminRelational() {
  const sb = getSupabase();
  const { data, error } = await sb.from("users").select("id").eq("email", "seorun05").maybeSingle();
  if (error) throw error;
  if (data) return;
  const { error: insertError } = await sb.from("users").insert({
    id: uuid(),
    email: "seorun05",
    password: bcrypt.hashSync("hanvit01", 10),
    name: "관리자",
    role: "admin",
  });
  if (insertError) throw insertError;
}

async function readRelationalDb(): Promise<Database> {
  await ensureAdminRelational();
  const sb = getSupabase();

  const [
    users,
    majors,
    jobFields,
    certifications,
    notices,
    criteria,
    eligibilityPresets,
    applications,
    exams,
    attempts,
    chatRooms,
    chatMessages,
    issuedCertificates,
    authenticity,
    certificateRequests,
  ] = await Promise.all([
    sb.from("users").select("*"),
    sb.from("majors").select("*"),
    sb.from("job_fields").select("*"),
    sb.from("certifications").select("*"),
    sb.from("notices").select("*").order("created_at", { ascending: false }),
    sb.from("criteria").select("*"),
    sb.from("eligibility_presets").select("*").order("created_at", { ascending: false }),
    sb.from("applications").select("*"),
    sb.from("exams").select("*"),
    sb.from("attempts").select("*"),
    sb.from("chat_rooms").select("*"),
    sb.from("chat_messages").select("*").order("created_at", { ascending: true }),
    sb.from("issued_certificates").select("*"),
    sb.from("authenticity").select("*"),
    sb.from("certificate_requests").select("*"),
  ]);

  const eligibilityOk = !eligibilityPresets.error;
  const fail = [
    users,
    majors,
    jobFields,
    certifications,
    notices,
    criteria,
    applications,
    exams,
    attempts,
    chatRooms,
    chatMessages,
    issuedCertificates,
    authenticity,
    certificateRequests,
  ].find((r) => r.error);
  if (fail?.error) throw fail.error;

  const db = emptyDb();

  db.users = (users.data || []).map((r) => ({
    id: r.id,
    email: r.email,
    password: r.password,
    name: r.name,
    phone: r.phone || undefined,
    birthDate: r.birth_date || undefined,
    role: r.role,
    createdAt: r.created_at,
  }));

  db.majors = (majors.data || []).map((r) => ({
    id: r.id,
    name: r.name,
    relatedJobs: r.related_jobs || [],
  }));

  db.jobFields = (jobFields.data || []).map((r) => ({
    id: r.id,
    name: r.name,
    relatedMajors: r.related_majors || [],
    similarJobs: r.similar_jobs || [],
  }));

  db.certifications = (certifications.data || []).map((r) => ({
    id: r.id,
    name: r.name,
    organization: r.organization,
    relatedMajors: r.related_majors || [],
    jobFields: r.job_fields || [],
    subjects: r.subjects || [],
    passCriteria: r.pass_criteria || "",
    overview: r.overview || "",
    duties: r.duties || "",
    career: r.career || "",
    eligibility: r.eligibility || "",
    createdAt: r.created_at,
  }));

  db.notices = (notices.data || []).map((r) => ({
    id: r.id,
    title: r.title,
    content: r.content,
    fileName: r.file_name || undefined,
    filePath: r.file_path || undefined,
    authorId: r.author_id,
    createdAt: r.created_at,
  }));

  db.criteria = (criteria.data || []).map((r) => ({
    id: r.id,
    certificationId: r.certification_id,
    title: r.title,
    content: r.content,
    fileName: r.file_name || undefined,
    filePath: r.file_path || undefined,
    createdAt: r.created_at,
    details:
      r.details && typeof r.details === "object" && Object.keys(r.details).length > 0
        ? r.details
        : undefined,
  }));

  db.eligibilityPresets = eligibilityOk
    ? (eligibilityPresets.data || []).map((r) => ({
        id: r.id,
        name: r.name,
        content: r.content || "",
        createdAt: r.created_at,
      }))
    : [];

  db.applications = (applications.data || []).map((r) => ({
    id: r.id,
    userId: r.user_id,
    certificationId: r.certification_id,
    name: r.name,
    birthDate: r.birth_date,
    phone: r.phone,
    email: r.email,
    documentFileName: r.document_file_name || undefined,
    documentPath: r.document_path || undefined,
    status: r.status,
    statusReason: r.status_reason || undefined,
    createdAt: r.created_at,
    updatedAt: r.updated_at,
  }));

  db.exams = (exams.data || []).map((r) => ({
    id: r.id,
    certificationId: r.certification_id,
    title: r.title,
    startAt: r.start_at,
    endAt: r.end_at,
    durationMinutes: r.duration_minutes,
    antiCheat: r.anti_cheat,
    questions: r.questions || [],
    createdAt: r.created_at,
  }));

  db.attempts = (attempts.data || []).map((r) => ({
    id: r.id,
    examId: r.exam_id,
    userId: r.user_id,
    applicationId: r.application_id,
    status: r.status,
    answers: r.answers || [],
    startedAt: r.started_at,
    submittedAt: r.submitted_at || undefined,
    totalScore: r.total_score != null ? Number(r.total_score) : undefined,
    passed: r.passed ?? undefined,
    switchCount: r.switch_count ?? 0,
  }));

  db.chatRooms = (chatRooms.data || []).map((r) => ({
    id: r.id,
    userId: r.user_id,
    createdAt: r.created_at,
  }));

  db.chatMessages = (chatMessages.data || []).map((r) => ({
    id: r.id,
    roomId: r.room_id,
    senderId: r.sender_id,
    content: r.content,
    createdAt: r.created_at,
  }));

  db.issuedCertificates = (issuedCertificates.data || []).map((r) => ({
    id: r.id,
    userId: r.user_id,
    certificationId: r.certification_id,
    name: r.name,
    birthDate: r.birth_date,
    phone: r.phone,
    issueDate: r.issue_date,
    certType: r.cert_type,
    fileName: r.file_name || undefined,
    filePath: r.file_path || undefined,
    createdAt: r.created_at,
  }));

  db.authenticity = (authenticity.data || []).map((r) => ({
    id: r.id,
    name: r.name,
    birthDate: r.birth_date,
    phone: r.phone,
    issueDate: r.issue_date,
    certificationName: r.certification_name,
    createdAt: r.created_at,
  }));

  db.certificateRequests = (certificateRequests.data || []).map((r) => ({
    id: r.id,
    userId: r.user_id,
    certificationId: r.certification_id,
    examAttemptId: r.exam_attempt_id,
    status: r.status,
    createdAt: r.created_at,
  }));

  return db;
}

async function writeRelationalDb(db: Database) {
  const sb = getSupabase();

  const upsert = async (table: string, rows: Record<string, unknown>[]) => {
    if (rows.length === 0) return;
    const { error } = await sb.from(table).upsert(rows, { onConflict: "id" });
    if (error) throw error;
  };

  const deleteMissing = async (table: string, ids: string[]) => {
    const { data: existing, error } = await sb.from(table).select("id");
    if (error) throw error;
    const keep = new Set(ids);
    const toDelete = (existing || []).map((r) => r.id as string).filter((id) => !keep.has(id));
    if (toDelete.length) {
      const { error: delErr } = await sb.from(table).delete().in("id", toDelete);
      if (delErr) throw delErr;
    }
  };

  const usersRows = db.users.map((u) => ({
    id: u.id,
    email: u.email,
    password: u.password,
    name: u.name,
    phone: u.phone ?? null,
    birth_date: u.birthDate ?? null,
    role: u.role,
    created_at: u.createdAt,
  }));
  const majorsRows = db.majors.map((m) => ({
    id: m.id,
    name: m.name,
    related_jobs: m.relatedJobs,
  }));
  const jobFieldsRows = db.jobFields.map((j) => ({
    id: j.id,
    name: j.name,
    related_majors: j.relatedMajors || [],
    similar_jobs: j.similarJobs,
  }));
  const certRows = db.certifications.map((c) => ({
    id: c.id,
    name: c.name,
    organization: c.organization,
    related_majors: c.relatedMajors,
    job_fields: c.jobFields,
    subjects: c.subjects,
    pass_criteria: c.passCriteria,
    overview: c.overview,
    duties: c.duties,
    career: c.career,
    eligibility: c.eligibility,
    created_at: c.createdAt,
  }));
  const noticeRows = db.notices.map((n) => ({
    id: n.id,
    title: n.title,
    content: n.content,
    file_name: n.fileName ?? null,
    file_path: n.filePath ?? null,
    author_id: n.authorId,
    created_at: n.createdAt,
  }));
  const criteriaRows = db.criteria.map((c) => ({
    id: c.id,
    certification_id: c.certificationId,
    title: c.title,
    content: c.content,
    file_name: c.fileName ?? null,
    file_path: c.filePath ?? null,
    created_at: c.createdAt,
    details: c.details ?? {},
  }));
  const eligibilityPresetRows = db.eligibilityPresets.map((p) => ({
    id: p.id,
    name: p.name,
    content: p.content,
    created_at: p.createdAt,
  }));
  const appRows = db.applications.map((a) => ({
    id: a.id,
    user_id: a.userId,
    certification_id: a.certificationId,
    name: a.name,
    birth_date: a.birthDate,
    phone: a.phone,
    email: a.email,
    document_file_name: a.documentFileName ?? null,
    document_path: a.documentPath ?? null,
    status: a.status,
    status_reason: a.statusReason ?? null,
    created_at: a.createdAt,
    updated_at: a.updatedAt,
  }));
  const examRows = db.exams.map((e) => ({
    id: e.id,
    certification_id: e.certificationId,
    title: e.title,
    start_at: e.startAt,
    end_at: e.endAt,
    duration_minutes: e.durationMinutes,
    anti_cheat: e.antiCheat,
    questions: e.questions,
    created_at: e.createdAt,
  }));
  const attemptRows = db.attempts.map((a) => ({
    id: a.id,
    exam_id: a.examId,
    user_id: a.userId,
    application_id: a.applicationId,
    status: a.status,
    answers: a.answers,
    started_at: a.startedAt,
    submitted_at: a.submittedAt ?? null,
    total_score: a.totalScore ?? null,
    passed: a.passed ?? null,
    switch_count: a.switchCount ?? 0,
  }));
  const roomRows = db.chatRooms.map((r) => ({
    id: r.id,
    user_id: r.userId,
    created_at: r.createdAt,
  }));
  const msgRows = db.chatMessages.map((m) => ({
    id: m.id,
    room_id: m.roomId,
    sender_id: m.senderId,
    content: m.content,
    created_at: m.createdAt,
  }));
  const issuedRows = db.issuedCertificates.map((c) => ({
    id: c.id,
    user_id: c.userId,
    certification_id: c.certificationId,
    name: c.name,
    birth_date: c.birthDate,
    phone: c.phone,
    issue_date: c.issueDate,
    cert_type: c.certType,
    file_name: c.fileName ?? null,
    file_path: c.filePath ?? null,
    created_at: c.createdAt,
  }));
  const authRows = db.authenticity.map((a) => ({
    id: a.id,
    name: a.name,
    birth_date: a.birthDate,
    phone: a.phone,
    issue_date: a.issueDate,
    certification_name: a.certificationName,
    created_at: a.createdAt,
  }));
  const reqRows = db.certificateRequests.map((r) => ({
    id: r.id,
    user_id: r.userId,
    certification_id: r.certificationId,
    exam_attempt_id: r.examAttemptId,
    status: r.status,
    created_at: r.createdAt,
  }));

  await upsert("users", usersRows);
  await upsert("majors", majorsRows);
  await upsert("job_fields", jobFieldsRows);
  await upsert("certifications", certRows);
  await upsert("notices", noticeRows);
  await upsert("criteria", criteriaRows);
  try {
    await upsert("eligibility_presets", eligibilityPresetRows);
  } catch (err) {
    if (eligibilityPresetRows.length > 0) throw err;
  }
  await upsert("applications", appRows);
  await upsert("exams", examRows);
  await upsert("attempts", attemptRows);
  await upsert("chat_rooms", roomRows);
  await upsert("chat_messages", msgRows);
  await upsert("issued_certificates", issuedRows);
  await upsert("authenticity", authRows);
  await upsert("certificate_requests", reqRows);

  await deleteMissing("certificate_requests", db.certificateRequests.map((r) => r.id));
  await deleteMissing("chat_messages", db.chatMessages.map((m) => m.id));
  await deleteMissing("issued_certificates", db.issuedCertificates.map((c) => c.id));
  await deleteMissing("attempts", db.attempts.map((a) => a.id));
  await deleteMissing("applications", db.applications.map((a) => a.id));
  await deleteMissing("criteria", db.criteria.map((c) => c.id));
  try {
    await deleteMissing("eligibility_presets", db.eligibilityPresets.map((p) => p.id));
  } catch {
    // table may not exist until migration is applied
  }
  await deleteMissing("exams", db.exams.map((e) => e.id));
  await deleteMissing("notices", db.notices.map((n) => n.id));
  await deleteMissing("chat_rooms", db.chatRooms.map((r) => r.id));
  await deleteMissing("authenticity", db.authenticity.map((a) => a.id));
  await deleteMissing("certifications", db.certifications.map((c) => c.id));
  await deleteMissing("majors", db.majors.map((m) => m.id));
  await deleteMissing("job_fields", db.jobFields.map((j) => j.id));
  await deleteMissing("users", db.users.map((u) => u.id));
}

export async function readDb(): Promise<Database> {
  const mode = await resolveBackend();
  return mode === "json" ? readJsonDb() : readRelationalDb();
}

export async function writeDb(db: Database) {
  const mode = await resolveBackend();
  if (mode === "json") {
    await writeJsonDb(db);
    return;
  }
  await writeRelationalDb(db);
}

export async function saveUpload(
  file: File | Buffer,
  originalName: string
): Promise<{ fileName: string; filePath: string }> {
  const sb = getSupabase();
  const safe = `${Date.now()}_${originalName.replace(/[^a-zA-Z0-9._-]/g, "_")}`;
  const buffer = Buffer.isBuffer(file) ? file : Buffer.from(await file.arrayBuffer());
  const { error } = await sb.storage.from(UPLOAD_BUCKET).upload(safe, buffer, {
    contentType: file instanceof File ? file.type || "application/octet-stream" : "application/octet-stream",
    upsert: false,
  });
  if (error) throw error;
  return { fileName: originalName, filePath: `${UPLOAD_BUCKET}/${safe}` };
}

export async function downloadUpload(filePath: string): Promise<{ data: Blob; name: string }> {
  const sb = getSupabase();
  const key = filePath.startsWith(`${UPLOAD_BUCKET}/`)
    ? filePath.slice(UPLOAD_BUCKET.length + 1)
    : filePath.replace(/^uploads[\\/]/, "");
  const { data, error } = await sb.storage.from(UPLOAD_BUCKET).download(key);
  if (error || !data) throw error || new Error("파일 없음");
  return { data, name: key };
}

export { uuid };
