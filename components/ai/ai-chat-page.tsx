"use client";

import * as React from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { ArrowLeft, Plus, Send, Square } from "lucide-react";
import { cn } from "@/lib/utils";

type Message = {
  id: string;
  role: "user" | "assistant";
  content: string;
};

const THINKING_STEPS = ["Starting Agent Builder", "Reviewing request"];

export function AiChatPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [conversationId, setConversationId] = React.useState<string | null>(null);
  const [messages, setMessages] = React.useState<Message[]>([
    { id: "m-1", role: "user", content: "hi" },
  ]);
  const [inputValue, setInputValue] = React.useState("");
  const [isWorking, setIsWorking] = React.useState(false);
  const pendingResponseRef = React.useRef<ReturnType<typeof setTimeout> | null>(null);

  React.useEffect(() => {
    const existingId = searchParams.get("conversationId");
    if (existingId) {
      setConversationId(existingId);
      return;
    }
    if (conversationId) {
      return;
    }
    const nextId =
      typeof crypto !== "undefined" && "randomUUID" in crypto
        ? crypto.randomUUID()
        : `conv_${Date.now()}_${Math.random().toString(16).slice(2)}`;
    const nextUrl = new URL(window.location.href);
    nextUrl.searchParams.set("conversationId", nextId);
    window.history.replaceState(null, "", nextUrl.toString());
    setConversationId(nextId);
  }, [searchParams, conversationId]);

  React.useEffect(() => {
    return () => {
      if (pendingResponseRef.current) {
        clearTimeout(pendingResponseRef.current);
      }
    };
  }, []);

  const addAssistantResponse = React.useCallback(() => {
    setMessages((prev) => [
      ...prev,
      {
        id: `m-${Date.now()}`,
        role: "assistant",
        content: "Got it — aligning the agent and objectives now.",
      },
    ]);
    setIsWorking(false);
    pendingResponseRef.current = null;
  }, []);

  const handleSend = React.useCallback(() => {
    const trimmed = inputValue.trim();
    if (!trimmed) {
      return;
    }
    setMessages((prev) => [
      ...prev,
      { id: `m-${Date.now()}`, role: "user", content: trimmed },
    ]);
    setInputValue("");
    setIsWorking(true);
    if (pendingResponseRef.current) {
      clearTimeout(pendingResponseRef.current);
    }
    pendingResponseRef.current = setTimeout(addAssistantResponse, 1200);
  }, [addAssistantResponse, inputValue]);

  const handleStop = React.useCallback(() => {
    if (pendingResponseRef.current) {
      clearTimeout(pendingResponseRef.current);
      pendingResponseRef.current = null;
    }
    setIsWorking(false);
  }, []);

  const handleKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key === "Enter") {
      event.preventDefault();
      handleSend();
    }
  };

  return (
    <div className="h-full w-full grid grid-cols-[1.1fr_0.9fr] gap-6" data-conversation-id={conversationId ?? ""}>
      <ChatPanel
        messages={messages}
        inputValue={inputValue}
        isWorking={isWorking}
        onBack={() => router.back()}
        onInputChange={setInputValue}
        onSend={handleSend}
        onStop={handleStop}
        onInputKeyDown={handleKeyDown}
      />
      <StepPanel />
    </div>
  );
}

function ChatPanel({
  messages,
  inputValue,
  isWorking,
  onBack,
  onInputChange,
  onSend,
  onStop,
  onInputKeyDown,
}: {
  messages: Message[];
  inputValue: string;
  isWorking: boolean;
  onBack: () => void;
  onInputChange: (value: string) => void;
  onSend: () => void;
  onStop: () => void;
  onInputKeyDown: (event: React.KeyboardEvent<HTMLInputElement>) => void;
}) {
  return (
    <section className="h-full rounded-[28px] bg-white border border-neutral-200 shadow-sm flex flex-col overflow-hidden">
      <div className="px-6 pt-5 pb-3 flex items-center">
        <button
          type="button"
          onClick={onBack}
          className="inline-flex items-center gap-2 text-sm text-slate-500 hover:text-slate-700 transition"
        >
          <ArrowLeft className="h-4 w-4" />
          Back
        </button>
      </div>

      <div className="flex-1 overflow-y-auto px-6 pb-6">
        <div className="flex flex-col gap-6">
          <MessageList messages={messages} />
          <ThinkingStatus isWorking={isWorking} />
        </div>
      </div>

      <div className="px-6 pb-6 pt-2 bg-white">
        <ChatInputBar
          value={inputValue}
          isWorking={isWorking}
          onChange={onInputChange}
          onSend={onSend}
          onStop={onStop}
          onKeyDown={onInputKeyDown}
        />
      </div>
    </section>
  );
}

function ThinkingStatus({ isWorking }: { isWorking: boolean }) {
  return (
    <div className="space-y-3">
      <div className="text-sm font-medium text-slate-600">Thinking</div>
      <div className="space-y-2">
        {THINKING_STEPS.map((step, index) => (
          <div
            key={step}
            className={cn(
              "flex items-center gap-3 text-sm",
              isWorking ? "text-slate-600" : "text-slate-400"
            )}
          >
            <span
              className={cn(
                "h-2 w-2 rounded-full",
                index === 0 ? "bg-black" : "bg-neutral-600",
                isWorking ? "opacity-100" : "opacity-50"
              )}
            />
            {step}
          </div>
        ))}
      </div>
    </div>
  );
}

