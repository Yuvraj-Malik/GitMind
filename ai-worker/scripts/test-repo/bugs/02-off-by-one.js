function sumArray(arr) {
  let sum = 0;
  for (let i = 0; i < arr.length; i++) { // Changed loop condition from i <= arr.length to i < arr.length
    sum += arr[i];
  }
  return sum;
}
module.exports = { sumArray };