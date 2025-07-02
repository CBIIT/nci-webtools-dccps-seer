/**
 * Calculates the dot product of two vectors.
 * @param {number[]} v1 - The first vector.
 * @param {number[]} v2 - The second vector.
 * @returns {number} The dot product of v1 and v2.
 */
function dotProduct(v1, v2) {
  let sum = 0;
  for (let i = 0; i < v1.length; i++) {
    sum += v1[i] * v2[i];
  }
  return sum;
}

/**
 * Calculates the magnitude (Euclidean norm) of a vector.
 * @param {number[]} v - The vector.
 * @returns {number} The magnitude of the vector.
 */
function magnitude(v) {
  return Math.sqrt(dotProduct(v, v));
}

/**
 * Calculates the cosine similarity between two vectors.
 * @param {number[]} v1 - The first vector.
 * @param {number[]} v2 - The second vector.
 * @returns {number} The cosine similarity between v1 and v2.
 */
function cosineSimilarity(v1, v2) {
  return dotProduct(v1, v2) / (magnitude(v1) * magnitude(v2));
}

module.exports = {
  dotProduct,
  magnitude,
  cosineSimilarity,
};
