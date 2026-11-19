"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { AdminNav } from "@/components/AdminNav";
import { SearchSelect } from "@/components/SearchSelect";
import type { Certification, Question, QuestionType } from "@/lib/types";

type QDraft = {
  type: QuestionType;
  subject: string;
  prompt: string;
  options: string[];
  answer: string;
  points: number;
};

type TypeSetup = { type: QuestionType; count: number };

type SubjectBlock = {
  subject: string;
  setups: TypeSetup[];
  questions: QDraft[];
};

const TYPE_LABEL: Record<QuestionType, string> = {
  multiple: "4지선다",
  short: "주관식",
  mixed: "복합(4지선다+주관식)",
  file: "파일 제출형",
};

function emptyQuestion(type: QuestionType, subject: string, points: number): QDraft {
  return {
    type,
    subject,
    prompt: "",
    options: type === "multiple" || type === "mixed" ? ["", "", "", ""] : [],
    answer: type === "multiple" ? "0" : "",
    points,
  };
}

function redistribute(questions: QDraft[]): QDraft[] {
  if (questions.length === 0) return questions;
  const base = Math.floor(100 / questions.length);
  let remain = 100 - base * questions.length;
  return questions.map((q, i) => ({
    ...q,
    points: base + (i < remain ? 1 : 0),
  }));
}

