import apiClient from "./apiClient";

export async function fetchRepositories() {
  const response = await apiClient.get("/repos");
  return response.data;
}

export async function fetchRepositoryCommits(repositoryId) {
  const response = await apiClient.get(`/repos/${repositoryId}/commits`);
  return response.data;
}

export async function enqueueChatQuestion({ question, repositoryId }) {
  const response = await apiClient.post("/chat", {
    question,
    repositoryId,
  });
  return response.data;
}
