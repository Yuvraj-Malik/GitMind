require('dotenv').config({ path: '.env' });
const { Octokit } = require('@octokit/rest');

const octokit = new Octokit({ auth: process.env.GITHUB_TOKEN });

async function check() {
  try {
    const { data } = await octokit.repos.getContent({
      owner: 'Yuvraj-Malik',
      repo: 'git-mind-test',
      path: 'bugs/02-off-by-one.js'
    });
    console.log("=== 02-off-by-one.js ===");
    console.log(Buffer.from(data.content, 'base64').toString('utf8'));
    
    const { data: data2 } = await octokit.repos.getContent({
      owner: 'Yuvraj-Malik',
      repo: 'git-mind-test',
      path: 'bugs/06-misleading-comment.js'
    });
    console.log("=== 06-misleading-comment.js ===");
    console.log(Buffer.from(data2.content, 'base64').toString('utf8'));
  } catch (e) {
    console.error(e.message);
  }
}
check();
