function ErrorLogViewer() {
  return (
    <pre
      style={{
        margin: 0,
        borderRadius: "10px",
        border: "1px solid #d2dde0",
        background: "#0e1a1f",
        color: "#dbedf1",
        padding: "0.8rem",
        overflow: "auto",
        height: "100%",
      }}
    >
      {`TypeError: Cannot read properties of undefined (reading 'status')\n at services/dbService.js:23:14\n at processTicksAndRejections (node:internal/process/task_queues:95:5)`}
    </pre>
  );
}

export default ErrorLogViewer;
