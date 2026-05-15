import ResultPanel from "./ResultPanel";

export interface CopayResult {
  policy: {
    policyNumber: string;
    patientName: string;
    plan: string;
    coveragePercentage: number;
  };
  hospitals: Array<{
    hospitalName: string;
    specialty: string;
    serviceName: string;
    baseCost: number;
    multiplier: number;
    finalPrice: number;
    coveragePercentage: number;
    estimatedCopay: number;
  }>;
}

export interface Message {
  role: "user" | "assistant" | "system";
  content: string;
  systemType?: "info" | "success" | "error";
  copayResults?: CopayResult;
}

interface MessageBubbleProps {
  msg: Message;
}

function renderMarkdown(text: string) {
  const parts: (string | JSX.Element)[] = [];
  // Split by bold, italic, and inline code patterns
  const regex = /(\*\*[^*]+\*\*|\*[^*]+\*|`[^`]+`)/g;
  let lastIndex = 0;
  let match;
  let key = 0;

  while ((match = regex.exec(text)) !== null) {
    // Add text before match
    if (match.index > lastIndex) {
      parts.push(text.slice(lastIndex, match.index));
    }

    const raw = match[0];
    if (raw.startsWith("**") && raw.endsWith("**")) {
      parts.push(
        <strong key={key++} style={{ fontWeight: 700 }}>
          {raw.slice(2, -2)}
        </strong>
      );
    } else if (raw.startsWith("*") && raw.endsWith("*")) {
      parts.push(<em key={key++}>{raw.slice(1, -1)}</em>);
    } else if (raw.startsWith("`") && raw.endsWith("`")) {
      parts.push(
        <code
          key={key++}
          style={{
            background: "rgba(16, 185, 129, 0.1)",
            color: "#059669",
            padding: "1px 5px",
            borderRadius: "4px",
            fontSize: "0.9em",
            fontFamily: "monospace",
          }}
        >
          {raw.slice(1, -1)}
        </code>
      );
    }
    lastIndex = match.index + raw.length;
  }

  if (lastIndex < text.length) {
    parts.push(text.slice(lastIndex));
  }

  return parts.length > 0 ? parts : [text];
}

export default function MessageBubble({ msg }: MessageBubbleProps) {
  // ── System messages ──────────────────────────────────────────────────────
  if (msg.role === "system") {
    const bgMap: Record<string, string> = {
      info: "linear-gradient(135deg, #1E3A5F, #1E3A5F)",
      success: "linear-gradient(135deg, #065F46, #047857)",
      error: "linear-gradient(135deg, #7F1D1D, #991B1B)",
    };
    return (
      <div className="flex justify-center my-2 lu-system-msg">
        <div
          style={{
            background: bgMap[msg.systemType || "info"],
            color: "#FFFFFF",
            padding: "6px 16px",
            borderRadius: "20px",
            fontSize: "12px",
            fontWeight: 500,
            maxWidth: "85%",
            textAlign: "center",
            boxShadow: "0 2px 8px rgba(0,0,0,0.15)",
          }}
        >
          {msg.content}
        </div>
      </div>
    );
  }

  // ── User messages ────────────────────────────────────────────────────────
  if (msg.role === "user") {
    return (
      <div className="flex justify-end mb-3">
        <div
          style={{
            background: "linear-gradient(135deg, #1A1A1A, #2D2D2D)",
            color: "#FFFFFF",
            padding: "10px 16px",
            borderRadius: "18px 18px 6px 18px",
            maxWidth: "80%",
            fontSize: "14px",
            lineHeight: "1.5",
            boxShadow: "0 2px 8px rgba(0,0,0,0.12)",
          }}
        >
          {msg.content}
        </div>
      </div>
    );
  }

  // ── Assistant messages ───────────────────────────────────────────────────
  return (
    <div className="flex flex-col gap-2 mb-3">
      <div className="flex items-end gap-2.5">
        <div
          className="flex-shrink-0"
          style={{
            width: "32px",
            height: "32px",
            borderRadius: "12px",
            background: "linear-gradient(135deg, #059669, #10B981)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            boxShadow: "0 2px 6px rgba(5,150,105,0.3)",
          }}
        >
          <span
            style={{
              color: "#FFFFFF",
              fontSize: "14px",
              lineHeight: 1,
            }}
          >
            🏥
          </span>
        </div>
        <div
          style={{
            background: "#FFFFFF",
            border: "1px solid #E5E7EB",
            padding: "10px 16px",
            borderRadius: "18px 18px 18px 6px",
            maxWidth: "80%",
            fontSize: "14px",
            lineHeight: "1.6",
            color: "#1F2937",
            boxShadow: "0 2px 8px rgba(0,0,0,0.06)",
          }}
        >
          {msg.content.split("\n").map((line, i) => (
            <span key={i}>
              {i > 0 && <br />}
              {renderMarkdown(line)}
            </span>
          ))}
        </div>
      </div>
      {msg.copayResults && (
        <div className="ml-[42px]">
          <ResultPanel
            policy={msg.copayResults.policy}
            hospitals={msg.copayResults.hospitals}
          />
        </div>
      )}
    </div>
  );
}
