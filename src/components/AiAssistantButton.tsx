import { useLocation, useNavigate } from "react-router-dom";
import { Bot } from "lucide-react";

const AiAssistantButton = () => {
  const navigate = useNavigate();
  const location = useLocation();

  // Hide on the chat page itself & auth pages
  if (["/chat", "/auth", "/reset-password"].includes(location.pathname)) return null;

  return (
    <button
      onClick={() => navigate("/chat")}
      className="fixed bottom-6 right-6 z-50 group flex items-center gap-2 pl-3 pr-4 py-3 rounded-full gradient-bg shadow-xl hover:shadow-2xl transition-all hover:-translate-y-0.5 animate-fade-up"
      aria-label="AI PEDULI Assistant"
    >
      <span className="relative flex h-9 w-9 items-center justify-center rounded-full bg-white/20">
        <span className="absolute inset-0 rounded-full bg-white/30 animate-ping opacity-60" />
        <Bot className="h-5 w-5 text-primary-foreground relative" />
      </span>
      <span className="font-heading font-semibold text-sm text-primary-foreground hidden sm:inline">
        AI PEDULI Assistant
      </span>
    </button>
  );
};

export default AiAssistantButton;
