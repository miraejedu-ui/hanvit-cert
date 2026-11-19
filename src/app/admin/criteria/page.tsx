"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { AdminNav } from "@/components/AdminNav";
import { SearchSelect } from "@/components/SearchSelect";
import { PresetOrCustom } from "@/components/PresetOrCustom";
import type {
  Certification,
  ExamCriteria,
  ExamCriteriaDetails,
  ExamCriteriaPracticalDetails,
  ExamCriteriaWrittenDetails,
} from "@/lib/types";

const QUESTION_COUNT_PRESETS = [
  { value: "60", label: "60" },
  { value: "80", label: "80" },
  { value: "100", label: "100" },
  { value: "120", label: "120" },
];

const DURATION_PRESETS = [
  { value: "1시간", label: "1시간" },
  { value: "1시간 30분", label: "1시간 30분" },
  { value: "2시간", label: "2시간" },
  { value: "2시간 30분", label: "2시간 30분" },
  { value: "3시간", label: "3시간" },
];

const PROCESS_PRESETS = [
  { value: "필답형", label: "필답형" },
  { value: "작업형", label: "작업형" },
];

const PRACTICAL_METHOD_PRESETS = [
  { value: "필답형", label: "필답형" },
  { value: "작업형", label: "작업형" },
  { value: "복합형", label: "복합형" },
];

const defaultWritten: ExamCriteriaWrittenDetails = {
  examMethod: "객관식",
  questionCount: "60",
  duration: "1시간",
  questionsPerSubject: 20,
};

const defaultPractical: ExamCriteriaPracticalDetails = {
  process: "필답형",
  examMethod: "필답형",
  duration: "1시간",
  pasteRaw: "",
  tableRows: [],
};

function parseTablePaste(raw: string): string[][] {
  const lines = raw
    .replace(/\r\n/g, "\n")
    .replace(/\r/g, "\n")
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean);
  return lines.map((line) => {
    if (line.includes("\t")) return line.split("\t").map((c) => c.trim());
    if (line.includes(",")) {
      // simple CSV split (no quoted-field edge cases needed for paste preview)
      return line.split(",").map((c) => c.trim());
    }
    return [line];
  });
}

function buildContentSummary(
  kind: "written" | "practical",
  written: ExamCriteriaWrittenDetails,
  practical: ExamCriteriaPracticalDetails
): string {
  if (kind === "written") {
    return [
      "[필기]",
      `검정방법: ${written.examMethod || "객관식"}`,
      `문제수: ${written.questionCount}`,
      `시험시간: ${written.duration}`,
      `과목당 문제수: ${written.questionsPerSubject}`,
    ].join("\n");
  }

  const lines = [
    "[실기]",
    `시험과정: ${practical.process}`,
    `검정방법: ${practical.examMethod}`,
    `시험시간: ${practical.duration}`,
  ];
  if (practical.tableRows && practical.tableRows.length > 0) {
    lines.push("", "표:");
    for (const row of practical.tableRows) {
      lines.push(row.join("\t"));
    }
  } else if (practical.pasteRaw?.trim()) {
    lines.push("", practical.pasteRaw.trim());
  }
  return lines.join("\n");
}

type ListItem = ExamCriteria & { certificationName?: string };

