import { Suspense } from "react";
import { AiChatPage } from "@/components/ai/ai-chat-page";

function AiChatFallback() {
  return (
    <div className="flex-1 flex items-center justify-center text-neutral-500">
      Loading chat…
    </div>
  );
}

export default function AiChatRoute() {
  return (
    <Suspense fallback={<AiChatFallback />}>
      <AiChatPage />
    </Suspense>
  );
}
