import CitationLink from "./CitationLink";

function ChatMessage({ role, content }) {
  return (
    <article
      style={{
        border: "1px solid #d2dde0",
        borderRadius: "10px",
        padding: "0.65rem",
        background: role === "assistant" ? "#f8fcfd" : "#f3f6f7",
      }}
    >
      <strong>{role}</strong>
      <p style={{ marginBottom: "0.35rem" }}>{content}</p>
      <CitationLink filePath="backend/src/services/queueService.js" />
    </article>
  );
}

export default ChatMessage;
