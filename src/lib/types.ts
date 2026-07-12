export type Role = "applicant" | "admin";

export interface User {
  id: string;
  email: string;
  password: string;
  name: string;
  phone?: string;
  birthDate?: string;
  role: Role;
  createdAt: string;
}

export interface Major {
  id: string;
  name: string;
  relatedJobs: string[];
}

export interface JobField {
  id: string;
  name: string;
  similarJobs: string[];
}

export interface Certification {
  id: string;
  name: string;
  organization: string;
  relatedMajors: string[];
  jobFields: string[];
  subjects: string[];
  passCriteria: string;
  overview: string;
  duties: string;
  career: string;
  eligibility: string;
  createdAt: string;
}

export interface Notice {
  id: string;
  title: string;
  content: string;
  fileName?: string;
  filePath?: string;
  authorId: string;
  createdAt: string;
}

export interface ExamCriteria {
  id: string;
  certificationId: string;
  title: string;
  content: string;
  fileName?: string;
  filePath?: string;
  createdAt: string;
}

export type ApplicationStatus =
  | "pending"
  | "approved"
  | "supplement"
  | "rejected";

export interface Application {
  id: string;
  userId: string;
  certificationId: string;
  name: string;
  birthDate: string;
  phone: string;
  email: string;
  documentFileName?: string;
  documentPath?: string;
  status: ApplicationStatus;
  statusReason?: string;
  createdAt: string;
  updatedAt: string;
}

export type QuestionType = "multiple" | "short" | "mixed" | "file";

export interface Question {
  id: string;
  type: QuestionType;
  subject: string;
  prompt: string;
  options?: string[];
  answer?: string;
  points: number;
}

export interface Exam {
  id: string;
  certificationId: string;
  title: string;
  startAt: string;
  endAt: string;
  durationMinutes: number;
  antiCheat: boolean;
  questions: Question[];
  createdAt: string;
}

export type ExamAttemptStatus = "in_progress" | "submitted" | "graded" | "forced_fail";

export interface ExamAnswer {
  questionId: string;
  textAnswer?: string;
  choiceIndex?: number;
  fileName?: string;
  filePath?: string;
  score?: number;
}

export interface ExamAttempt {
  id: string;
  examId: string;
  userId: string;
  applicationId: string;
  status: ExamAttemptStatus;
  answers: ExamAnswer[];
  startedAt: string;
  submittedAt?: string;
  totalScore?: number;
  passed?: boolean;
  switchCount?: number;
}

export interface ChatMessage {
  id: string;
  roomId: string;
  senderId: string;
  content: string;
  createdAt: string;
}

export interface ChatRoom {
  id: string;
  userId: string;
  createdAt: string;
}

export interface IssuedCertificate {
  id: string;
  userId: string;
  certificationId: string;
  name: string;
  birthDate: string;
  phone: string;
  issueDate: string;
  certType: "pass" | "completion" | "license";
  fileName?: string;
  filePath?: string;
  createdAt: string;
}

export interface AuthenticityRecord {
  id: string;
  name: string;
  birthDate: string;
  phone: string;
  issueDate: string;
  certificationName: string;
  createdAt: string;
}

export interface CertificateRequest {
  id: string;
  userId: string;
  certificationId: string;
  examAttemptId: string;
  status: "pending" | "issued" | "rejected";
  createdAt: string;
}

export interface Database {
  users: User[];
  majors: Major[];
  jobFields: JobField[];
  certifications: Certification[];
  notices: Notice[];
  criteria: ExamCriteria[];
  applications: Application[];
  exams: Exam[];
  attempts: ExamAttempt[];
  chatRooms: ChatRoom[];
  chatMessages: ChatMessage[];
  issuedCertificates: IssuedCertificate[];
  authenticity: AuthenticityRecord[];
  certificateRequests: CertificateRequest[];
}
