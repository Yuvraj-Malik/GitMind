function Sidebar() {
  return (
    <aside
      style={{
        padding: "1rem",
        borderRight: "1px solid #d2dde0",
        background: "#ffffff",
      }}
    >
      <h2 style={{ marginTop: 0 }}>Git-Mind</h2>
      <nav style={{ display: "grid", gap: "0.5rem" }}>
        <a href="#">Repositories</a>
        <a href="#">Pull Requests</a>
        <a href="#">Activity Feed</a>
      </nav>
    </aside>
  );
}

export default Sidebar;
