"use client";

import { useState, useRef, useEffect } from "react";
import Button from "@/components/ui/Button";
import Badge from "@/components/ui/Badge";
import ChatMessage, { type ChatMessageData } from "./ChatMessage";
import { Send, Bot, Trash2, AlertTriangle } from "lucide-react";

const QUICK_PROMPTS = [
  "How do I file a civil case?",
  "What are the bail requirements?",
  "Explain the evidence submission process",
  "How do court hearings work?",
  "What are the court fee structures?",
  "How does the judgment process work?",
];

export default function ChatWindow() {
  const [messages, setMessages] = useState<ChatMessageData[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const sendMessage = async (text: string) => {
    if (!text.trim() || isLoading) return;

    const userMessage: ChatMessageData = {
      id: crypto.randomUUID(),
      role: "user",
      content: text.trim(),
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInput("");
    setIsLoading(true);

    try {
      const res = await fetch("/api/ai/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: text.trim() }),
      });

      const data = await res.json();

      const assistantMessage: ChatMessageData = {
        id: crypto.randomUUID(),
        role: "assistant",
        content: res.ok
          ? data.response
          : "Sorry, I encountered an error. Please try again.",
        timestamp: new Date(),
      };

      setMessages((prev) => [...prev, assistantMessage]);
    } catch {
      setMessages((prev) => [
        ...prev,
        {
          id: crypto.randomUUID(),
          role: "assistant",
          content: "Sorry, I encountered an error. Please try again.",
          timestamp: new Date(),
        },
      ]);
    } finally {
      setIsLoading(false);
      inputRef.current?.focus();
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage(input);
    }
  };

  const clearChat = () => {
    setMessages([]);
  };

  return (
    <div className="flex h-[calc(100vh-8rem)] flex-col">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-border px-4 py-3">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-success/10">
            <Bot className="h-5 w-5 text-success" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-foreground">
              Civilex AI Assistant
            </h3>
            <p className="text-xs text-muted">
              Legal guidance for Pakistani judiciary
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="warning">
            <AlertTriangle className="mr-1 inline h-3 w-3" />
            Demo Mode
          </Badge>
          {messages.length > 0 && (
            <Button variant="ghost" size="sm" onClick={clearChat}>
              <Trash2 className="h-4 w-4" />
            </Button>
          )}
        </div>
      </div>

      {/* Messages area */}
      <div className="flex-1 overflow-y-auto p-4">
        {messages.length === 0 ? (
          <div className="flex h-full flex-col items-center justify-center">
            <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-success/10">
              <Bot className="h-8 w-8 text-success" />
            </div>
            <h3 className="mb-2 text-lg font-semibold text-foreground">
              How can I help you today?
            </h3>
            <p className="mb-6 max-w-md text-center text-sm text-muted">
              Ask me anything about Pakistani court procedures, case filing,
              evidence requirements, bail provisions, or general legal guidance.
            </p>

            {/* Quick prompts */}
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
              {QUICK_PROMPTS.map((prompt) => (
                <button
                  key={prompt}
                  onClick={() => sendMessage(prompt)}
                  className="rounded-lg border border-border bg-cream-light px-4 py-2.5 text-left text-sm text-foreground transition-colors hover:border-primary hover:bg-cream"
                >
                  {prompt}
                </button>
              ))}
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            {messages.map((msg) => (
              <ChatMessage key={msg.id} message={msg} />
            ))}
            {isLoading && (
              <div className="flex gap-3">
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-success/10">
                  <Bot className="h-4 w-4 text-success" />
                </div>
                <div className="rounded-xl border border-border bg-cream-light px-4 py-3">
                  <div className="flex gap-1">
                    <span className="h-2 w-2 animate-bounce rounded-full bg-muted [animation-delay:0ms]" />
                    <span className="h-2 w-2 animate-bounce rounded-full bg-muted [animation-delay:150ms]" />
                    <span className="h-2 w-2 animate-bounce rounded-full bg-muted [animation-delay:300ms]" />
                  </div>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>
        )}
      </div>

      {/* Disclaimer */}
      <div className="border-t border-border bg-warning/5 px-4 py-1.5">
        <p className="text-center text-xs text-muted">
          This is a demo AI assistant. Responses are pre-configured and do not
          constitute legal advice.
        </p>
      </div>

      {/* Input area */}
      <div className="border-t border-border p-4">
        <div className="flex gap-3">
          <textarea
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Ask a legal question..."
            rows={1}
            className="flex-1 resize-none rounded-lg border border-border bg-cream-light px-4 py-2.5 text-sm text-foreground placeholder:text-muted focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
          />
          <Button
            variant="primary"
            onClick={() => sendMessage(input)}
            disabled={!input.trim() || isLoading}
            isLoading={isLoading}
          >
            <Send className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}
