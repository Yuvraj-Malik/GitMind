const mongoose = require('mongoose');
const AILog = require('./shared/src/models/AILog');
const PullRequest = require('./shared/src/models/PullRequest');
const Repository = require('./shared/src/models/Repository');

async function seed() {
  await mongoose.connect('mongodb://admin:admin123@localhost:27017/gitmind?authSource=admin');
  
  // Seed repo
  let repo = await Repository.findOne({ name: 'git-mind-test' });
  if (!repo) {
    repo = await Repository.create({
      name: 'git-mind-test',
      owner: 'Yuvraj-Malik',
      url: 'https://github.com/Yuvraj-Malik/git-mind-test',
      commits: []
    });
  }

  // Seed PR 5 for off-by-one success
  const pr = await PullRequest.findOneAndUpdate(
    { number: 5 },
    {
      repositoryId: repo._id,
      number: 5,
      title: 'Fix off-by-one error',
      author: 'git-mind-ai',
      status: 'open',
      branch: 'ai/fix-pr-5',
      testsTotal: 1,
      testsPassed: 1,
      aiFixPr: 5,
      buildTime: '10s',
      securityScan: 'clean'
    },
    { upsert: true, new: true }
  );
  
  // Seed AILogs
  await AILog.create({
    status: 'success',
    repoName: 'git-mind-test',
    branch: 'ai/fix-pr-5',
    prUrl: 'https://github.com/Yuvraj-Malik/git-mind-test/pull/5',
    filePath: 'bugs/02-off-by-one.js',
    attempt: 1
  });

  await AILog.create({
    status: 'failed',
    repoName: 'git-mind-test',
    branch: '',
    prUrl: '',
    filePath: 'bugs/08-stateful-bug.js',
    failedAt: 'llm_generation',
    attempt: 3
  });

  console.log('Seeded DB');
  process.exit(0);
}

seed().catch(console.error);
