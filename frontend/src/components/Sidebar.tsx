import { Bot, MessageSquarePlus, PanelLeftClose } from "lucide-react";

interface SidebarProps {
  onNewChat: () => void;
  onClose: () => void;
}

export default function Sidebar({ onNewChat, onClose }: SidebarProps) {
  return (
    <aside className="sidebar">
      <div className="sidebar-header">
        <div className="brand">
          <span className="brand-icon">
            <Bot size={21} />
          </span>
          <span>Powerful AI</span>
        </div>

        <button
          className="icon-button"
          onClick={onClose}
          aria-label="Close sidebar"
        >
          <PanelLeftClose size={19} />
        </button>
      </div>

      <button className="new-chat-button" onClick={onNewChat}>
        <MessageSquarePlus size={18} />
        <span>New chat</span>
      </button>

      <div className="sidebar-label">YOUR ASSISTANT</div>

      <div className="sidebar-info">
        <Bot size={20} />
        <div>
          <strong>AI Assistant</strong>
          <p>Powered by LangGraph</p>
        </div>
      </div>

      <div className="sidebar-footer">
        <span className="status-dot" />
        Backend connected locally
      </div>
    </aside>
  );
}