export default function AdminExamsPage() {
  const router = useRouter();
  const [certs, setCerts] = useState<Certification[]>([]);
  const [exams, setExams] = useState<{ id: string; title: string; certificationName?: string; antiCheat: boolean }[]>([]);
  const [form, setForm] = useState({
    certificationId: "",
    title: "",
    startAt: "",
    endAt: "",
    durationMinutes: 60,
    antiCheat: false,
  });
  const [subjects, setSubjects] = useState<SubjectBlock[]>([]);

  const certOptions = useMemo(
    () =>
      certs.map((c) => ({
        value: c.id,
        label: `${c.name} (${c.organization})`,
        keywords: c.subjects.join(" "),
      })),
    [certs]
  );

  async function load() {
    const me = await fetch("/api/auth/me").then((r) => r.json());
    if (!me.user || me.user.role !== "admin") {
      router.push("/login");
      return;
    }
    const [c, e] = await Promise.all([fetch("/api/certs"), fetch("/api/exams")]);
    setCerts((await c.json()).certifications || []);
    setExams((await e.json()).exams || []);
  }

  useEffect(() => {
    load();
  }, [router]);

  function selectCert(id: string) {
    const cert = certs.find((c) => c.id === id);
    setForm((f) => ({
      ...f,
      certificationId: id,
      title: cert ? `${cert.name} 시험` : f.title,
    }));
    const list = cert?.subjects?.length ? cert.subjects : ["공통"];
    setSubjects(
      list.map((subject) => ({
        subject,
        setups: [{ type: "multiple", count: 10 }],
        questions: [],
      }))
    );
  }

  function updateSetup(si: number, setupIdx: number, patch: Partial<TypeSetup>) {
    setSubjects((prev) => {
      const next = [...prev];
      const setups = [...next[si].setups];
      setups[setupIdx] = { ...setups[setupIdx], ...patch };
      next[si] = { ...next[si], setups };
      return next;
    });
  }

  function generateSubjectQuestions(si: number) {
    setSubjects((prev) => {
      const next = [...prev];
      const block = next[si];
      const drafts: QDraft[] = [];
      for (const setup of block.setups) {
        const count = Math.max(0, Number(setup.count) || 0);
        for (let i = 0; i < count; i++) {
          drafts.push(emptyQuestion(setup.type, block.subject, 0));
        }
      }
      if (drafts.length === 0) {
        alert("문항 수를 1 이상 입력하세요.");
        return prev;
      }
      next[si] = { ...block, questions: redistribute(drafts) };
      return next;
    });
  }

  function updateQuestion(si: number, qi: number, patch: Partial<QDraft>) {
    setSubjects((prev) => {
      const next = [...prev];
      const questions = [...next[si].questions];
      questions[qi] = { ...questions[qi], ...patch };
      next[si] = { ...next[si], questions };
      return next;
    });
  }

  function updateOption(si: number, qi: number, oi: number, value: string) {
    setSubjects((prev) => {
      const next = [...prev];
      const questions = [...next[si].questions];
      const options = [...(questions[qi].options || ["", "", "", ""])];
      options[oi] = value;
      questions[qi] = { ...questions[qi], options };
      next[si] = { ...next[si], questions };
      return next;
    });
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.certificationId) {
      alert("종목을 선택하세요.");
      return;
    }
    for (const block of subjects) {
      if (block.questions.length === 0) {
        alert(`「${block.subject}」과목 문항을 생성·입력하세요.`);
        return;
      }
      const sum = block.questions.reduce((s, q) => s + q.points, 0);
      if (sum !== 100) {
        alert(`「${block.subject}」과목 배점 합계는 100점이어야 합니다. (현재 ${sum}점)`);
        return;
      }
      for (const q of block.questions) {
        if (!q.prompt.trim()) {
          alert(`「${block.subject}」과목에 미입력 문제가 있습니다.`);
          return;
        }
      }
    }

    const qs: Question[] = subjects.flatMap((block) =>
      block.questions.map((q) => ({
        id: crypto.randomUUID(),
        type: q.type,
        subject: block.subject,
        prompt: q.prompt,
        options:
          q.type === "multiple" || q.type === "mixed"
            ? (q.options.length ? q.options : ["", "", "", ""])
            : undefined,
        answer: q.answer,
        points: q.points,
      }))
    );

    const res = await fetch("/api/exams", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...form, questions: qs }),
    });
    if (!res.ok) {
      const data = await res.json();
      alert(data.error || "배포 실패");
      return;
    }
    setForm({
      certificationId: "",
      title: "",
      startAt: "",
      endAt: "",
      durationMinutes: 60,
      antiCheat: false,
    });
    setSubjects([]);
    load();
    alert("시험이 배포되었습니다.");
  }

  return (
    <div className="container">
      <h1 className="page-title">시험 제작</h1>
      <p className="page-desc">
        종목을 선택하면 등록된 시험과목이 모두 표시됩니다. 과목마다 문제유형·문항 수를 넣고 「기본 문항 생성」한 뒤
        문제·보기를 작성하세요. (과목당 100점)
      </p>
      <AdminNav />

      <form className="card-panel" onSubmit={onSubmit} style={{ marginBottom: "1rem" }}>
        <div className="field">
          <label>종목 (검색·선택)</label>
          <SearchSelect
            options={certOptions}
            value={form.certificationId}
            onChange={(v) => selectCert(v)}
            placeholder="자격 종목 검색"
            required
          />
        </div>
        <div className="field">
          <label>시험 제목</label>
          <input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} required />
        </div>
        <div className="field">
          <label>응시 시작</label>
          <input
            type="datetime-local"
            value={form.startAt}
            onChange={(e) => setForm({ ...form, startAt: e.target.value })}
            required
          />
        </div>
        <div className="field">
          <label>응시 종료</label>
          <input
            type="datetime-local"
            value={form.endAt}
            onChange={(e) => setForm({ ...form, endAt: e.target.value })}
            required
          />
        </div>
        <div className="field">
          <label>시험 시간(분)</label>
          <input
            type="number"
            min={1}
            value={form.durationMinutes}
            onChange={(e) => setForm({ ...form, durationMinutes: Number(e.target.value) })}
          />
        </div>
        <label style={{ display: "flex", gap: "0.5rem", alignItems: "center", marginBottom: "1.25rem" }}>
          <input
            type="checkbox"
            checked={form.antiCheat}
            onChange={(e) => setForm({ ...form, antiCheat: e.target.checked })}
          />
          부정행위 감시 활성화 (10초 미사용/창 전환 5회 시 강제 종료·불합격, 주의 알림 상시 표시)
        </label>

        {subjects.map((block, si) => (
          <section
            key={block.subject}
            style={{
              border: "1px solid var(--line)",
              borderRadius: "0.85rem",
              padding: "1rem",
              marginBottom: "1rem",
              background: "rgba(246,249,252,0.7)",
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", gap: "1rem", flexWrap: "wrap" }}>
              <h3 style={{ margin: 0, color: "var(--navy)" }}>
                과목: {block.subject}{" "}
                <span style={{ fontSize: "0.85rem", color: "var(--muted)", fontWeight: 600 }}>
                  (만점 100점
                  {block.questions.length > 0
                    ? ` · 현재 ${block.questions.reduce((s, q) => s + q.points, 0)}점 / ${block.questions.length}문항`
                    : ""}
                  )
                </span>
              </h3>
            </div>

            <p style={{ margin: "0.75rem 0 0.5rem", fontSize: "0.9rem", color: "var(--muted)" }}>
              문제유형과 문항 수를 정한 뒤 「기본 문항 생성」을 누르세요.
            </p>

            {block.setups.map((setup, setupIdx) => (
              <div
                key={setupIdx}
                style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap", alignItems: "end", marginBottom: "0.5rem" }}
              >
                <div className="field" style={{ marginBottom: 0, minWidth: 200 }}>
                  <label>문제유형</label>
                  <select
                    value={setup.type}
                    onChange={(e) => updateSetup(si, setupIdx, { type: e.target.value as QuestionType })}
                  >
                    {(Object.keys(TYPE_LABEL) as QuestionType[]).map((t) => (
                      <option key={t} value={t}>
                        {TYPE_LABEL[t]}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="field" style={{ marginBottom: 0, width: 120 }}>
                  <label>문항 수</label>
                  <input
                    type="number"
                    min={0}
                    value={setup.count}
                    onChange={(e) => updateSetup(si, setupIdx, { count: Number(e.target.value) })}
                  />
                </div>
                {block.setups.length > 1 && (
                  <button
                    type="button"
                    className="btn btn-ghost"
                    onClick={() =>
                      setSubjects((prev) => {
                        const next = [...prev];
                        next[si] = {
                          ...next[si],
                          setups: next[si].setups.filter((_, i) => i !== setupIdx),
                        };
                        return next;
                      })
                    }
                  >
                    삭제
                  </button>
                )}
              </div>
            ))}

            <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap", margin: "0.5rem 0 1rem" }}>
              <button
                type="button"
                className="btn btn-ghost"
                onClick={() =>
                  setSubjects((prev) => {
                    const next = [...prev];
                    next[si] = {
                      ...next[si],
                      setups: [...next[si].setups, { type: "short", count: 5 }],
                    };
                    return next;
                  })
                }
              >
                유형 행 추가
              </button>
              <button type="button" className="btn btn-accent" onClick={() => generateSubjectQuestions(si)}>
                기본 문항 생성 (배점 자동 분배)
              </button>
            </div>

            {block.questions.map((q, qi) => (
              <div
                key={qi}
                style={{
                  borderTop: "1px solid var(--line)",
                  paddingTop: "0.85rem",
                  marginBottom: "0.85rem",
                }}
              >
                <strong style={{ color: "var(--teal)" }}>
                  {qi + 1}. [{TYPE_LABEL[q.type]}] · {q.points}점
                </strong>
                <div className="field">
                  <label>문제</label>
                  <textarea
                    value={q.prompt}
                    onChange={(e) => updateQuestion(si, qi, { prompt: e.target.value })}
                    placeholder="문제 내용을 입력하세요"
                    required
                  />
                </div>
                {(q.type === "multiple" || q.type === "mixed") && (
                  <div style={{ display: "grid", gap: "0.4rem", marginBottom: "0.75rem" }}>
                    <label style={{ fontSize: "0.9rem", fontWeight: 600, color: "var(--muted)" }}>보기</label>
                    {(q.options.length ? q.options : ["", "", "", ""]).map((opt, oi) => (
                      <input
                        key={oi}
                        value={opt}
                        placeholder={`${oi + 1}번 보기`}
                        onChange={(e) => updateOption(si, qi, oi, e.target.value)}
                        style={{
                          border: "1px solid var(--line)",
                          borderRadius: "0.55rem",
                          padding: "0.6rem 0.75rem",
                        }}
                      />
                    ))}
                  </div>
                )}
                {q.type !== "file" && (
                  <div className="field">
                    <label>
                      정답 {q.type === "multiple" || q.type === "mixed" ? "(보기 번호 1~4 또는 인덱스 0~3)" : ""}
                    </label>
                    <input
                      value={q.answer}
                      onChange={(e) => updateQuestion(si, qi, { answer: e.target.value })}
                      placeholder={q.type === "multiple" ? "예: 1" : "모범 답안"}
                    />
                  </div>
                )}
              </div>
            ))}
          </section>
        ))}

        {subjects.length === 0 && (
          <p style={{ color: "var(--muted)" }}>종목을 선택하면 과목별 출제 영역이 표시됩니다.</p>
        )}

        <button className="btn btn-primary" type="submit">
          시험 배포
        </button>
      </form>

      <div className="card-panel">
        <h2 style={{ marginTop: 0 }}>배포된 시험</h2>
        <ul>
          {exams.map((ex) => (
            <li key={ex.id}>
              {ex.title} — {ex.certificationName} {ex.antiCheat ? "(부정행위 감시)" : ""}
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
