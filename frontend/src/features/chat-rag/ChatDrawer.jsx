import { useState } from "react";
import ChatMessage from "./ChatMessage";
import Input from "../../components/ui/Input";
import Button from "../../components/ui/Button";

function ChatDrawer() {
  const [question, setQuestion] = useState("");

  return (
    <aside
      style={{
        borderLeft: "1px solid #d2dde0",
        padding: "1rem",
        background: "#ffffff",
      }}
    >
      <h3 style={{ marginTop: 0 }}>Ask Git-Mind</h3>
      <div style={{ display: "grid", gap: "0.6rem" }}>
        <Input
          placeholder="Why did this PR fail?"
          value={question}
          onChange={(event) => setQuestion(event.target.value)}
        />
        <Button>Ask</Button>
        <ChatMessage role="assistant" content="RAG response preview appears here." />
      </div>
    </aside>
  );
}

export default ChatDrawer;
