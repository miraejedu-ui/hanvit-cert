import bcrypt from "bcryptjs";
import { v4 as uuid } from "uuid";
import type { Database } from "./types";
import { getSupabase, UPLOAD_BUCKET } from "./supabase";

function emptyDb(): Database {
  return {
    users: [],
    majors: [],
    jobFields: [],
    certifications: [],
    notices: [],
    criteria: [],
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

async function ensureAdmin() {
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

export async function readDb(): Promise<Database> {
  await ensureAdmin();
  const sb = getSupabase();

  const [
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
  ] = await Promise.all([
    sb.from("users").select("*"),
    sb.from("majors").select("*"),
    sb.from("job_fields").select("*"),
    sb.from("certifications").select("*"),
    sb.from("notices").select("*").order("created_at", { ascending: false }),
    sb.from("criteria").select("*"),
    sb.from("applications").select("*"),
    sb.from("exams").select("*"),
    sb.from("attempts").select("*"),
    sb.from("chat_rooms").select("*"),
    sb.from("chat_messages").select("*").order("created_at", { ascending: true }),
    sb.from("issued_certificates").select("*"),
    sb.from("authenticity").select("*"),
    sb.from("certificate_requests").select("*"),
  ]);

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
  }));

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

export async function writeDb(db: Database) {
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

  // upsert parents → children
  await upsert("users", usersRows);
  await upsert("majors", majorsRows);
  await upsert("job_fields", jobFieldsRows);
  await upsert("certifications", certRows);
  await upsert("notices", noticeRows);
  await upsert("criteria", criteriaRows);
  await upsert("applications", appRows);
  await upsert("exams", examRows);
  await upsert("attempts", attemptRows);
  await upsert("chat_rooms", roomRows);
  await upsert("chat_messages", msgRows);
  await upsert("issued_certificates", issuedRows);
  await upsert("authenticity", authRows);
  await upsert("certificate_requests", reqRows);

  // delete orphans children → parents
  await deleteMissing(
    "certificate_requests",
    db.certificateRequests.map((r) => r.id)
  );
  await deleteMissing("chat_messages", db.chatMessages.map((m) => m.id));
  await deleteMissing("issued_certificates", db.issuedCertificates.map((c) => c.id));
  await deleteMissing("attempts", db.attempts.map((a) => a.id));
  await deleteMissing("applications", db.applications.map((a) => a.id));
  await deleteMissing("criteria", db.criteria.map((c) => c.id));
  await deleteMissing("exams", db.exams.map((e) => e.id));
  await deleteMissing("notices", db.notices.map((n) => n.id));
  await deleteMissing("chat_rooms", db.chatRooms.map((r) => r.id));
  await deleteMissing("authenticity", db.authenticity.map((a) => a.id));
  await deleteMissing("certifications", db.certifications.map((c) => c.id));
  await deleteMissing("majors", db.majors.map((m) => m.id));
  await deleteMissing("job_fields", db.jobFields.map((j) => j.id));
  await deleteMissing(
    "users",
    db.users.map((u) => u.id)
  );
}

export async function saveUpload(file: File | Buffer, originalName: string): Promise<{ fileName: string; filePath: string }> {
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
