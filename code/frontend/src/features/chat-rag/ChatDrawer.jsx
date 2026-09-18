import { useMemo, useState } from "react";
import useAppStore from "../../store/appStore";
import ChatMessage from "./ChatMessage";
import { Sparkles, Send } from "lucide-react";

function ChatDrawer() {
  const [draft, setDraft] = useState("");
  const [merging, setMerging] = useState(false);
  const chatMessages = useAppStore((state) => state.chatMessages);
  const submitChatQuestion = useAppStore((state) => state.submitChatQuestion);
  const pullRequests = useAppStore((state) => state.pullRequests);
  const activePrId = useAppStore((state) => state.activePrId);
  const toggleApproval = useAppStore((state) => state.toggleApproval);
  const mergePullRequest = useAppStore((state) => state.mergePullRequest);

  const pr = pullRequests.find((item) => item.id === activePrId) || pullRequests[0] || null;
  const isMerged = pr?.status === "merged";

  const readyToMerge = useMemo(
    () => isMerged || (pr?.approvals?.length ? pr.approvals.every((approval) => approval.done) : false),
    [pr, isMerged]
  );

  const handleMerge = async () => {
    if (!pr || !pr.number || merging || isMerged) return;
    const confirm = window.confirm(`Merge PR #${pr.number} ("${pr.title}") directly into the base branch?`);
    if (!confirm) return;

    try {
      setMerging(true);
      await mergePullRequest(pr.number, `Merge PR #${pr.number} from GitMind`);
    } catch (err) {
      alert(`Merge failed: ${err?.response?.data?.message || err?.message}`);
    } finally {
      setMerging(false);
    }
  };

  const submit = (event) => {
    event.preventDefault();
    if (!draft.trim()) return;
    submitChatQuestion(draft);
    setDraft("");
  };

  return (
    <div className="chat-assistant-container">
      <div className="assistant-header">
        <div className="assistant-title">
          <Sparkles size={16} />
          <h4>GitMind AI Copilot</h4>
        </div>
        <span className="pr-target-tag">
          {pr ? `PR #${pr.number}` : "No PR"}
        </span>
      </div>

      <div className="pr-title-strip">
        <span className="truncate">{pr?.title || "Select a pull request to inspect with AI"}</span>
      </div>

      <div className="assistant-approvals">
        {(pr?.approvals || []).map((approval) => (
          <label key={approval.id} className="approval-checkbox-label">
            <input
              type="checkbox"
              checked={approval.done}
              onChange={() => toggleApproval(approval.id)}
            />
            <span>{approval.label}</span>
          </label>
        ))}
      </div>

      <div className="assistant-chat-scroll">
        {chatMessages.length === 0 ? (
          <div className="chat-empty-hint">
            <p>Ask AI questions about failures, root causes, or proposed patches.</p>
          </div>
        ) : (
          chatMessages.map((message) => (
            <ChatMessage
              key={message.id}
              role={message.role}
              content={message.content}
              citations={message.citations}
            />
          ))
        )}
      </div>

      <form className="assistant-input-bar" onSubmit={submit}>
        <input
          value={draft}
          onChange={(event) => setDraft(event.target.value)}
          placeholder="Ask GitMind about this failure..."
          disabled={!pr}
        />
        <button type="submit" disabled={!pr || !draft.trim()} aria-label="Send">
          <Send size={14} />
        </button>
      </form>

      <div className="assistant-actions">
        <button
          type="button"
          className="btn-review"
          onClick={() => {
            if (pr?.url) window.open(pr.url, "_blank");
          }}
          disabled={!pr}
        >
          Review AI Fix
        </button>
        <button
          type="button"
          onClick={handleMerge}
          className={`btn-merge ${isMerged ? "ready" : readyToMerge ? "ready" : "pending"}`}
          disabled={!readyToMerge || merging || isMerged}
          style={isMerged ? { background: "rgba(16, 185, 129, 0.2)", borderColor: "#10b981", color: "#6ee7b7" } : undefined}
        >
          {isMerged ? "Merged ✓" : merging ? "Merging..." : readyToMerge ? "Merge Fix" : "Await Approvals"}
        </button>
      </div>
    </div>
  );
}

export default ChatDrawer;
