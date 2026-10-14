import {
  Bot,
  MessageSquarePlus,
  PanelLeftClose,
  MessageSquare,
  Trash2,
  Pencil,
  Check,
  X,
} from "lucide-react";
import { useState } from "react";

import type { Conversation } from "../types/conversation";

interface SidebarProps {
  onNewChat: () => void;
  onClose: () => void;
  conversations: Conversation[];
  activeConversationId: string | null;
  onSelectConversation: (id: string) => void;
  onDeleteConversation: (id: string) => void;
  onRenameConversation: (id: string, title: string) => void;
}

export default function Sidebar({
  onNewChat,
  onClose,
  conversations,
  activeConversationId,
  onSelectConversation,
  onDeleteConversation,
  onRenameConversation,
}: SidebarProps) {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingTitle, setEditingTitle] = useState("");

  function startEditing(id: string, title: string) {
    setEditingId(id);
    setEditingTitle(title);
  }

  function cancelEditing() {
    setEditingId(null);
    setEditingTitle("");
  }

  function saveEditing(id: string) {
    const title = editingTitle.trim();
    if (title) {
      onRenameConversation(id, title);
    }
    cancelEditing();
  }

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

      <div className="sidebar-label conversation-history-label">
        YOUR CONVERSATIONS
      </div>

      <div className="conversation-history">
        {conversations.length === 0 ? (
          <p className="empty-history">Your chats will appear here.</p>
        ) : (
          conversations.map((conversation) => (
            <div
              key={conversation.id}
              className={`conversation-item ${
                conversation.id === activeConversationId ? "active" : ""
              }`}
            >
              {editingId === conversation.id ? (
                <>
                  <input
                    className="conversation-rename-input"
                    aria-label="Conversation title"
                    value={editingTitle}
                    maxLength={100}
                    autoFocus
                    onChange={(event) => setEditingTitle(event.target.value)}
                    onKeyDown={(event) => {
                      if (event.key === "Enter") {
                        saveEditing(conversation.id);
                      }

                      if (event.key === "Escape") {
                        cancelEditing();
                      }
                    }}
                  />

                  <button
                    type="button"
                    className="conversation-delete"
                    aria-label="Save conversation title"
                    onClick={() => saveEditing(conversation.id)}
                  >
                    <Check size={15} />
                  </button>

                  <button
                    type="button"
                    className="conversation-delete"
                    aria-label="Cancel renaming"
                    onClick={cancelEditing}
                  >
                    <X size={15} />
                  </button>
                </>
              ) : (
                <>
                  <button
                    type="button"
                    className="conversation-select"
                    onClick={() => onSelectConversation(conversation.id)}
                    aria-current={
                      conversation.id === activeConversationId
                        ? "page"
                        : undefined
                    }
                    title={conversation.title}
                  >
                    <MessageSquare size={16} />
                    <span>{conversation.title}</span>
                  </button>

                  <button
                    type="button"
                    className="conversation-delete"
                    aria-label={`Rename ${conversation.title}`}
                    title="Rename conversation"
                    onClick={() =>
                      startEditing(conversation.id, conversation.title)
                    }
                  >
                    <Pencil size={15} />
                  </button>

                  <button
                    type="button"
                    className="conversation-delete"
                    aria-label={`Delete ${conversation.title}`}
                    title="Delete conversation"
                    onClick={() => onDeleteConversation(conversation.id)}
                  >
                    <Trash2 size={15} />
                  </button>
                </>
              )}
            </div>
          ))
        )}
      </div>

      <div className="sidebar-footer">
        <span className="status-dot" />
        Backend connected locally
      </div>
    </aside>
  );
}
