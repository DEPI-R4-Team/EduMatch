import { useCallback, useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { MessageSquare } from "lucide-react";
import { ChatHeader } from "@/components/chat/ChatHeader";
import { ChatInput } from "@/components/chat/ChatInput";
import { ConversationList } from "@/components/chat/ConversationList";
import type { Conversation } from "@/components/chat/ConversationItem";
import { MessageBubble, type ChatMessage } from "@/components/chat/MessageBubble";
import { useAuth } from "@/hooks/useAuth";
import {
  getApplicationMessages,
  getMyChatConversations,
  getSessionMessages,
  sendApplicationMessage,
  sendMessage,
} from "@/services/messages.service";
import { getSessionById } from "@/services/sessions.service";
import type { ChatConversation, Message } from "@/types/message";
import type { Session } from "@/types/session";

function errorMessage(error: unknown) {
  const status = (error as { response?: { status?: number } }).response?.status;
  if (status === 403) return "You do not have access to this conversation.";
  if (status === 404) return "Conversation not found.";
  return "Cannot load conversation.";
}

function formatTime(value: string | null) {
  if (!value) return "";
  return new Intl.DateTimeFormat(undefined, { dateStyle: "short" }).format(new Date(value));
}

function conversationKey(conversation: Pick<ChatConversation, "conversation_type" | "application_id" | "session_id">) {
  return conversation.conversation_type === "application"
    ? `application:${conversation.application_id}`
    : `session:${conversation.session_id}`;
}

function mapConversation(conversation: ChatConversation): Conversation {
  return {
    id: conversationKey(conversation),
    name: conversation.other_user_name,
    role: conversation.request_title,
    label: conversation.label,
    status: conversation.status,
    lastMessage: conversation.last_message ?? "No messages yet",
    time: formatTime(conversation.last_message_at ?? conversation.created_at),
    unread: 0,
    online: true,
  };
}

function mapMessage(message: Message, currentUserId: number | null | undefined): ChatMessage {
  const isOutgoing = message.sender_id === currentUserId;
  return {
    id: String(message.id),
    sender: isOutgoing ? "student" : "instructor",
    senderName: isOutgoing ? undefined : message.sender_name ?? "User",
    text: message.message,
  };
}

export function ChatPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const sessionId = searchParams.get("sessionId");
  const applicationId = searchParams.get("applicationId");
  const activeContext = applicationId ? "application" : sessionId ? "session" : null;
  const activeConversationId = applicationId ? `application:${applicationId}` : sessionId ? `session:${sessionId}` : "";
  const { user } = useAuth();
  const [searchTerm, setSearchTerm] = useState("");
  const [messageText, setMessageText] = useState("");
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [session, setSession] = useState<Session | null>(null);
  const [conversations, setConversations] = useState<ChatConversation[]>([]);
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [showOptions, setShowOptions] = useState(false);

  const loadConversations = useCallback(async () => {
    try {
      setConversations(await getMyChatConversations());
      setError("");
    } catch (caughtError) {
      setError(errorMessage(caughtError));
    }
  }, []);

  const loadMessages = useCallback(async () => {
    if (!activeContext) return;

    try {
      const messageData =
        activeContext === "application" && applicationId
          ? await getApplicationMessages(applicationId)
          : sessionId
            ? await getSessionMessages(sessionId)
            : [];
      setMessages(messageData.map((message) => mapMessage(message, user?.id)));
      setError("");
    } catch (caughtError) {
      setError(errorMessage(caughtError));
    }
  }, [activeContext, applicationId, sessionId, user?.id]);

  useEffect(() => {
    void loadConversations();
  }, [loadConversations]);

  useEffect(() => {
    async function loadActiveChat() {
      setMessages([]);
      setSession(null);
      if (!activeContext) return;

      setLoading(true);
      try {
        if (sessionId) {
          setSession(await getSessionById(Number(sessionId)));
        }
        await loadMessages();
      } catch (caughtError) {
        setError(errorMessage(caughtError));
      } finally {
        setLoading(false);
      }
    }

    void loadActiveChat();
  }, [activeContext, loadMessages, sessionId]);

  useEffect(() => {
    if (!activeContext) return;
    const intervalId = window.setInterval(() => {
      void loadMessages();
      void loadConversations();
    }, 5000);
    return () => window.clearInterval(intervalId);
  }, [activeContext, loadConversations, loadMessages]);

  const visibleConversations = useMemo(() => {
    const mapped = conversations.map(mapConversation);
    const query = searchTerm.trim().toLowerCase();
    if (!query) return mapped;
    return mapped.filter((conversation) =>
      [conversation.name, conversation.role, conversation.label, conversation.status, conversation.lastMessage]
        .join(" ")
        .toLowerCase()
        .includes(query),
    );
  }, [conversations, searchTerm]);

  const activeConversationData = conversations.find((conversation) => conversationKey(conversation) === activeConversationId);
  const activeConversation: Conversation =
    activeConversationData
      ? mapConversation(activeConversationData)
      : session
        ? {
            id: activeConversationId,
            name: session.instructor_name ?? "Instructor",
            role: session.request_title ?? "Session Chat",
            label: "Session",
            status: session.status,
            lastMessage: messages.at(-1)?.text ?? "No messages yet",
            time: "Now",
            unread: 0,
            online: true,
          }
        : {
            id: "empty",
            name: "Messages",
            role: "No conversation selected",
            lastMessage: "Applicants and accepted sessions will appear here.",
            time: "",
            unread: 0,
            online: false,
          };

  async function handleSendMessage() {
    const trimmedMessage = messageText.trim();
    if (!trimmedMessage || !activeContext) return;

    try {
      const createdMessage =
        activeContext === "application" && applicationId
          ? await sendApplicationMessage(applicationId, trimmedMessage)
          : sessionId
            ? await sendMessage({ session_id: sessionId, message: trimmedMessage })
            : null;
      if (!createdMessage) return;
      setMessages((currentMessages) => [...currentMessages, mapMessage(createdMessage, user?.id)]);
      setMessageText("");
      setError("");
      void loadConversations();
    } catch (caughtError) {
      setError(errorMessage(caughtError));
    }
  }

  return (
    <div className="flex h-screen min-h-[720px] flex-col overflow-hidden bg-[#0f172a] lg:flex-row">
      <ConversationList
        activeConversationId={activeConversationId}
        conversations={visibleConversations}
        onNewMessage={() => setNotice("Open a request applicant or accepted session to start chatting.")}
        onSearchChange={setSearchTerm}
        onSelectConversation={(conversationId) => {
          const conversation = conversations.find((item) => conversationKey(item) === conversationId);
          if (!conversation) return;
          setShowOptions(false);
          navigate(
            conversation.conversation_type === "application"
              ? `/student/chat?applicationId=${conversation.application_id}`
              : `/student/chat?sessionId=${conversation.session_id}`,
          );
        }}
        searchTerm={searchTerm}
      />

      <section className="flex min-h-0 flex-1 flex-col bg-background/80">
        <ChatHeader
          conversation={activeConversation}
          onMoreOptions={() => setShowOptions((current) => !current)}
          onReportIssue={() => {
            setNotice("Report issue is a placeholder for the academic version.");
            setShowOptions(false);
          }}
          onVideoPlaceholder={() => setNotice("Video meeting is a placeholder in this academic version.")}
          profilePath={`/student/instructors/${activeConversationData?.other_user_id ?? session?.instructor_id ?? ""}`}
          schedulePath="/student/sessions"
          sessionPath={sessionId ? `/student/sessions/${sessionId}` : "/student/sessions"}
          showOptions={showOptions}
        />

        <div className="min-h-0 flex-1 overflow-y-auto px-margin-mobile py-lg md:px-margin-desktop">
          <div className="mx-auto flex max-w-5xl flex-col gap-md">
            {notice ? <p className="rounded-md border border-secondary/25 bg-secondary/10 px-md py-sm text-body-sm text-secondary">{notice}</p> : null}
            {error ? <p className="rounded-md border border-error/25 bg-error/10 px-md py-sm text-body-sm text-error">{error}</p> : null}
            {loading ? <p className="rounded-md border border-[#27272A] bg-[#18181B] px-md py-sm text-body-sm text-zinc-400">Loading chat...</p> : null}

            {!activeContext && conversations.length === 0 && !loading && !error ? (
              <div className="rounded-lg border border-dashed border-[#27272A] bg-[#121214] p-xl text-center">
                <div className="mx-auto mb-md flex size-14 items-center justify-center rounded-full bg-primary/15 text-primary">
                  <MessageSquare className="size-6" />
                </div>
                <h2 className="text-headline-md text-zinc-100">No conversations yet</h2>
                <p className="mx-auto mt-sm max-w-md text-body-sm text-zinc-400">
                  Applicants and accepted sessions will appear here when instructors apply or sessions are created.
                </p>
                <Link className="mt-md inline-flex h-10 items-center justify-center rounded-md bg-primary px-md text-body-sm font-medium text-on-primary transition hover:bg-primary/90" to="/student/requests">
                  View My Requests
                </Link>
              </div>
            ) : null}

            {!activeContext && conversations.length > 0 ? (
              <div className="rounded-lg border border-dashed border-[#27272A] bg-[#121214] p-xl text-center">
                <div className="mx-auto mb-md flex size-14 items-center justify-center rounded-full bg-primary/15 text-primary">
                  <MessageSquare className="size-6" />
                </div>
                <h2 className="text-headline-md text-zinc-100">Select a conversation</h2>
                <p className="mt-sm text-body-sm text-zinc-400">Choose an applicant or session from the list.</p>
              </div>
            ) : null}

            {activeContext && messages.length === 0 && !loading && !error ? (
              <p className="rounded-md border border-dashed border-[#27272A] bg-[#121214] p-md text-body-sm text-zinc-400">
                No messages yet. Send the first message for this conversation.
              </p>
            ) : null}

            {activeContext
              ? messages.map((message) => (
                  <MessageBubble
                    key={message.id}
                    message={message}
                    onDownloadAttachment={() => setNotice("File download is a placeholder in this academic version.")}
                  />
                ))
              : null}
          </div>
        </div>

        <ChatInput
          onAttach={() => setNotice("File attachments are not implemented yet.")}
          onChange={setMessageText}
          onSend={() => void handleSendMessage()}
          disabled={!activeContext}
          value={messageText}
        />
      </section>
    </div>
  );
}