export default function AdminCriteriaPage() {
  const router = useRouter();
  const [certs, setCerts] = useState<Certification[]>([]);
  const [list, setList] = useState<ListItem[]>([]);
  const [certificationId, setCertificationId] = useState("");
  const [title, setTitle] = useState("");
  const [kind, setKind] = useState<"written" | "practical">("written");
  const [written, setWritten] = useState<ExamCriteriaWrittenDetails>(defaultWritten);
  const [practical, setPractical] = useState<ExamCriteriaPracticalDetails>(defaultPractical);
  const [legacyContent, setLegacyContent] = useState("");
  const [showLegacy, setShowLegacy] = useState(false);
  const [file, setFile] = useState<File | null>(null);

  const certOptions = useMemo(
    () => certs.map((c) => ({ value: c.id, label: c.name, keywords: c.organization })),
    [certs]
  );

  const selectedCertName = certs.find((c) => c.id === certificationId)?.name || "";

  async function load() {
    const me = await fetch("/api/auth/me").then((r) => r.json());
    if (!me.user || me.user.role !== "admin") {
      router.push("/login");
      return;
    }
    const [c, cr] = await Promise.all([fetch("/api/certs"), fetch("/api/criteria")]);
    setCerts((await c.json()).certifications || []);
    setList((await cr.json()).criteria || []);
  }

  useEffect(() => {
    load();
  }, [router]);

  useEffect(() => {
    if (!title && selectedCertName) {
      setTitle(`${selectedCertName} 출제기준`);
    }
  }, [selectedCertName]); // eslint-disable-line react-hooks/exhaustive-deps

  function onPasteChange(raw: string) {
    const tableRows = parseTablePaste(raw);
    setPractical((p) => ({ ...p, pasteRaw: raw, tableRows }));
  }

  function resetForm() {
    setCertificationId("");
    setTitle("");
    setKind("written");
    setWritten(defaultWritten);
    setPractical(defaultPractical);
    setLegacyContent("");
    setShowLegacy(false);
    setFile(null);
  }

  function loadItem(item: ListItem) {
    setCertificationId(item.certificationId);
    setTitle(item.title);
    setFile(null);
    const details = item.details;
    if (details?.kind === "practical" || details?.practical) {
      setKind("practical");
      setPractical({
        ...defaultPractical,
        ...details.practical,
        pasteRaw: details.practical?.pasteRaw || "",
        tableRows: details.practical?.tableRows || [],
      });
      setWritten(defaultWritten);
      setShowLegacy(false);
      setLegacyContent("");
    } else if (details?.kind === "written" || details?.written) {
      setKind("written");
      setWritten({
        ...defaultWritten,
        ...details.written,
        examMethod: "객관식",
        questionCount: String(details.written?.questionCount ?? defaultWritten.questionCount),
      });
      setPractical(defaultPractical);
      setShowLegacy(false);
      setLegacyContent("");
    } else {
      // legacy row without structured details
      setKind("written");
      setWritten(defaultWritten);
      setPractical(defaultPractical);
      setLegacyContent(item.content || "");
      setShowLegacy(true);
    }
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!certificationId) {
      alert("종목을 선택하세요.");
      return;
    }

    const details: ExamCriteriaDetails =
      kind === "written"
        ? {
            kind: "written",
            written: {
              ...written,
              examMethod: "객관식",
              questionCount:
                typeof written.questionCount === "string" && /^\d+$/.test(String(written.questionCount))
                  ? Number(written.questionCount)
                  : written.questionCount,
              questionsPerSubject: Number(written.questionsPerSubject) || 20,
            },
          }
        : {
            kind: "practical",
            practical: {
              ...practical,
              tableRows: practical.tableRows?.length
                ? practical.tableRows
                : parseTablePaste(practical.pasteRaw || ""),
            },
          };

    let content = buildContentSummary(kind, written, practical);
    if (showLegacy && legacyContent.trim()) {
      content = `${content}\n\n[기존 내용]\n${legacyContent.trim()}`;
    }

    const defaultTitle = selectedCertName ? `${selectedCertName} 출제기준` : "출제기준";
    const fd = new FormData();
    fd.append("certificationId", certificationId);
    fd.append("title", title.trim() || defaultTitle);
    fd.append("content", content);
    fd.append("details", JSON.stringify(details));
    if (file) fd.append("file", file);

    await fetch("/api/criteria", { method: "POST", body: fd });
    resetForm();
    load();
  }

  return (
    <div className="container">
      <h1 className="page-title">출제영역 · 출제기준</h1>
      <p className="page-desc">필기/실기 구조화 폼으로 등록합니다. 기존 텍스트 데이터도 그대로 조회·호환됩니다.</p>
      <AdminNav />

      <form className="card-panel" onSubmit={onSubmit} style={{ marginBottom: "1rem" }}>
        <div className="field">
          <label>자격 종목 (검색·선택)</label>
          <SearchSelect
            options={certOptions}
            value={certificationId}
            onChange={(v) => {
              setCertificationId(v);
              const name = certs.find((c) => c.id === v)?.name;
              if (name && (!title || title.endsWith(" 출제기준"))) {
                setTitle(`${name} 출제기준`);
              }
            }}
            placeholder="종목 검색"
            required
          />
        </div>

        <div className="field">
          <label>제목</label>
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder={selectedCertName ? `${selectedCertName} 출제기준` : "출제기준"}
          />
        </div>

        <div className="field">
          <label>구분</label>
          <div style={{ display: "flex", gap: "0.75rem" }}>
            <label style={{ display: "flex", alignItems: "center", gap: "0.35rem" }}>
              <input
                type="radio"
                name="kind"
                checked={kind === "written"}
                onChange={() => setKind("written")}
              />
              필기
            </label>
            <label style={{ display: "flex", alignItems: "center", gap: "0.35rem" }}>
              <input
                type="radio"
                name="kind"
                checked={kind === "practical"}
                onChange={() => setKind("practical")}
              />
              실기
            </label>
          </div>
        </div>

        {kind === "written" && (
          <>
            <div className="field">
              <label>검정방법</label>
              <PresetOrCustom
                options={[{ value: "객관식", label: "객관식" }]}
                value="객관식"
                onChange={() => setWritten((w) => ({ ...w, examMethod: "객관식" }))}
                fixed
              />
            </div>
            <div className="field">
              <label>문제수</label>
              <PresetOrCustom
                options={QUESTION_COUNT_PRESETS}
                value={String(written.questionCount)}
                onChange={(v) => setWritten((w) => ({ ...w, questionCount: v }))}
                inputType="number"
                customPlaceholder="문제수 직접 입력"
                required
              />
            </div>
            <div className="field">
              <label>시험시간</label>
              <PresetOrCustom
                options={DURATION_PRESETS}
                value={written.duration}
                onChange={(v) => setWritten((w) => ({ ...w, duration: v }))}
                customPlaceholder="시험시간 직접 입력"
                required
              />
            </div>
            <div className="field">
              <label>과목당 문제수</label>
              <input
                type="number"
                min={1}
                value={written.questionsPerSubject}
                onChange={(e) =>
                  setWritten((w) => ({ ...w, questionsPerSubject: Number(e.target.value) || 20 }))
                }
                required
              />
            </div>
          </>
        )}

        {kind === "practical" && (
          <>
            <div className="field">
              <label>시험과정</label>
              <PresetOrCustom
                options={PROCESS_PRESETS}
                value={practical.process}
                onChange={(v) => setPractical((p) => ({ ...p, process: v }))}
                customPlaceholder="시험과정 직접 입력"
                required
              />
            </div>
            <div className="field">
              <label>검정방법</label>
              <PresetOrCustom
                options={PRACTICAL_METHOD_PRESETS}
                value={practical.examMethod}
                onChange={(v) => setPractical((p) => ({ ...p, examMethod: v }))}
                customPlaceholder="검정방법 직접 입력"
                required
              />
            </div>
            <div className="field">
              <label>시험시간</label>
              <PresetOrCustom
                options={DURATION_PRESETS}
                value={practical.duration}
                onChange={(v) => setPractical((p) => ({ ...p, duration: v }))}
                customPlaceholder="시험시간 직접 입력"
                required
              />
            </div>
            <div className="field">
              <label>표 붙여넣기 (TSV / CSV / 줄단위)</label>
              <textarea
                value={practical.pasteRaw || ""}
                onChange={(e) => onPasteChange(e.target.value)}
                rows={8}
                placeholder={"엑셀에서 복사한 표를 붙여넣으세요.\n예: 과목\t문항수\t배점"}
              />
            </div>
            {(practical.tableRows?.length || 0) > 0 && (
              <div className="field">
                <label>표 미리보기</label>
                <div style={{ overflowX: "auto" }}>
                  <table className="table">
                    <tbody>
                      {practical.tableRows!.map((row, i) => (
                        <tr key={i}>
                          {row.map((cell, j) => (
                            <td key={j}>{cell}</td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </>
        )}

        {showLegacy && (
          <div className="field">
            <label>기존 내용 (레거시 — details 없음)</label>
            <textarea
              value={legacyContent}
              onChange={(e) => setLegacyContent(e.target.value)}
              rows={6}
            />
          </div>
        )}

        <div className="field">
          <label>파일 (선택)</label>
          <input type="file" onChange={(e) => setFile(e.target.files?.[0] || null)} />
        </div>

        <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
          <button className="btn btn-primary" type="submit">
            등록
          </button>
          <button className="btn" type="button" onClick={resetForm}>
            초기화
          </button>
        </div>
      </form>

      <div className="card-panel">
        <ul>
          {list.map((c) => (
            <li key={c.id} style={{ marginBottom: "0.5rem" }}>
              <button
                type="button"
                onClick={() => loadItem(c)}
                style={{
                  border: 0,
                  background: "transparent",
                  padding: 0,
                  cursor: "pointer",
                  textAlign: "left",
                  color: "inherit",
                  font: "inherit",
                }}
              >
                {c.title} — {c.certificationName}
                {!c.details?.kind && !c.details?.written && !c.details?.practical ? (
                  <span style={{ color: "var(--muted)", marginLeft: "0.5rem", fontSize: "0.85rem" }}>
                    (레거시)
                  </span>
                ) : (
                  <span style={{ color: "var(--muted)", marginLeft: "0.5rem", fontSize: "0.85rem" }}>
                    ({c.details?.kind === "practical" ? "실기" : "필기"})
                  </span>
                )}
              </button>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
