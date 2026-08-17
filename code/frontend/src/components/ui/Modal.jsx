function Modal({ open, title, children }) {
  if (!open) return null;
  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        display: "grid",
        placeItems: "center",
        background: "rgba(0,0,0,0.35)",
      }}
    >
      <div
        style={{
          width: "min(540px, 92vw)",
          background: "#ffffff",
          borderRadius: "14px",
          padding: "1rem",
        }}
      >
        <h3 style={{ marginTop: 0 }}>{title}</h3>
        {children}
      </div>
    </div>
  );
}

export default Modal;
