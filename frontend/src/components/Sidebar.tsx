import {
  ChevronDown,
  ChevronUp,
  MessageSquare,
  Search,
  Store,
  BookmarkCheck,
  Settings,
  Trash2,
  Pencil,
  Check,
  X,
  PanelLeftClose,
} from "lucide-react";
import { useState } from "react";

import ChatGptIcon from "./ChatGptIcon";
import type { Conversation } from "../types/conversation";

interface SidebarProps {
  onNewChat: () => void;
  onClose: () => void;
  conversations: Conversation[];
  activeConversationId: string | null;
  onSelectConversation: (id: string) => void;
  onDeleteConversation: (id: string) => void;
  onRenameConversation: (id: string, title: string) => void;
  userName?: string;
  userEmail?: string;
  userAvatar?: string;
}

export default function Sidebar({
  onNewChat,
  onClose,
  conversations,
  activeConversationId,
  onSelectConversation,
  onDeleteConversation,
  onRenameConversation,
  userName = "S J A Siam",
  userEmail = "sja.siam@skiff.com",
  userAvatar = "/avatar.jpg",
}: SidebarProps) {
  const [activeTab, setActiveTab] = useState<"chats" | "search" | "marketplace" | "saved" | "settings">("chats");
  const [searchQuery, setSearchQuery] = useState("");
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

  const filteredConversations = searchQuery.trim()
    ? conversations.filter((c) =>
        c.title.toLowerCase().includes(searchQuery.toLowerCase()),
      )
    : conversations;

  return (
    <aside className="sidebar-dark">
      {/* Top Brand Header */}
      <div className="sidebar-brand-header">
        <div className="brand-pill">
          <div className="chatgpt-logo-badge">
            <ChatGptIcon size={18} />
          </div>
          <span className="brand-text">ChatGTP 3.5</span>
          <ChevronDown size={16} className="brand-chevron" />
        </div>

        <button
          className="sidebar-close-mobile"
          onClick={onClose}
          aria-label="Close sidebar"
        >
          <PanelLeftClose size={18} />
        </button>
      </div>

      {/* Navigation Menu */}
      <nav className="sidebar-nav">
        <button
          type="button"
          className={`sidebar-nav-item ${activeTab === "chats" ? "active-pill" : ""}`}
          onClick={() => setActiveTab("chats")}
        >
          <div className="nav-icon-wrap green-icon">
            <MessageSquare size={17} />
          </div>
          <span className="nav-label">Chats</span>
        </button>

        <button
          type="button"
          className={`sidebar-nav-item ${activeTab === "search" ? "active-pill" : ""}`}
          onClick={() => setActiveTab("search")}
        >
          <div className="nav-icon-wrap blue-icon">
            <Search size={17} />
          </div>
          <span className="nav-label">Search</span>
          <span className="nav-badge">⌘ F</span>
        </button>

        <button
          type="button"
          className={`sidebar-nav-item ${activeTab === "marketplace" ? "active-pill" : ""}`}
          onClick={() => setActiveTab("marketplace")}
        >
          <div className="nav-icon-wrap pink-icon">
            <Store size={17} />
          </div>
          <span className="nav-label">Market Place</span>
        </button>

        <button
          type="button"
          className={`sidebar-nav-item ${activeTab === "saved" ? "active-pill" : ""}`}
          onClick={() => setActiveTab("saved")}
        >
          <div className="nav-icon-wrap emerald-icon">
            <BookmarkCheck size={17} />
          </div>
          <span className="nav-label">Saved Command</span>
        </button>

        <button
          type="button"
          className={`sidebar-nav-item ${activeTab === "settings" ? "active-pill" : ""}`}
          onClick={() => setActiveTab("settings")}
        >
          <div className="nav-icon-wrap purple-icon">
            <Settings size={17} />
          </div>
          <span className="nav-label">Settings</span>
        </button>
      </nav>

      {/* Search Input when Search Tab is Active */}
      {activeTab === "search" && (
        <div className="sidebar-search-box">
          <input
            type="text"
            placeholder="Search chats..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="sidebar-search-input"
            autoFocus
          />
        </div>
      )}

      {/* Conversations History List */}
      <div className="sidebar-history-container">
        <div className="history-section-title">
          <span>RECENT CHATS</span>
          <span className="chat-count">{filteredConversations.length}</span>
        </div>

        <div className="conversation-history-list">
          {filteredConversations.length === 0 ? (
            <p className="empty-history-text">
              {searchQuery ? "No matching chats." : "No chats yet."}
            </p>
          ) : (
            filteredConversations.map((conversation) => (
              <div
                key={conversation.id}
                className={`history-item ${
                  conversation.id === activeConversationId ? "active" : ""
                }`}
              >
                {editingId === conversation.id ? (
                  <form
                    className="history-rename-form"
                    onSubmit={(e) => {
                      e.preventDefault();
                      saveEditing(conversation.id);
                    }}
                  >
                    <input
                      type="text"
                      className="history-rename-input"
                      value={editingTitle}
                      onChange={(e) => setEditingTitle(e.target.value)}
                      aria-label="Conversation title"
                      autoFocus
                    />
                    <button
                      type="submit"
                      className="rename-action-btn"
                      aria-label="Save title"
                    >
                      <Check size={14} />
                    </button>
                    <button
                      type="button"
                      className="rename-action-btn"
                      onClick={cancelEditing}
                      aria-label="Cancel editing"
                    >
                      <X size={14} />
                    </button>
                  </form>
                ) : (
                  <>
                    <button
                      type="button"
                      className="history-title-btn"
                      onClick={() => onSelectConversation(conversation.id)}
                      title={conversation.title}
                    >
                      <MessageSquare size={14} className="history-icon" />
                      <span className="history-title-text">
                        {conversation.title}
                      </span>
                    </button>

                    <div className="history-item-actions">
                      <button
                        type="button"
                        className="history-action-btn"
                        aria-label={`Rename ${conversation.title}`}
                        title="Rename"
                        onClick={() =>
                          startEditing(conversation.id, conversation.title)
                        }
                      >
                        <Pencil size={13} />
                      </button>

                      <button
                        type="button"
                        className="history-action-btn delete-btn"
                        aria-label={`Delete ${conversation.title}`}
                        title="Delete"
                        onClick={() => onDeleteConversation(conversation.id)}
                      >
                        <Trash2 size={13} />
                      </button>
                    </div>
                  </>
                )}
              </div>
            ))
          )}
        </div>
      </div>

      {/* NOTE: Upgrade card explicitly omitted per user prompt: "do not add any upgreade component in UI" */}

      {/* User Profile Footer */}
      <div className="sidebar-profile-footer">
        <div className="profile-info-group">
          <img
            src={userAvatar}
            alt={userName}
            className="profile-avatar-img"
            onError={(e) => {
              (e.target as HTMLElement).style.display = "none";
            }}
          />
          <div className="profile-details">
            <span className="profile-name">{userName}</span>
            <span className="profile-email">{userEmail}</span>
          </div>
        </div>

        <button
          type="button"
          className="profile-chevron-btn"
          aria-label="Account options"
        >
          <ChevronUp size={16} />
        </button>
      </div>
    </aside>
  );
}
