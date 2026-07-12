"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import type { Exam, ExamAttempt, Question } from "@/lib/types";

const WARN_TEXT =
  "부정행위 주의: 10초 이상 마우스를 움직이지 않거나 창을 전환하면 위반으로 기록됩니다. 5회 누적 시 강제 종료 및 불합격 처리됩니다.";

export default function ExamPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [exam, setExam] = useState<Exam | null>(null);
  const [attempt, setAttempt] = useState<ExamAttempt | null>(null);
  const [answers, setAnswers] = useState<Record<string, { textAnswer?: string; choiceIndex?: number }>>({});
  const [files, setFiles] = useState<Record<string, File | null>>({});
  const [remain, setRemain] = useState<number | null>(null);
  const [error, setError] = useState("");
  const [done, setDone] = useState(false);
  const [warnVisible, setWarnVisible] = useState(false);
  const [warnFlash, setWarnFlash] = useState(0);
  const idleRef = useRef<number>(0);
  const switchRef = useRef(0);

  function showWarning() {
    setWarnVisible(true);
    setWarnFlash((n) => n + 1);
  }

  useEffect(() => {
    (async () => {
      const me = await fetch("/api/auth/me").then((r) => r.json());
      if (!me.user) {
        router.push("/login");
        return;
      }
      const fd = new FormData();
      fd.append("action", "start");
      fd.append("examId", id);
      const res = await fetch("/api/exams", { method: "PUT", body: fd });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "시험을 시작할 수 없습니다.");
        return;
      }
      setExam(data.exam);
      setAttempt(data.attempt);
      if (data.attempt.status !== "in_progress") {
        setDone(true);
      } else {
        const end = new Date(data.attempt.startedAt).getTime() + data.exam.durationMinutes * 60 * 1000;
        setRemain(Math.max(0, Math.floor((end - Date.now()) / 1000)));
        if (data.exam.antiCheat) showWarning();
      }
    })();
  }, [id, router]);

  useEffect(() => {
    if (remain == null || done) return;
    if (remain <= 0) {
      submit();
      return;
    }
    const t = setTimeout(() => setRemain((r) => (r == null ? r : r - 1)), 1000);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [remain, done]);

  // 부정행위 활성 시: 10초마다 주의 알림 + 창 전환 시 알림
  useEffect(() => {
    if (!exam?.antiCheat || !attempt || done) return;

    showWarning();
    const remind = setInterval(() => showWarning(), 10000);

    const onVis = () => {
      if (document.hidden) showWarning();
    };
    document.addEventListener("visibilitychange", onVis);
    window.addEventListener("blur", showWarning);

    return () => {
      clearInterval(remind);
      document.removeEventListener("visibilitychange", onVis);
      window.removeEventListener("blur", showWarning);
    };
  }, [exam, attempt, done]);

  useEffect(() => {
    if (!exam?.antiCheat || !attempt || done) return;

    const report = async (violation: boolean) => {
      if (violation) showWarning();
      const res = await fetch("/api/exams", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "heartbeat", attemptId: attempt.id, violation }),
      });
      const data = await res.json();
      if (data.forcedFail) {
        setDone(true);
        setError("부정행위 감지(창 전환/장시간 미사용 5회)로 시험이 강제 종료되어 불합격 처리되었습니다.");
        saveLocal({ ...attempt, status: "forced_fail", passed: false, totalScore: 0 }, exam);
      }
      if (typeof data.switchCount === "number") switchRef.current = data.switchCount;
    };

    const onVis = () => {
      if (document.hidden) report(true);
    };
    const onMove = () => {
      idleRef.current = Date.now();
    };
    idleRef.current = Date.now();
    const idleTimer = setInterval(() => {
      if (Date.now() - idleRef.current >= 10000) {
        idleRef.current = Date.now();
        report(true);
      }
    }, 1000);

    document.addEventListener("visibilitychange", onVis);
    window.addEventListener("mousemove", onMove);
    window.addEventListener("keydown", onMove);

    return () => {
      clearInterval(idleTimer);
      document.removeEventListener("visibilitychange", onVis);
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("keydown", onMove);
    };
  }, [exam, attempt, done]);

  const grouped = useMemo(() => {
    if (!exam) return [] as { subject: string; questions: Question[] }[];
    const map = new Map<string, Question[]>();
    for (const q of exam.questions) {
      const subject = q.subject || "공통";
      if (!map.has(subject)) map.set(subject, []);
      map.get(subject)!.push(q);
    }
    return [...map.entries()].map(([subject, questions]) => ({ subject, questions }));
  }, [exam]);

  function saveLocal(att: ExamAttempt, ex: Exam) {
    const raw = localStorage.getItem("hanvit_attempts");
    const list = raw ? JSON.parse(raw) : [];
    const next = [
      { id: att.id, title: ex.title, status: att.status, passed: att.passed, totalScore: att.totalScore },
      ...list.filter((x: { id: string }) => x.id !== att.id),
    ];
    localStorage.setItem("hanvit_attempts", JSON.stringify(next));
  }

  async function submit() {
    if (!attempt || !exam || done) return;
    const fd = new FormData();
    fd.append("action", "submit");
    fd.append("attemptId", attempt.id);
    const payload = exam.questions.map((q) => ({
      questionId: q.id,
      ...answers[q.id],
    }));
    fd.append("answers", JSON.stringify(payload));
    for (const q of exam.questions) {
      if (q.type === "file" && files[q.id]) fd.append(`file_${q.id}`, files[q.id]!);
    }
    const res = await fetch("/api/exams", { method: "PUT", body: fd });
    const data = await res.json();
    if (!res.ok) {
      setError(data.error || "제출 실패");
      return;
    }
    setDone(true);
    saveLocal(data.attempt, exam);
    setAttempt(data.attempt);
  }

  function renderQuestion(q: Question, idx: number) {
    return (
      <div key={q.id} className="card-panel" style={{ marginBottom: "0.85rem" }}>
        <strong>
          {idx + 1}. [
          {q.type === "multiple"
            ? "4지선다"
            : q.type === "short"
              ? "주관식"
              : q.type === "mixed"
                ? "복합"
                : "파일제출"}
          ] {q.prompt} ({q.points}점)
        </strong>
        {(q.type === "multiple" || q.type === "mixed") && q.options && (
          <div style={{ marginTop: "0.6rem", display: "grid", gap: "0.35rem" }}>
            {q.options.map((opt, i) => (
              <label key={i} style={{ display: "flex", gap: "0.4rem", alignItems: "center" }}>
                <input
                  type="radio"
                  name={q.id}
                  checked={answers[q.id]?.choiceIndex === i}
                  onChange={() => setAnswers({ ...answers, [q.id]: { ...answers[q.id], choiceIndex: i } })}
                />
                {i + 1}. {opt}
              </label>
            ))}
          </div>
        )}
        {(q.type === "short" || q.type === "mixed") && (
          <textarea
            style={{
              width: "100%",
              marginTop: "0.6rem",
              padding: "0.7rem",
              borderRadius: "0.5rem",
              border: "1px solid var(--line)",
            }}
            value={answers[q.id]?.textAnswer || ""}
            onChange={(e) =>
              setAnswers({ ...answers, [q.id]: { ...answers[q.id], textAnswer: e.target.value } })
            }
            placeholder="답안 작성"
          />
        )}
        {q.type === "file" && (
          <input
            type="file"
            style={{ marginTop: "0.6rem" }}
            onChange={(e) => setFiles({ ...files, [q.id]: e.target.files?.[0] || null })}
          />
        )}
      </div>
    );
  }

  if (error && !exam) {
    return (
      <div className="container">
        <h1 className="page-title">시험 응시</h1>
        <p className="card-panel" style={{ color: "var(--danger)" }}>
          {error}
        </p>
      </div>
    );
  }

  if (!exam || !attempt) return <p className="container">시험 준비 중...</p>;

  const mm = remain != null ? Math.floor(remain / 60) : 0;
  const ss = remain != null ? remain % 60 : 0;

  return (
    <div className="container" style={{ maxWidth: 860, position: "relative" }}>
      {exam.antiCheat && warnVisible && !done && (
        <div
          key={warnFlash}
          style={{
            position: "sticky",
            top: 72,
            zIndex: 50,
            marginBottom: "1rem",
            padding: "0.85rem 1rem",
            borderRadius: "0.75rem",
            background: "#fff4e5",
            border: "1px solid #f5c26b",
            color: "var(--warn)",
            fontWeight: 700,
            boxShadow: "0 6px 20px rgba(181, 71, 8, 0.15)",
            animation: "rise 0.35s ease",
          }}
        >
          {WARN_TEXT}
          {switchRef.current > 0 && (
            <span style={{ display: "block", marginTop: "0.35rem", fontWeight: 600, fontSize: "0.9rem" }}>
              현재 위반 횟수: {switchRef.current} / 5
            </span>
          )}
        </div>
      )}

      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          gap: "1rem",
          flexWrap: "wrap",
          alignItems: "flex-start",
        }}
      >
        <div>
          <h1 className="page-title">{exam.title}</h1>
          <p className="page-desc">
            제한 시간 {exam.durationMinutes}분
            {exam.antiCheat && " · 부정행위 감시 활성"} · 과목별 100점
          </p>
        </div>
        {!done && (
          <div className="card-panel" style={{ fontWeight: 800, color: "var(--navy)" }}>
            남은 시간 {String(mm).padStart(2, "0")}:{String(ss).padStart(2, "0")}
          </div>
        )}
      </div>

      {error && <p style={{ color: "var(--danger)" }}>{error}</p>}

      {done ? (
        <div className="card-panel">
          <p>시험이 제출되었습니다. 채점 결과는 마이페이지/관리자 채점 후 확인할 수 있습니다.</p>
          <button className="btn btn-primary" onClick={() => router.push("/mypage")}>
            마이페이지로
          </button>
        </div>
      ) : (
        <>
          {grouped.map((g) => (
            <section key={g.subject} style={{ marginBottom: "1.25rem" }}>
              <h2 style={{ color: "var(--navy)", fontSize: "1.15rem" }}>
                {g.subject}{" "}
                <span style={{ fontSize: "0.85rem", color: "var(--muted)", fontWeight: 600 }}>
                  (만점 100점 · {g.questions.reduce((s, q) => s + q.points, 0)}점 배분)
                </span>
              </h2>
              {g.questions.map((q, i) => renderQuestion(q, i))}
            </section>
          ))}
          <button className="btn btn-primary" onClick={submit}>
            답안 제출
          </button>
        </>
      )}
    </div>
  );
}
