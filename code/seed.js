const env = require("./backend/src/config/env");
const mongoose = require("mongoose");
const { Repository, PullRequest, AILog, User } = require("./shared");

async function seed() {
  const mongoUri = env.mongoUri;
  if (!mongoUri) {
    console.error("Error: MONGO_URI is not defined in .env");
    process.exit(1);
  }

  console.log(`[seed] Connecting to MongoDB Atlas: ${mongoUri.replace(/:([^@]+)@/, ":****@")}...`);
  await mongoose.connect(mongoUri);
  console.log("[seed] Connected successfully to MongoDB.");

  // 1. Ensure Indexes
  console.log("[seed] Initializing schema indexes...");
  await Promise.all([
    User.init(),
    Repository.init(),
    PullRequest.init(),
    AILog.init(),
  ]);

  // 2. Seed Repository with Commits & Branches
  console.log("[seed] Seeding repository...");
  let repo = await Repository.findOne({ name: "git-mind-test" });
  const sampleCommits = [
    {
      sha: "f1a8c3d",
      message: "feat: implement AI fixer webhook handler",
      author: "Yuvraj-Malik",
      branch: "main",
      createdAt: new Date(Date.now() - 3600 * 1000 * 24),
      updatedAt: new Date(Date.now() - 3600 * 1000 * 24),
    },
    {
      sha: "b7e2d9a",
      message: "fix(agent): handle off-by-one boundary condition",
      author: "git-mind-ai",
      branch: "ai/fix-pr-5",
      createdAt: new Date(Date.now() - 3600 * 1000 * 12),
      updatedAt: new Date(Date.now() - 3600 * 1000 * 12),
    },
    {
      sha: "c3d4e5f",
      message: "refactor: optimize MongoDB query indexing",
      author: "Yuvraj-Malik",
      branch: "feature/database-optimization",
      createdAt: new Date(Date.now() - 3600 * 1000 * 6),
      updatedAt: new Date(Date.now() - 3600 * 1000 * 6),
    },
  ];

  if (!repo) {
    repo = await Repository.create({
      name: "git-mind-test",
      owner: process.env.GITHUB_REPO_OWNER || "Yuvraj-Malik",
      url: `https://github.com/${process.env.GITHUB_REPO_OWNER || "Yuvraj-Malik"}/git-mind-test`,
      commits: sampleCommits,
    });
    console.log(`[seed] Created repository: ${repo.name} (${repo._id})`);
  } else {
    repo.commits = sampleCommits;
    await repo.save();
    console.log(`[seed] Updated existing repository: ${repo.name} (${repo._id})`);
  }

  // 3. Seed Pull Requests
  console.log("[seed] Seeding pull requests...");
  await PullRequest.findOneAndUpdate(
    { number: 5 },
    {
      repositoryId: repo._id,
      number: 5,
      title: "Fix off-by-one boundary error in loop",
      status: "open",
    },
    { upsert: true, new: true }
  );

  await PullRequest.findOneAndUpdate(
    { number: 8 },
    {
      repositoryId: repo._id,
      number: 8,
      title: "Resolve stateful memory leak in event listener",
      status: "failed",
    },
    { upsert: true, new: true }
  );

  // 4. Seed AI Logs
  console.log("[seed] Seeding AI activity logs...");
  const logCount = await AILog.countDocuments();
  if (logCount === 0) {
    await AILog.create([
      {
        jobId: "job-101",
        action: "Fix generated successfully",
        reasoning: "Detected array index boundary error. Generated patch replacing '<=' with '<'.",
        status: "success",
        repoName: "git-mind-test",
        branch: "ai/fix-pr-5",
        prUrl: "https://github.com/Yuvraj-Malik/git-mind-test/pull/5",
        filePath: "bugs/02-off-by-one.js",
        attempt: 1,
      },
      {
        jobId: "job-102",
        action: "LLM generation failed on stateful recursion",
        reasoning: "Fixer agent encountered timeout trying to reconcile circular state reference.",
        status: "failed",
        repoName: "git-mind-test",
        branch: "",
        prUrl: "",
        filePath: "bugs/08-stateful-bug.js",
        failedAt: "llm_generation",
        attempt: 3,
      },
    ]);
    console.log("[seed] Inserted initial AI activity logs.");
  } else {
    console.log(`[seed] AI logs already exist (${logCount} found).`);
  }

  console.log("\n✅ MongoDB database structure created and seeded successfully!");
  console.log("   - Collections: repositories, pullrequests, ailogs, users");
  console.log("   - Indexes verified");
  console.log("   - Initial data ready for dashboard display");

  await mongoose.disconnect();
  process.exit(0);
}

seed().catch((error) => {
  console.error("\n❌ [seed] Failed to seed MongoDB:", error.message);
  process.exit(1);
});
