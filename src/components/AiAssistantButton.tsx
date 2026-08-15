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
      className="fixed bottom-4 right-4 md:bottom-6 md:right-6 z-50 group flex items-center gap-2 pl-2.5 pr-3 py-2.5 md:pl-3 md:pr-4 md:py-3 rounded-full gradient-bg shadow-xl hover:shadow-2xl transition-all hover:-translate-y-0.5 animate-fade-up"
      aria-label="AI PEDULI Assistant"
    >
      <span className="relative flex h-8 w-8 md:h-9 md:w-9 items-center justify-center rounded-full bg-white/20">
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
