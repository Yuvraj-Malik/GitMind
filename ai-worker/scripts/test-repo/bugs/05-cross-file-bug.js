const { fetchUserFromDB } = require('./shared-helper');
function getUserName(id) {
  const user = fetchUserFromDB(id);
  if (!user) {
    return 'Guest';
  }
  return user.name;
}
module.exports = { getUserName };