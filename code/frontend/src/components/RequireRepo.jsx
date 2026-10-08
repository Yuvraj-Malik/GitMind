import { FolderGit2, Plus } from "lucide-react";
import { useNavigate } from "react-router-dom";
import useStore from "../store";
import { useActiveRepo } from "../lib/hooks";
import { Card, Empty, Loading, PageHeader } from "./ui";

/** Renders children(repo) for the selected repository, or a prompt to connect one. */
export default function RequireRepo({ title, children }) {
  const loaded = useStore((s) => s.reposLoaded);
  const repo = useActiveRepo();
  const navigate = useNavigate();
  if (!loaded) return <Loading />;
  if (!repo) {
    return (
      <>
        <PageHeader title={title} />
        <Card>
          <Empty icon={FolderGit2} title="No repository connected" hint="Connect one of your GitHub repositories to see its pull requests, branches and AI fixes.">
            <button className="btn btn-primary mt-2" onClick={() => navigate("/repos")}><Plus size={14} /> Connect a repository</button>
          </Empty>
        </Card>
      </>
    );
  }
  return children(repo);
}
