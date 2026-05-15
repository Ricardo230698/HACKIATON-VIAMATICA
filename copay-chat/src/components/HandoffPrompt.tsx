interface HandoffPromptProps {
  onConnect: () => void;
  onDismiss: () => void;
}

export default function HandoffPrompt({ onConnect, onDismiss }: HandoffPromptProps) {
  return (
    <div className="my-4 animate-scale-in">
      <div
        style={{
          background: "#FFFFFF",
          borderRadius: "16px",
          border: "1px solid #E5E7EB",
          overflow: "hidden",
          boxShadow: "0 4px 16px rgba(0,0,0,0.08)",
        }}
      >
        {/* Accent line */}
        <div
          style={{
            height: "3px",
            background: "linear-gradient(90deg, #059669, #10B981, #34D399)",
          }}
        />

        <div style={{ padding: "20px" }}>
          <div className="flex items-center gap-3 mb-3">
            <div
              style={{
                width: "40px",
                height: "40px",
                borderRadius: "12px",
                background: "linear-gradient(135deg, #059669, #10B981)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: "18px",
                boxShadow: "0 4px 12px rgba(5,150,105,0.3)",
              }}
            >
              👤
            </div>
            <div>
              <h4 style={{ fontSize: "15px", fontWeight: 700, color: "#1F2937", margin: 0, fontFamily: "'DM Sans', Inter, sans-serif" }}>
                Need Human Assistance?
              </h4>
              <p style={{ fontSize: "12px", color: "#6B7280", margin: "2px 0 0 0" }}>
                A medical support specialist can help you directly.
              </p>
            </div>
          </div>

          <div className="flex gap-2 mt-4">
            <button
              onClick={onConnect}
              style={{
                flex: 1,
                padding: "10px 16px",
                borderRadius: "10px",
                background: "linear-gradient(135deg, #059669, #10B981)",
                color: "#FFFFFF",
                fontSize: "13px",
                fontWeight: 600,
                border: "none",
                cursor: "pointer",
                boxShadow: "0 2px 8px rgba(5,150,105,0.3)",
                transition: "transform 0.15s, box-shadow 0.15s",
              }}
              onMouseDown={(e) => {
                (e.currentTarget as HTMLButtonElement).style.transform = "scale(0.98)";
              }}
              onMouseUp={(e) => {
                (e.currentTarget as HTMLButtonElement).style.transform = "scale(1)";
              }}
            >
              Yes, connect me
            </button>
            <button
              onClick={onDismiss}
              style={{
                flex: 1,
                padding: "10px 16px",
                borderRadius: "10px",
                background: "#FFFFFF",
                color: "#374151",
                fontSize: "13px",
                fontWeight: 600,
                border: "1px solid #D1D5DB",
                cursor: "pointer",
                transition: "background 0.15s",
              }}
              onMouseEnter={(e) => {
                (e.currentTarget as HTMLButtonElement).style.background = "#F9FAFB";
              }}
              onMouseLeave={(e) => {
                (e.currentTarget as HTMLButtonElement).style.background = "#FFFFFF";
              }}
            >
              No, keep going
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
