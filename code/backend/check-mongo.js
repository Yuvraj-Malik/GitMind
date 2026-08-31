require('dotenv').config({ path: '../.env' });
const mongoose = require('mongoose');
const AILog = require('../shared/src/models/AILog');

async function checkMongo() {
  try {
    await mongoose.connect('mongodb://admin:admin123@localhost:27017/gitmind?authSource=admin');
    const docs = await AILog.find({ filePath: { $regex: '08-stateful-bug' } }).lean();
    console.log("=== 08-stateful-bug logs ===");
    console.log(JSON.stringify(docs, null, 2));
    process.exit(0);
  } catch(e) {
    console.error(e);
    process.exit(1);
  }
}

checkMongo();
