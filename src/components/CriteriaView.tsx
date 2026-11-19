import type { CSSProperties, ReactNode } from "react";
import type { ExamCriteria, ExamCriteriaDetails, LegacyCriteriaBlock } from "@/lib/types";

function CriteriaTreeTable({
  block,
  kind,
}: {
  block: LegacyCriteriaBlock;
  kind: "written" | "practical";
}) {
  const rows: { subject: string; major: string; detail: string; item: string; questions?: string }[] =
    [];
  for (const subject of block.subjects || []) {
    const q = subject.questions != null ? String(subject.questions) : "";
    const majors = subject.majors?.length
      ? subject.majors
      : [{ name: "-", details: [{ name: "-", items: [{ text: "-" }] }] }];
    for (const major of majors) {
      const details = major.details?.length
        ? major.details
        : [{ name: "-", items: [{ text: "-" }] }];
      for (const detail of details) {
        const items = detail.items?.length ? detail.items : [{ text: "-" }];
        for (const item of items) {
          rows.push({
            subject: subject.name,
            major: major.name,
            detail: detail.name,
            item: item.text,
            questions: q,
          });
        }
      }
    }
  }

  return (
    <div style={{ display: "grid", gap: "0.75rem" }}>
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))",
          gap: "0.5rem",
          fontSize: "0.92rem",
        }}
      >
        {kind === "practical" && block.process && (
          <div>
            <strong>시험과정</strong>
            <p style={{ margin: "0.25rem 0 0", whiteSpace: "pre-wrap", lineHeight: 1.6 }}>
              {block.process}
            </p>
          </div>
        )}
        <div>
          <strong>검정방법</strong>
          <p style={{ margin: "0.25rem 0 0" }}>{block.method || "-"}</p>
        </div>
        <div>
          <strong>시험시간</strong>
          <p style={{ margin: "0.25rem 0 0" }}>{block.duration || "-"}</p>
        </div>
      </div>

      {rows.length > 0 && (
        <div style={{ overflowX: "auto" }}>
          <table
            style={{
              width: "100%",
              borderCollapse: "collapse",
              fontSize: "0.88rem",
              minWidth: 640,
            }}
          >
            <thead>
              <tr style={{ background: "rgba(11,44,74,0.06)" }}>
                <th style={th}>과목</th>
                <th style={th}>주요항목</th>
                <th style={th}>세부항목</th>
                <th style={th}>세부내용</th>
                {kind === "written" && <th style={th}>문항</th>}
              </tr>
            </thead>
            <tbody>
              {rows.map((r, i) => (
                <tr key={i}>
                  <td style={td}>{r.subject}</td>
                  <td style={td}>{r.major}</td>
                  <td style={td}>{r.detail}</td>
                  <td style={td}>{r.item}</td>
                  {kind === "written" && <td style={td}>{r.questions || "-"}</td>}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

const th: CSSProperties = {
  textAlign: "left",
  padding: "0.55rem 0.6rem",
  borderBottom: "1px solid var(--line)",
  whiteSpace: "nowrap",
};
const td: CSSProperties = {
  padding: "0.5rem 0.6rem",
  borderBottom: "1px solid var(--line)",
  verticalAlign: "top",
  lineHeight: 1.5,
};

function renderDetails(details?: ExamCriteriaDetails) {
  if (!details) return null;
  const blocks: ReactNode[] = [];

  if (details.legacyWritten?.subjects?.length) {
    blocks.push(
      <section key="lw">
        <h3 style={{ margin: "0 0 0.6rem", color: "var(--teal)" }}>필기</h3>
        <CriteriaTreeTable block={details.legacyWritten} kind="written" />
      </section>
    );
  } else if (details.written) {
    blocks.push(
      <section key="w">
        <h3 style={{ margin: "0 0 0.6rem", color: "var(--teal)" }}>필기</h3>
        <p style={{ margin: 0, lineHeight: 1.7 }}>
          검정방법: {details.written.examMethod}
          <br />
          문제수: {details.written.questionCount}
          <br />
          시험시간: {details.written.duration}
          <br />
          과목당 문제수: {details.written.questionsPerSubject}
        </p>
      </section>
    );
  }

  if (details.legacyPractical?.subjects?.length || details.legacyPractical?.process) {
    blocks.push(
      <section key="lp">
        <h3 style={{ margin: "0 0 0.6rem", color: "var(--teal)" }}>실기</h3>
        <CriteriaTreeTable block={details.legacyPractical!} kind="practical" />
      </section>
    );
  } else if (details.practical) {
    blocks.push(
      <section key="p">
        <h3 style={{ margin: "0 0 0.6rem", color: "var(--teal)" }}>실기</h3>
        <p style={{ margin: "0 0 0.75rem", lineHeight: 1.7 }}>
          시험과정: {details.practical.process}
          <br />
          검정방법: {details.practical.examMethod}
          <br />
          시험시간: {details.practical.duration}
        </p>
        {details.practical.tableRows && details.practical.tableRows.length > 0 && (
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.88rem" }}>
              <tbody>
                {details.practical.tableRows.map((row, i) => (
                  <tr key={i}>
                    {row.map((cell, j) => (
                      <td key={j} style={td}>
                        {cell}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    );
  }

  return blocks.length ? <div style={{ display: "grid", gap: "1.25rem" }}>{blocks}</div> : null;
}

export function CriteriaView({ item }: { item: ExamCriteria }) {
  const structured = renderDetails(item.details);
  if (structured) return <>{structured}</>;

  // Legacy JSON dumped into content
  if (item.content.trim().startsWith("{")) {
    try {
      const parsed = JSON.parse(item.content) as {
        written?: LegacyCriteriaBlock;
        practical?: LegacyCriteriaBlock;
      };
      return (
        <div style={{ display: "grid", gap: "1.25rem" }}>
          {parsed.written && (
            <section>
              <h3 style={{ margin: "0 0 0.6rem", color: "var(--teal)" }}>필기</h3>
              <CriteriaTreeTable block={parsed.written} kind="written" />
            </section>
          )}
          {parsed.practical && (
            <section>
              <h3 style={{ margin: "0 0 0.6rem", color: "var(--teal)" }}>실기</h3>
              <CriteriaTreeTable block={parsed.practical} kind="practical" />
            </section>
          )}
        </div>
      );
    } catch {
      // fall through
    }
  }

  return (
    <pre style={{ whiteSpace: "pre-wrap", fontFamily: "inherit", margin: 0, lineHeight: 1.7 }}>
      {item.content}
    </pre>
  );
}
