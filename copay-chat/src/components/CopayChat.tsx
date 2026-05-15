"use client";
import { useState, useEffect, useRef } from "react";
import MessageBubble, { type Message, type CopayResult } from "./MessageBubble";
import TypingIndicator from "./TypingIndicator";
import HandoffPrompt from "./HandoffPrompt";
import ResultPanel from "./ResultPanel";

type ApiHistory = { role: "user" | "assistant"; content: string };

export default function CopayChat() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [apiHistory, setApiHistory] = useState<ApiHistory[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [showHandoff, setShowHandoff] = useState(false);

  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const started = useRef(false);

  useEffect(() => {
    if (!started.current) {
      started.current = true;
      initChat();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isLoading, showHandoff]);

  async function initChat() {
    setIsLoading(true);
    const seed: ApiHistory[] = [{ role: "user", content: "Hello" }];
    const reply = await callChat(seed);
    setApiHistory(seed);
    setMessages([{ role: "assistant", content: reply.content }]);
    setIsLoading(false);
    inputRef.current?.focus();
  }

  async function callChat(
    history: ApiHistory[]
  ): Promise<{ content: string; copayResults?: CopayResult; handoff?: boolean }> {
    const res = await fetch("/api/copay/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ messages: history }),
    });
    const data = await res.json();
    return {
      content: data.content || "Sorry, something went wrong.",
      copayResults: data.copayResults,
      handoff: data.handoff,
    };
  }

  async function handleSend() {
    const text = input.trim();
    if (!text || isLoading) return;
    setInput("");
    setShowHandoff(false);
    if (inputRef.current) inputRef.current.style.height = "auto";

    const userMsg: Message = { role: "user", content: text };
    const newHistory: ApiHistory[] = [
      ...apiHistory,
      { role: "user", content: text },
    ];

    setMessages((prev) => [...prev, userMsg]);
    setIsLoading(true);

    try {
      const reply = await callChat(newHistory);

      // Add assistant message with inline copayResults if present
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content: reply.content,
          ...(reply.copayResults ? { copayResults: reply.copayResults } : {}),
        },
      ]);
      setApiHistory([
        ...newHistory,
        { role: "assistant", content: reply.content },
      ]);

      // Handle copay results success message
      if (reply.copayResults) {
        setMessages((prev) => [
          ...prev,
          {
            role: "system",
            content: `✅ Found ${reply.copayResults!.hospitals.length} hospital options for your ${reply.copayResults!.policy.plan} plan!`,
            systemType: "success",
          },
        ]);
      }

      // Handle handoff
      if (reply.handoff) {
        setShowHandoff(true);
      }
    } catch {
      setMessages((prev) => [
        ...prev,
        {
          role: "system",
          content: "❌ Connection error. Please try again.",
          systemType: "error",
        },
      ]);
    }

    setIsLoading(false);
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  }

  function handleTextareaInput(e: React.ChangeEvent<HTMLTextAreaElement>) {
    setInput(e.target.value);
    // Auto-resize
    const el = e.target;
    el.style.height = "auto";
    el.style.height = Math.min(el.scrollHeight, 120) + "px";
  }

  return (
    <div
      className="flex flex-col flex-1 min-h-0"
      style={{ background: "#FFFFFF" }}
    >
      {/* ── Header ── */}
      <div
        className="px-5 py-3.5 flex items-center gap-3.5 flex-shrink-0"
        style={{
          background: "#FFFFFF",
          borderBottom: "1px solid #E5E7EB",
        }}
      >
        <div
          style={{
            width: "40px",
            height: "40px",
            borderRadius: "12px",
            background: "linear-gradient(135deg, #059669, #10B981)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            boxShadow: "0 2px 8px rgba(5,150,105,0.25)",
            fontSize: "18px",
          }}
        >
          🏥
        </div>
        <div className="flex-1 min-w-0">
          <h1
            style={{
              fontSize: "15px",
              fontWeight: 700,
              color: "#1F2937",
              fontFamily: "'DM Sans', Inter, sans-serif",
              margin: 0,
            }}
          >
            Copay Estimator
          </h1>
          <p
            style={{
              fontSize: "11px",
              color: "#6B7280",
              fontWeight: 500,
              margin: 0,
            }}
          >
            AI-powered medical copay estimation
          </p>
        </div>
        <div className="flex gap-1.5">
          {["Gold", "Silver", "Basic"].map((plan) => {
            const c: Record<string, string> = {
              Gold: "#D97706",
              Silver: "#6B7280",
              Basic: "#3B82F6",
            };
            return (
              <span
                key={plan}
                style={{
                  fontSize: "9px",
                  fontWeight: 700,
                  color: c[plan],
                  background: `${c[plan]}10`,
                  border: `1px solid ${c[plan]}30`,
                  padding: "3px 8px",
                  borderRadius: "6px",
                  textTransform: "uppercase",
                  letterSpacing: "0.05em",
                }}
              >
                {plan}
              </span>
            );
          })}
        </div>
      </div>

      {/* ── Messages ── */}
      <div
        className="flex-1 overflow-y-auto px-4 py-5"
        style={{
          background: "linear-gradient(180deg, #FFFFFF 0%, #F9FAFB 100%)",
        }}
      >
        {/* Loading state on init */}
        {messages.length === 0 && isLoading && (
          <div className="text-center py-8 animate-fade-up">
            <div
              style={{
                width: "56px",
                height: "56px",
                borderRadius: "16px",
                background: "linear-gradient(135deg, #059669, #10B981)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                margin: "0 auto 16px auto",
                boxShadow: "0 4px 16px rgba(5,150,105,0.3)",
                fontSize: "24px",
              }}
            >
              🏥
            </div>
            <h2
              style={{
                fontSize: "18px",
                fontWeight: 700,
                color: "#1F2937",
                fontFamily: "'DM Sans', Inter, sans-serif",
                margin: 0,
              }}
            >
              Copay Estimator
            </h2>
            <p style={{ fontSize: "12px", color: "#6B7280", marginTop: "4px" }}>
              Estimating your medical costs with AI
            </p>
          </div>
        )}

        {messages.map((msg, i) => (
          <div key={i} className="animate-fade-up">
            <MessageBubble msg={msg} />
          </div>
        ))}

        {/* Typing indicator */}
        {isLoading && messages.length > 0 && (
          <div className="flex items-end gap-2.5 animate-fade-up">
            <div
              style={{
                width: "32px",
                height: "32px",
                borderRadius: "12px",
                background: "linear-gradient(135deg, #059669, #10B981)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                flexShrink: 0,
                boxShadow: "0 2px 6px rgba(5,150,105,0.3)",
                fontSize: "14px",
              }}
            >
              🏥
            </div>
            <div
              style={{
                background: "#FFFFFF",
                border: "1px solid #E5E7EB",
                borderRadius: "18px 18px 18px 6px",
                boxShadow: "0 2px 8px rgba(0,0,0,0.06)",
              }}
            >
              <TypingIndicator />
            </div>
          </div>
        )}

        {/* Handoff prompt */}
        {showHandoff && (
          <HandoffPrompt
            onConnect={() => {
              setShowHandoff(false);
              setMessages((prev) => [
                ...prev,
                {
                  role: "system",
                  content:
                    "📞 Connecting you with a medical support specialist...",
                  systemType: "info",
                },
              ]);
            }}
            onDismiss={() => setShowHandoff(false)}
          />
        )}

        <div ref={bottomRef} />
      </div>

      {/* ── Input Area ── */}
      <div
        style={{
          borderTop: "1px solid #E5E7EB",
          background: "#FFFFFF",
          padding: "12px 16px",
          flexShrink: 0,
        }}
      >
        <div
          className="flex items-end gap-2"
          style={{
            background: "#F9FAFB",
            borderRadius: "14px",
            border: "1px solid #E5E7EB",
            padding: "4px 4px 4px 14px",
            transition: "border-color 0.2s, box-shadow 0.2s",
          }}
          onFocus={(e) => {
            e.currentTarget.style.borderColor = "#10B981";
            e.currentTarget.style.boxShadow =
              "0 0 0 3px rgba(16,185,129,0.1)";
          }}
          onBlur={(e) => {
            e.currentTarget.style.borderColor = "#E5E7EB";
            e.currentTarget.style.boxShadow = "none";
          }}
        >
          <textarea
            ref={inputRef}
            value={input}
            onChange={handleTextareaInput}
            onKeyDown={handleKeyDown}
            placeholder="Describe your symptoms or enter your policy number..."
            disabled={isLoading}
            rows={1}
            style={{
              flex: 1,
              border: "none",
              outline: "none",
              background: "transparent",
              resize: "none",
              fontSize: "14px",
              color: "#1F2937",
              lineHeight: "1.5",
              padding: "8px 0",
              fontFamily: "Inter, sans-serif",
              maxHeight: "120px",
            }}
          />
          <button
            onClick={handleSend}
            disabled={isLoading || !input.trim()}
            style={{
              width: "36px",
              height: "36px",
              borderRadius: "10px",
              background:
                isLoading || !input.trim()
                  ? "#E5E7EB"
                  : "linear-gradient(135deg, #059669, #10B981)",
              border: "none",
              cursor: isLoading || !input.trim() ? "not-allowed" : "pointer",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              flexShrink: 0,
              transition: "background 0.2s, transform 0.15s",
              boxShadow:
                isLoading || !input.trim()
                  ? "none"
                  : "0 2px 8px rgba(5,150,105,0.3)",
            }}
            onMouseDown={(e) => {
              if (!isLoading && input.trim())
                (e.currentTarget as HTMLButtonElement).style.transform =
                  "scale(0.92)";
            }}
            onMouseUp={(e) => {
              (e.currentTarget as HTMLButtonElement).style.transform =
                "scale(1)";
            }}
          >
            <svg
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke={isLoading || !input.trim() ? "#9CA3AF" : "#FFFFFF"}
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <line x1="22" y1="2" x2="11" y2="13" />
              <polygon points="22 2 15 22 11 13 2 9 22 2" />
            </svg>
          </button>
        </div>
        <p
          style={{
            fontSize: "10px",
            color: "#9CA3AF",
            textAlign: "center",
            marginTop: "6px",
          }}
        >
          AI-powered estimation · Not a substitute for medical advice
        </p>
      </div>
    </div>
  );
}
