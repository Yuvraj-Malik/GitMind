function fetchUserFromDB(id) {
  if (id === 1) return { id: 1, name: 'Alice' };
  throw new Error('User not found');
}
module.exports = { fetchUserFromDB };