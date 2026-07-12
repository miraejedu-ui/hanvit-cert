"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { AdminNav } from "@/components/AdminNav";

type Attempt = {
  id: string;
  title?: string;
  certificationName?: string;
  status: string;
  totalScore?: number;
  passed?: boolean;
  answers: { questionId: string; textAnswer?: string; choiceIndex?: number; filePath?: string; score?: number }[];
  userId: string;
  examId: string;
};

export default function AdminGradingPage() {
  const router = useRouter();
  const [attempts, setAttempts] = useState<Attempt[]>([]);
  const [selected, setSelected] = useState<Attempt | null>(null);
  const [examQuestions, setExamQuestions] = useState<
    { id: string; prompt: string; type: string; points: number; options?: string[]; subject?: string }[]
  >([]);
  const [scores, setScores] = useState<Record<string, number>>({});

  async function load() {
    const me = await fetch("/api/auth/me").then((r) => r.json());
    if (!me.user || me.user.role !== "admin") {
      router.push("/login");
      return;
    }
    const data = await fetch("/api/exams?mine=1").then((r) => r.json());
    setAttempts(data.attempts || []);
  }

  useEffect(() => {
    load();
  }, [router]);

  async function openAttempt(a: Attempt) {
    const data = await fetch(`/api/exams?attemptId=${a.id}`).then((r) => r.json());
    setSelected(data.attempt);
    setExamQuestions(data.exam?.questions || []);
    const init: Record<string, number> = {};
    (data.attempt.answers || []).forEach((ans: { questionId: string; score?: number }) => {
      init[ans.questionId] = ans.score ?? 0;
    });
    setScores(init);
  }

  async function grade(passed?: boolean) {
    if (!selected) return;
    const answers = selected.answers.map((a) => ({
      ...a,
      score: scores[a.questionId] ?? a.score ?? 0,
    }));
    // ensure all questions represented
    for (const q of examQuestions) {
      if (!answers.find((a) => a.questionId === q.id)) {
        answers.push({ questionId: q.id, score: scores[q.id] ?? 0 });
      }
    }
    await fetch("/api/exams", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "grade", attemptId: selected.id, answers, passed }),
    });
    setSelected(null);
    load();
  }

  return (
    <div className="container">
      <h1 className="page-title">시험 채점 / 결과 전송</h1>
      <AdminNav />

      <div className="card-panel" style={{ marginBottom: "1rem" }}>
        <table className="table">
          <thead>
            <tr>
              <th>시험</th>
              <th>상태</th>
              <th>점수</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {attempts.map((a) => (
              <tr key={a.id}>
                <td>
                  {a.title} ({a.certificationName})
                </td>
                <td>{a.status}</td>
                <td>
                  {a.totalScore ?? "-"} {a.passed != null ? (a.passed ? "합격" : "불합격") : ""}
                </td>
                <td>
                  <button className="btn btn-ghost" onClick={() => openAttempt(a)}>
                    채점
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {selected && (
        <div className="card-panel">
          <h2 style={{ marginTop: 0 }}>답안 채점 (과목당 100점 · 과목 40점↑ + 평균 60점↑)</h2>
          {[...new Set(examQuestions.map((q) => q.subject || "공통"))].map((subject) => {
            const qs = examQuestions.filter((q) => (q.subject || "공통") === subject);
            const subScore = qs.reduce((s, q) => s + (scores[q.id] ?? 0), 0);
            return (
              <div key={subject} style={{ marginBottom: "1.25rem" }}>
                <h3 style={{ color: "var(--navy)", marginBottom: "0.5rem" }}>
                  {subject}{" "}
                  <span style={{ fontSize: "0.85rem", color: "var(--muted)", fontWeight: 600 }}>
                    ({subScore} / 100)
                  </span>
                </h3>
                {qs.map((q) => {
                  const ans = selected.answers.find((a) => a.questionId === q.id);
                  return (
                    <div
                      key={q.id}
                      style={{
                        marginBottom: "0.85rem",
                        paddingBottom: "0.85rem",
                        borderBottom: "1px solid var(--line)",
                      }}
                    >
                      <strong>{q.prompt}</strong>
                      <p style={{ margin: "0.35rem 0", color: "var(--muted)" }}>
                        답:{" "}
                        {ans?.choiceIndex != null && q.options
                          ? q.options[ans.choiceIndex]
                          : ans?.textAnswer || (ans?.filePath ? `파일: ${ans.filePath}` : "-")}
                      </p>
                      {ans?.filePath && (
                        <a href={`/api/upload?file=${encodeURIComponent(ans.filePath)}`}>파일 다운로드</a>
                      )}
                      <div className="field">
                        <label>점수 (만점 {q.points})</label>
                        <input
                          type="number"
                          max={q.points}
                          value={scores[q.id] ?? 0}
                          onChange={(e) => setScores({ ...scores, [q.id]: Number(e.target.value) })}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            );
          })}
          <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
            <button className="btn btn-primary" onClick={() => grade()}>
              과목기준 자동 채점
            </button>
            <button className="btn btn-accent" onClick={() => grade(true)}>
              합격 처리
            </button>
            <button className="btn btn-danger" onClick={() => grade(false)}>
              불합격 처리
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
