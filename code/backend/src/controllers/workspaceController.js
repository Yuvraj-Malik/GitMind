const mongoose = require("mongoose");
const { Repository } = require("shared");
const { listActivity, listAiLogs } = require("../services/dbService");

async function userRepoIds(req) {
  const id = req.query.repositoryId;
  if (id && mongoose.isValidObjectId(id)) {
    const r = await Repository.findOne({ _id: id, connectedBy: req.user.id }).select("_id").lean();
    return r ? [r._id] : [];
  }
  return (await Repository.find({ connectedBy: req.user.id }).select("_id").lean()).map((r) => r._id);
}

async function getActivity(req, res, next) {
  try {
    res.json(await listActivity(await userRepoIds(req)));
  } catch (error) {
    next(error);
  }
}

/** AI runs for the selected repo (or all the user's repos) plus local sandbox runs. */
async function getAiLogs(req, res, next) {
  try {
    const ids = await userRepoIds(req);
    res.json(await listAiLogs({ $or: [{ repositoryId: { $in: ids } }, { repoName: "sandbox" }, { repositoryId: null, trigger: "manual", filePath: { $exists: true, $ne: "" } }] }));
  } catch (error) {
    next(error);
  }
}

module.exports = { getAiLogs, getActivity, userRepoIds };
