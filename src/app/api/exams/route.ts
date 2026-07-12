import { NextResponse } from "next/server";
import { readDb, writeDb, saveUpload, uuid } from "@/lib/db";
import { getSessionUser } from "@/lib/auth";
import type { ExamAttempt, Question } from "@/lib/types";

export async function GET(req: Request) {
  const user = await getSessionUser();
  const { searchParams } = new URL(req.url);
  const id = searchParams.get("id");
  const attemptId = searchParams.get("attemptId");
  const mine = searchParams.get("mine") === "1";
  const db = await readDb();

  if (mine) {
    if (!user) return NextResponse.json({ error: "로그인 필요" }, { status: 401 });
    const attempts = db.attempts
      .filter((a) => (user.role === "admin" ? true : a.userId === user.id))
      .map((a) => {
        const exam = db.exams.find((e) => e.id === a.examId);
        return {
          ...a,
          title: exam?.title,
          certificationId: exam?.certificationId,
          certificationName: db.certifications.find((c) => c.id === exam?.certificationId)?.name,
        };
      })
      .sort((a, b) => b.startedAt.localeCompare(a.startedAt));
    return NextResponse.json({ attempts });
  }

  if (attemptId) {
    if (!user) return NextResponse.json({ error: "로그인 필요" }, { status: 401 });
    const attempt = db.attempts.find((a) => a.id === attemptId);
    if (!attempt) return NextResponse.json({ error: "없음" }, { status: 404 });
    if (user.role !== "admin" && attempt.userId !== user.id) {
      return NextResponse.json({ error: "권한 없음" }, { status: 403 });
    }
    const exam = db.exams.find((e) => e.id === attempt.examId);
    return NextResponse.json({ attempt, exam });
  }

  if (id) {
    const exam = db.exams.find((e) => e.id === id);
    if (!exam) return NextResponse.json({ error: "없음" }, { status: 404 });
    const publicExam =
      user?.role === "admin"
        ? exam
        : {
            ...exam,
            questions: exam.questions.map(({ answer: _a, ...q }) => q),
          };
    return NextResponse.json({
      exam: publicExam,
      certification: db.certifications.find((c) => c.id === exam.certificationId),
    });
  }

  const exams = db.exams.map((e) => ({
    ...e,
    certificationName: db.certifications.find((c) => c.id === e.certificationId)?.name,
    questionCount: e.questions.length,
  }));
  return NextResponse.json({ exams });
}

export async function POST(req: Request) {
  const user = await getSessionUser();
  if (!user || user.role !== "admin") {
    return NextResponse.json({ error: "권한 없음" }, { status: 403 });
  }
  const body = await req.json();
  const questions: Question[] = (body.questions || []).map((q: Question) => {
    let answer = q.answer != null ? String(q.answer) : undefined;
    if ((q.type === "multiple" || q.type === "mixed") && answer != null) {
      const n = Number(answer);
      if (!Number.isNaN(n) && n >= 1 && n <= 4) answer = String(n - 1);
    }
    return {
      ...q,
      id: q.id || uuid(),
      subject: q.subject || "공통",
      points: Number(q.points) || 10,
      answer,
    };
  });
  const db = await readDb();
  const exam = {
    id: uuid(),
    certificationId: String(body.certificationId || ""),
    title: String(body.title || ""),
    startAt: body.startAt ? new Date(body.startAt).toISOString() : "",
    endAt: body.endAt ? new Date(body.endAt).toISOString() : "",
    durationMinutes: Number(body.durationMinutes) || 60,
    antiCheat: Boolean(body.antiCheat),
    questions,
    createdAt: new Date().toISOString(),
  };
  db.exams.push(exam);
  await writeDb(db);
  return NextResponse.json({ exam });
}

