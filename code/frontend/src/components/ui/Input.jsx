function Input(props) {
  return (
    <input
      {...props}
      style={{
        width: "100%",
        border: "1px solid #b0c5ca",
        borderRadius: "8px",
        padding: "0.55rem 0.7rem",
      }}
    />
  );
}

export default Input;
