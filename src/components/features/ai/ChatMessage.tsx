"use client";

import Badge from "@/components/ui/Badge";
import { Bot, User } from "lucide-react";

export interface ChatMessageData {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: Date;
}

interface ChatMessageProps {
  message: ChatMessageData;
}

export default function ChatMessage({ message }: ChatMessageProps) {
  const isUser = message.role === "user";

  return (
    <div className={`flex gap-3 ${isUser ? "flex-row-reverse" : ""}`}>
      {/* Avatar */}
      <div
        className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${
          isUser ? "bg-primary/10" : "bg-success/10"
        }`}
      >
        {isUser ? (
          <User className="h-4 w-4 text-primary" />
        ) : (
          <Bot className="h-4 w-4 text-success" />
        )}
      </div>

      {/* Message bubble */}
      <div
        className={`max-w-[80%] rounded-xl px-4 py-2.5 ${
          isUser
            ? "bg-primary text-white"
            : "border border-border bg-cream-light text-foreground"
        }`}
      >
        <p className="text-sm whitespace-pre-wrap">{message.content}</p>
        <p
          className={`mt-1 text-xs ${
            isUser ? "text-white/60" : "text-muted"
          }`}
        >
          {message.timestamp.toLocaleTimeString("en-PK", {
            hour: "2-digit",
            minute: "2-digit",
          })}
        </p>
      </div>
    </div>
  );
}
