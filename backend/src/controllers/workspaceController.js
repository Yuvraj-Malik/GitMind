const {
  listActivity,
  listAiLogs,
  listBranches,
  listPullRequests,
} = require("../services/dbService");

async function getPullRequests(req, res, next) {
  try {
    res.json(await listPullRequests(req.query.repositoryId));
  } catch (error) {
    next(error);
  }
}

async function getBranches(req, res, next) {
  try {
    res.json(await listBranches(req.query.repositoryId));
  } catch (error) {
    next(error);
  }
}

async function getActivity(req, res, next) {
  try {
    res.json(await listActivity());
  } catch (error) {
    next(error);
  }
}

async function getAiLogs(req, res, next) {
  try {
    res.json(await listAiLogs());
  } catch (error) {
    next(error);
  }
}

module.exports = { getAiLogs, getActivity, getBranches, getPullRequests };
