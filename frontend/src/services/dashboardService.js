import apiClient from "./apiClient";

export async function fetchRepositories() {
  const response = await apiClient.get("/repos");
  return response.data;
}

export async function fetchRepositoryCommits(repositoryId) {
  const response = await apiClient.get(`/repos/${repositoryId}/commits`);
  return response.data;
}

export async function fetchBranches(repositoryId) {
  const response = await apiClient.get("/branches", { params: repositoryId ? { repositoryId } : undefined });
  return response.data;
}

export async function fetchPullRequests(repositoryId) {
  const response = await apiClient.get("/pull-requests", { params: repositoryId ? { repositoryId } : undefined });
  return response.data;
}

export async function fetchActivity() {
  const response = await apiClient.get("/activity");
  return response.data;
}

export async function fetchAiLogs() {
  const response = await apiClient.get("/ai/logs");
  return response.data;
}

export async function enqueueChatQuestion({ question, repositoryId }) {
  const response = await apiClient.post("/chat", {
    question,
    repositoryId,
  });
  return response.data;
}
