function Card({ title, children }) {
  return (
    <section
      style={{
        border: "1px solid #d2dde0",
        borderRadius: "12px",
        background: "rgba(255,255,255,0.92)",
        padding: "0.8rem",
      }}
    >
      {title ? <h3 style={{ marginTop: 0 }}>{title}</h3> : null}
      {children}
    </section>
  );
}

export default Card;
