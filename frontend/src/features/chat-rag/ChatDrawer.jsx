import { useMemo, useState } from "react";
import useAppStore from "../../store/appStore";
import ChatMessage from "./ChatMessage";

function ChatDrawer() {
  const [draft, setDraft] = useState("");
  const chatMessages = useAppStore((state) => state.chatMessages);
  const submitChatQuestion = useAppStore((state) => state.submitChatQuestion);
  const pullRequests = useAppStore((state) => state.pullRequests);
  const activePrId = useAppStore((state) => state.activePrId);
  const toggleApproval = useAppStore((state) => state.toggleApproval);

  const pr = pullRequests.find((item) => item.id === activePrId) || pullRequests[0] || null;

  const readyToMerge = useMemo(
    () => (pr ? pr.approvals.every((approval) => approval.done) : false),
    [pr]
  );

  const submit = (event) => {
    event.preventDefault();
    submitChatQuestion(draft);
    setDraft("");
  };

  return (
    <aside className="pr-card">
      <h4>
        {pr ? (
          <>
            PR #{pr.number} <span className="pr-subtitle">{pr.title}</span>
          </>
        ) : (
          "No PR selected"
        )}
      </h4>

      <div className="approval-list">
        {(pr?.approvals || []).map((approval) => (
          <label key={approval.id} className="approval-item">
            <input
              type="checkbox"
              checked={approval.done}
              onChange={() => toggleApproval(approval.id)}
            />
            <span>{approval.label}</span>
          </label>
        ))}
      </div>

      <div className="chat-feed">
        {chatMessages.slice(-3).map((message) => (
          <ChatMessage
            key={message.id}
            role={message.role}
            content={message.content}
            citations={message.citations}
          />
        ))}
      </div>

      <form className="chat-form" onSubmit={submit}>
        <input
          value={draft}
          onChange={(event) => setDraft(event.target.value)}
          placeholder="Ask Git-Mind about this failure..."
          disabled={!pr}
        />
        <button type="submit" disabled={!pr}>Ask</button>
      </form>

      <div className="pr-actions">
        <button type="button">Review AI Fix</button>
        <button type="button" disabled={!readyToMerge}>
          {readyToMerge ? "Merge Fix" : "Await Approvals"}
        </button>
      </div>
    </aside>
  );
}

export default ChatDrawer;