function MessageList({ messages }: { messages: Message[] }) {
  return (
    <div className="flex flex-col gap-3">
      {messages.map((message) => (
        <MessageBubble key={message.id} message={message} />
      ))}
    </div>
  );
}

function MessageBubble({ message }: { message: Message }) {
  const isUser = message.role === "user";
  return (
    <div className={cn("flex", isUser ? "justify-end" : "justify-start")}>
      <div
        className={cn(
          "max-w-[70%] rounded-2xl px-4 py-2 text-sm shadow-sm",
          isUser
            ? "bg-neutral-100 text-neutral-800"
            : "bg-white border border-neutral-200 text-neutral-600"
        )}
      >
        {message.content}
      </div>
    </div>
  );
}

function ChatInputBar({
  value,
  isWorking,
  onChange,
  onSend,
  onStop,
  onKeyDown,
}: {
  value: string;
  isWorking: boolean;
  onChange: (value: string) => void;
  onSend: () => void;
  onStop: () => void;
  onKeyDown: (event: React.KeyboardEvent<HTMLInputElement>) => void;
}) {
  return (
    <div className="rounded-full bg-neutral-200 p-[2px] shadow-sm">
      <div className="rounded-full bg-white px-4 py-3 flex items-center gap-3">
        <button
          type="button"
          className="h-10 w-10 rounded-full bg-white border border-neutral-200 shadow-sm flex items-center justify-center text-neutral-600 hover:text-neutral-800 transition"
        >
          <Plus className="h-4 w-4" />
        </button>
        <input
          value={value}
          onChange={(event) => onChange(event.target.value)}
          onKeyDown={onKeyDown}
          placeholder="Working on it..."
          className="flex-1 bg-transparent text-sm text-slate-600 placeholder:text-slate-400 focus:outline-none"
        />
        <button
          type="button"
          onClick={isWorking ? onStop : onSend}
          className={cn(
            "h-11 w-11 rounded-full flex items-center justify-center shadow-sm transition",
            isWorking
              ? "bg-neutral-100 text-neutral-600"
              : "bg-black text-white hover:bg-neutral-800"
          )}
        >
          {isWorking ? <Square className="h-4 w-4" /> : <Send className="h-4 w-4" />}
        </button>
      </div>
    </div>
  );
}

function StepPanel() {
  return (
    <section className="h-full rounded-[28px] bg-neutral-50 border border-neutral-200 shadow-sm flex items-center justify-center relative overflow-hidden">
      {/* Background Pattern */}
      <div className="absolute inset-0 opacity-[0.03]">
        <div className="absolute top-10 left-10 w-32 h-32 rounded-full bg-neutral-400 blur-3xl" />
        <div className="absolute bottom-20 right-10 w-40 h-40 rounded-full bg-neutral-400 blur-3xl" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-48 h-48 rounded-full bg-neutral-300 blur-3xl" />
      </div>

      <div className="relative h-full w-full flex flex-col items-center justify-center px-10 py-8 text-center gap-8">
        {/* Animated Agent Orbs */}
        <div className="relative w-[200px] h-[200px] flex items-center justify-center">
          {/* Center Core */}
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="w-16 h-16 rounded-full bg-black animate-pulse shadow-lg flex items-center justify-center">
              <div className="w-12 h-12 rounded-full bg-neutral-700 flex items-center justify-center">
                <svg className="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
              </div>
            </div>
          </div>

          {/* Orbiting Elements */}
          <div className="absolute inset-0 animate-spin-slow">
            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-8 h-8 rounded-full bg-neutral-600 shadow-md" />
          </div>
          <div className="absolute inset-0 animate-spin-slow-reverse" style={{ animationDelay: "1s" }}>
            <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-6 h-6 rounded-full bg-neutral-500 shadow-md" />
          </div>
          <div className="absolute inset-0 animate-spin-slow" style={{ animationDelay: "0.5s" }}>
            <div className="absolute left-0 top-1/2 -translate-y-1/2 w-7 h-7 rounded-full bg-neutral-600 shadow-md" />
          </div>
          <div className="absolute inset-0 animate-spin-slow-reverse" style={{ animationDelay: "1.5s" }}>
            <div className="absolute right-0 top-1/2 -translate-y-1/2 w-5 h-5 rounded-full bg-neutral-500 shadow-md" />
          </div>
        </div>

        {/* Text Content */}
        <div className="space-y-3">
          <h3 className="text-2xl font-bold text-black">
            Agent Building
          </h3>
          <p className="text-sm text-slate-500 max-w-[280px] leading-relaxed">
            Your AI teammate is being configured to understand your workflow and automate complex tasks
          </p>
        </div>

        {/* Progress Indicators */}
        <div className="flex gap-2">
          <div className="w-2 h-2 rounded-full bg-black animate-bounce" />
          <div className="w-2 h-2 rounded-full bg-neutral-600 animate-bounce" style={{ animationDelay: "0.1s" }} />
          <div className="w-2 h-2 rounded-full bg-neutral-500 animate-bounce" style={{ animationDelay: "0.2s" }} />
        </div>
      </div>
    </section>
  );
}

