import CopayChat from "@/components/CopayChat";

export default function ChatPage() {
  return (
    <div
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        background: "#111827",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        padding: "20px 16px",
        overflow: "hidden",
      }}
    >
      {/* Decorative gradient orbs */}
      <div
        style={{
          position: "absolute",
          top: "-100px",
          right: "-100px",
          width: "400px",
          height: "400px",
          borderRadius: "50%",
          background: "radial-gradient(circle, rgba(16,185,129,0.15) 0%, transparent 70%)",
          filter: "blur(60px)",
          pointerEvents: "none",
        }}
      />
      <div
        style={{
          position: "absolute",
          bottom: "-80px",
          left: "-80px",
          width: "350px",
          height: "350px",
          borderRadius: "50%",
          background: "radial-gradient(circle, rgba(59,130,246,0.1) 0%, transparent 70%)",
          filter: "blur(50px)",
          pointerEvents: "none",
        }}
      />

      {/* Chat card */}
      <div
        style={{
          width: "100%",
          maxWidth: "480px",
          flex: 1,
          maxHeight: "820px",
          margin: "auto 0",
          background: "#FFFFFF",
          borderRadius: "20px",
          overflow: "hidden",
          display: "flex",
          flexDirection: "column",
          boxShadow: "0 25px 60px rgba(0,0,0,0.4), 0 0 0 1px rgba(255,255,255,0.05)",
          position: "relative",
          zIndex: 1,
        }}
      >
        {/* Top accent line */}
        <div className="lu-accent-line" style={{ height: "3px", flexShrink: 0 }} />

        <CopayChat />
      </div>
    </div>
  );
}
