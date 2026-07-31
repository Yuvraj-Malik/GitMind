import CitationLink from "./CitationLink";

function ChatMessage({ role, content, citations = [] }) {
  return (
    <article className={`chat-message ${role === "assistant" ? "assistant" : "user"}`}>
      <strong>{role === "assistant" ? "Git-Mind AI" : "You"}</strong>
      <p>{content}</p>
      {citations.length > 0 ? (
        <div className="citation-row">
          {citations.map((citation) => (
            <CitationLink
              key={`${citation.filePath}-${citation.line}`}
              filePath={citation.filePath}
              line={citation.line}
            />
          ))}
        </div>
      ) : null}
    </article>
  );
}

export default ChatMessage;
