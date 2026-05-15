interface HospitalResult {
  hospitalName: string;
  specialty: string;
  serviceName: string;
  baseCost: number;
  multiplier: number;
  finalPrice: number;
  coveragePercentage: number;
  estimatedCopay: number;
}

interface PolicyInfo {
  policyNumber: string;
  patientName: string;
  plan: string;
  coveragePercentage: number;
}

interface ResultPanelProps {
  policy: PolicyInfo;
  hospitals: HospitalResult[];
}

export default function ResultPanel({ policy, hospitals }: ResultPanelProps) {
  const planColors: Record<string, { bg: string; border: string; text: string; badge: string }> = {
    Gold: {
      bg: "linear-gradient(135deg, #92400E, #B45309)",
      border: "#D97706",
      text: "#FEF3C7",
      badge: "#FCD34D",
    },
    Silver: {
      bg: "linear-gradient(135deg, #374151, #4B5563)",
      border: "#6B7280",
      text: "#E5E7EB",
      badge: "#D1D5DB",
    },
    Basic: {
      bg: "linear-gradient(135deg, #1E3A5F, #1E40AF)",
      border: "#3B82F6",
      text: "#DBEAFE",
      badge: "#93C5FD",
    },
  };

  const colors = planColors[policy.plan] || planColors.Basic;
  const bestHospital = hospitals[0]; // Already sorted by lowest copay

  return (
    <div className="my-4 animate-scale-in">
      {/* ── Hero Card: Policy Info ── */}
      <div
        style={{
          background: colors.bg,
          borderRadius: "16px",
          padding: "20px",
          marginBottom: "12px",
          position: "relative",
          overflow: "hidden",
          border: `1px solid ${colors.border}`,
          boxShadow: "0 8px 32px rgba(0,0,0,0.2)",
        }}
      >
        {/* Decorative orbs */}
        <div
          style={{
            position: "absolute",
            top: "-30px",
            right: "-30px",
            width: "100px",
            height: "100px",
            borderRadius: "50%",
            background: "rgba(255,255,255,0.05)",
            filter: "blur(20px)",
          }}
        />
        <div
          style={{
            position: "absolute",
            bottom: "-20px",
            left: "-20px",
            width: "80px",
            height: "80px",
            borderRadius: "50%",
            background: "rgba(255,255,255,0.03)",
            filter: "blur(15px)",
          }}
        />

        <div style={{ position: "relative", zIndex: 1 }}>
          <div className="flex items-center justify-between mb-3">
            <div>
              <p style={{ fontSize: "11px", color: colors.badge, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.1em", margin: 0 }}>
                Insurance Plan
              </p>
              <h3 style={{ fontSize: "24px", fontWeight: 800, color: "#FFFFFF", margin: "4px 0 0 0", fontFamily: "'DM Sans', Inter, sans-serif" }}>
                Plan {policy.plan}
              </h3>
            </div>
            <div
              style={{
                background: "rgba(255,255,255,0.15)",
                borderRadius: "12px",
                padding: "8px 16px",
                textAlign: "center",
              }}
            >
              <p style={{ fontSize: "28px", fontWeight: 800, color: "#FFFFFF", margin: 0, lineHeight: 1 }}>
                {policy.coveragePercentage}%
              </p>
              <p style={{ fontSize: "10px", color: colors.text, margin: "2px 0 0 0", fontWeight: 500 }}>
                Coverage
              </p>
            </div>
          </div>

          <div className="flex gap-4" style={{ borderTop: "1px solid rgba(255,255,255,0.1)", paddingTop: "12px" }}>
            <div>
              <p style={{ fontSize: "10px", color: colors.text, margin: 0, fontWeight: 500 }}>Patient</p>
              <p style={{ fontSize: "14px", color: "#FFFFFF", margin: "2px 0 0 0", fontWeight: 600 }}>{policy.patientName}</p>
            </div>
            <div>
              <p style={{ fontSize: "10px", color: colors.text, margin: 0, fontWeight: 500 }}>Policy</p>
              <p style={{ fontSize: "14px", color: "#FFFFFF", margin: "2px 0 0 0", fontWeight: 600, fontFamily: "monospace" }}>{policy.policyNumber}</p>
            </div>
          </div>
        </div>
      </div>

      {/* ── Hospital Comparison Table ── */}
      <div
        style={{
          background: "#FFFFFF",
          borderRadius: "16px",
          border: "1px solid #E5E7EB",
          overflow: "hidden",
          boxShadow: "0 4px 16px rgba(0,0,0,0.08)",
        }}
      >
        <div
          style={{
            background: "linear-gradient(135deg, #F9FAFB, #F3F4F6)",
            padding: "14px 16px",
            borderBottom: "1px solid #E5E7EB",
          }}
        >
          <h4 style={{ fontSize: "14px", fontWeight: 700, color: "#1F2937", margin: 0, fontFamily: "'DM Sans', Inter, sans-serif" }}>
            🏥 Hospital Options
          </h4>
          <p style={{ fontSize: "11px", color: "#6B7280", margin: "2px 0 0 0" }}>
            {hospitals[0]?.specialty} — {hospitals[0]?.serviceName}
          </p>
        </div>

        <div style={{ padding: "4px 0" }}>
          {hospitals.map((h, i) => {
            const isBest = i === 0;
            return (
              <div
                key={h.hospitalName}
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  padding: "12px 16px",
                  borderBottom: i < hospitals.length - 1 ? "1px solid #F3F4F6" : "none",
                  background: isBest ? "rgba(16, 185, 129, 0.04)" : "transparent",
                  transition: "background 0.2s",
                }}
              >
                <div className="flex items-center gap-3">
                  <div
                    style={{
                      width: "36px",
                      height: "36px",
                      borderRadius: "10px",
                      background: isBest
                        ? "linear-gradient(135deg, #059669, #10B981)"
                        : "linear-gradient(135deg, #E5E7EB, #D1D5DB)",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      fontSize: "14px",
                      boxShadow: isBest ? "0 2px 8px rgba(5,150,105,0.3)" : "none",
                    }}
                  >
                    {isBest ? "⭐" : "🏥"}
                  </div>
                  <div>
                    <p style={{ fontSize: "13px", fontWeight: 600, color: "#1F2937", margin: 0 }}>
                      {h.hospitalName}
                      {isBest && (
                        <span
                          style={{
                            marginLeft: "8px",
                            fontSize: "10px",
                            fontWeight: 700,
                            color: "#059669",
                            background: "rgba(16, 185, 129, 0.1)",
                            padding: "2px 8px",
                            borderRadius: "10px",
                            textTransform: "uppercase",
                            letterSpacing: "0.05em",
                          }}
                        >
                          Best Price
                        </span>
                      )}
                    </p>
                    <p style={{ fontSize: "11px", color: "#9CA3AF", margin: "2px 0 0 0" }}>
                      Base: ${h.baseCost} × {h.multiplier} = ${h.finalPrice.toFixed(2)}
                    </p>
                  </div>
                </div>
                <div style={{ textAlign: "right" }}>
                  <p
                    style={{
                      fontSize: isBest ? "20px" : "16px",
                      fontWeight: 800,
                      color: isBest ? "#059669" : "#374151",
                      margin: 0,
                      fontFamily: "'DM Sans', Inter, sans-serif",
                    }}
                  >
                    ${h.estimatedCopay.toFixed(2)}
                  </p>
                  <p style={{ fontSize: "10px", color: "#9CA3AF", margin: "1px 0 0 0" }}>
                    estimated copay
                  </p>
                </div>
              </div>
            );
          })}
        </div>

        {/* Footer: explanation */}
        <div
          style={{
            background: "#F9FAFB",
            padding: "10px 16px",
            borderTop: "1px solid #E5E7EB",
          }}
        >
          <p style={{ fontSize: "10px", color: "#9CA3AF", margin: 0, lineHeight: 1.5 }}>
            💡 Copay = Final Price − (Final Price × Coverage %).
            {bestHospital && (
              <> Best option saves you <strong style={{ color: "#059669" }}>
                ${(hospitals[hospitals.length - 1].estimatedCopay - bestHospital.estimatedCopay).toFixed(2)}
              </strong> vs. the most expensive option.</>
            )}
          </p>
        </div>
      </div>
    </div>
  );
}
