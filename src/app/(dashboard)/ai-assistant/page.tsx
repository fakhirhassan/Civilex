"use client";

import Topbar from "@/components/layout/Topbar";
import ChatWindow from "@/components/features/ai/ChatWindow";

export default function AiAssistantPage() {
  return (
    <div>
      <Topbar title="AI Legal Assistant" />
      <div className="p-4">
        <div className="overflow-hidden rounded-xl border border-border bg-cream-light">
          <ChatWindow />
        </div>
      </div>
    </div>
  );
}
