function Button({ children, onClick, type = "button" }) {
  return (
    <button
      type={type}
      onClick={onClick}
      style={{
        border: "1px solid #1e5f74",
        borderRadius: "10px",
        background: "#1e5f74",
        color: "#ffffff",
        padding: "0.55rem 0.9rem",
        cursor: "pointer",
      }}
    >
      {children}
    </button>
  );
}

export default Button;