export async function PUT(req: Request) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "로그인 필요" }, { status: 401 });
  const contentType = req.headers.get("content-type") || "";

  if (contentType.includes("multipart/form-data")) {
    const form = await req.formData();
    const action = String(form.get("action") || "");
    const db = await readDb();

    if (action === "start") {
      const examId = String(form.get("examId") || "");
      const exam = db.exams.find((e) => e.id === examId);
      if (!exam) return NextResponse.json({ error: "시험 없음" }, { status: 404 });
      const now = Date.now();
      if (now < new Date(exam.startAt).getTime() || now > new Date(exam.endAt).getTime()) {
        return NextResponse.json({ error: "시험 응시 기간이 아닙니다." }, { status: 400 });
      }
      const approved = db.applications.find(
        (a) =>
          a.userId === user.id &&
          a.certificationId === exam.certificationId &&
          a.status === "approved"
      );
      if (!approved) {
        return NextResponse.json({ error: "승인된 원서 접수가 필요합니다." }, { status: 400 });
      }

      // 동일 시험 진행 중이면 이어하기
      const sameExamInProgress = db.attempts.find(
        (a) => a.examId === examId && a.userId === user.id && a.status === "in_progress"
      );
      if (sameExamInProgress) {
        return NextResponse.json({
          attempt: sameExamInProgress,
          exam: { ...exam, questions: exam.questions.map(({ answer: _a, ...q }) => q) },
        });
      }

      // 동일 종목은 응시 기간 내 1회만 (강제종료·제출·채점 포함)
      const priorSameCert = db.attempts.find((a) => {
        if (a.userId !== user.id) return false;
        const ex = db.exams.find((e) => e.id === a.examId);
        if (!ex || ex.certificationId !== exam.certificationId) return false;
        // 해당 시험(또는 동일 종목 시험)의 응시 기간과 겹치는 기록
        const periodStart = Math.min(new Date(ex.startAt).getTime(), new Date(exam.startAt).getTime());
        const periodEnd = Math.max(new Date(ex.endAt).getTime(), new Date(exam.endAt).getTime());
        const started = new Date(a.startedAt).getTime();
        return started >= periodStart && started <= periodEnd;
      });
      if (priorSameCert) {
        if (priorSameCert.examId === examId) {
          return NextResponse.json({
            attempt: priorSameCert,
            exam: { ...exam, questions: exam.questions.map(({ answer: _a, ...q }) => q) },
          });
        }
        return NextResponse.json(
          { error: "동일 종목은 정해진 기간 내에 한 번만 응시할 수 있습니다." },
          { status: 400 }
        );
      }

      const attempt: ExamAttempt = {
        id: uuid(),
        examId,
        userId: user.id,
        applicationId: approved.id,
        status: "in_progress",
        answers: [],
        startedAt: new Date().toISOString(),
        switchCount: 0,
      };
      db.attempts.push(attempt);
      await writeDb(db);
      return NextResponse.json({
        attempt,
        exam: { ...exam, questions: exam.questions.map(({ answer: _a, ...q }) => q) },
      });
    }

    if (action === "submit") {
      const attemptId = String(form.get("attemptId") || "");
      const answersRaw = String(form.get("answers") || "[]");
      const answers = JSON.parse(answersRaw);
      const idx = db.attempts.findIndex((a) => a.id === attemptId && a.userId === user.id);
      if (idx < 0) return NextResponse.json({ error: "응시 기록 없음" }, { status: 404 });
      const attempt = db.attempts[idx];
      const exam = db.exams.find((e) => e.id === attempt.examId);
      if (!exam) return NextResponse.json({ error: "시험 없음" }, { status: 404 });

      for (const q of exam.questions) {
        if (q.type === "file") {
          const f = form.get(`file_${q.id}`) as File | null;
          if (f && f.size > 0) {
            const uploaded = await saveUpload(f, f.name);
            const ans = answers.find((a: { questionId: string }) => a.questionId === q.id) || {
              questionId: q.id,
            };
            ans.fileName = uploaded.fileName;
            ans.filePath = uploaded.filePath;
            if (!answers.find((a: { questionId: string }) => a.questionId === q.id)) answers.push(ans);
          }
        }
      }

      db.attempts[idx] = {
        ...attempt,
        answers,
        status: "submitted",
        submittedAt: new Date().toISOString(),
      };
      await writeDb(db);
      return NextResponse.json({ attempt: db.attempts[idx] });
    }
  }

  const body = await req.json();
  const db = await readDb();

  if (body.action === "heartbeat") {
    const idx = db.attempts.findIndex((a) => a.id === body.attemptId && a.userId === user.id);
    if (idx < 0) return NextResponse.json({ error: "없음" }, { status: 404 });
    const attempt = db.attempts[idx];
    const exam = db.exams.find((e) => e.id === attempt.examId);
    if (!exam?.antiCheat) return NextResponse.json({ ok: true, switchCount: attempt.switchCount });

    const switchCount = (attempt.switchCount || 0) + (body.violation ? 1 : 0);
    if (switchCount >= 5) {
      db.attempts[idx] = {
        ...attempt,
        switchCount,
        status: "forced_fail",
        submittedAt: new Date().toISOString(),
        passed: false,
        totalScore: 0,
      };
      await writeDb(db);
      return NextResponse.json({ forcedFail: true, switchCount });
    }
    db.attempts[idx].switchCount = switchCount;
    await writeDb(db);
    return NextResponse.json({ ok: true, switchCount });
  }

  if (body.action === "grade" && user.role === "admin") {
    const idx = db.attempts.findIndex((a) => a.id === body.attemptId);
    if (idx < 0) return NextResponse.json({ error: "없음" }, { status: 404 });
    const attempt = db.attempts[idx];
    const exam = db.exams.find((e) => e.id === attempt.examId);
    if (!exam) return NextResponse.json({ error: "시험 없음" }, { status: 404 });

    const scoredAnswers = (body.answers || attempt.answers).map(
      (a: { questionId: string; score?: number; textAnswer?: string; choiceIndex?: number }) => {
        const q = exam.questions.find((qq) => qq.id === a.questionId);
        let score = a.score;
        if (score == null && q) {
          if (q.type === "multiple" && q.answer != null && a.choiceIndex != null) {
            const expected = Number(q.answer);
            score = Number(a.choiceIndex) === expected ? q.points : 0;
          } else if ((q.type === "short" || q.type === "mixed") && q.answer) {
            const choiceOk =
              q.type === "mixed" && q.answer != null && a.choiceIndex != null
                ? Number(a.choiceIndex) === Number(q.answer)
                : true;
            const textOk =
              String(a.textAnswer || "").trim().toLowerCase() === q.answer.trim().toLowerCase();
            score = q.type === "mixed" ? (choiceOk && textOk ? q.points : 0) : textOk ? q.points : 0;
          } else {
            score = 0;
          }
        }
        return { ...a, score: Number(score) || 0 };
      }
    );
    const totalScore = scoredAnswers.reduce((s: number, a: { score?: number }) => s + (a.score || 0), 0);

    // 과목별 100점 기준: 과목당 40점 이상 + 전과목 평균 60점 이상
    const bySubject = new Map<string, { score: number; max: number }>();
    for (const q of exam.questions) {
      const sub = q.subject || "공통";
      if (!bySubject.has(sub)) bySubject.set(sub, { score: 0, max: 0 });
      const bucket = bySubject.get(sub)!;
      bucket.max += q.points;
      const ans = scoredAnswers.find((a: { questionId: string }) => a.questionId === q.id);
      bucket.score += ans?.score || 0;
    }
    const subjectScores = [...bySubject.values()];
    const allSubjectsOk = subjectScores.every((s) => s.score >= 40);
    const avg =
      subjectScores.length === 0
        ? 0
        : subjectScores.reduce((sum, s) => sum + s.score, 0) / subjectScores.length;
    const passed = body.passed != null ? Boolean(body.passed) : allSubjectsOk && avg >= 60;

    db.attempts[idx] = {
      ...attempt,
      answers: scoredAnswers,
      totalScore,
      passed,
      status: "graded",
    };
    await writeDb(db);
    return NextResponse.json({ attempt: db.attempts[idx] });
  }

  return NextResponse.json({ error: "잘못된 요청" }, { status: 400 });
}
