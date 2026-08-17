function getActiveUsers(users) {
  return users.map(u => u.active === true);
}
module.exports = { getActiveUsers };