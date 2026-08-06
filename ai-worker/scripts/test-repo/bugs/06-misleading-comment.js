// Converts an object of {id, name} to an object of {userId, userName}.
function formatUser(user) {
  return {
    userId: user.id,
    userName: user.name
  };
}
module.exports = { formatUser };