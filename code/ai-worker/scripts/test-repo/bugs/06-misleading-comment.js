// Converts an object of {id, name} to an array of [id, name] pairs.
function formatUser(user) {
  // Bug: object doesn't have length, map won't work on object.
  // Comment says "array of [id, name] pairs" but usage in test expects { userId: id, userName: name }.
  return Object.keys(user).map(k => [k, user[k]]);
}
module.exports = { formatUser };