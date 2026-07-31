import GraphCanvas from "./features/canvas/GraphCanvas";
import ChatDrawer from "./features/chat-rag/ChatDrawer";
import LiveMetrics from "./features/pr-metrics/LiveMetrics";
import Sidebar from "./features/sidebar/Sidebar";

function App() {
  return (
    <div className="app-shell">
      <Sidebar />
      <main className="app-main">
        <section className="panel panel-canvas">
          <GraphCanvas />
        </section>
        <section className="panel panel-metrics">
          <LiveMetrics />
        </section>
      </main>
      <ChatDrawer />
    </div>
  );
}

export default App;
