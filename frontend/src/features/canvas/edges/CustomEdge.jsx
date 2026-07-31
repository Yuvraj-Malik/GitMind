import { BaseEdge } from "reactflow";

function CustomEdge(props) {
  return <BaseEdge {...props} style={{ strokeWidth: 2, stroke: "#1e5f74" }} />;
}

export default CustomEdge;
