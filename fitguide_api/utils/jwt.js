const jwt = require('jsonwebtoken');

const TOKEN_TTL = '7d';

/**
 * JWT_SECRET is required. There is deliberately no fallback value: a default
 * secret would let anyone who has read this code mint valid tokens.
 */
function getSecret() {
  const secret = process.env.JWT_SECRET;
  if (!secret || secret.length < 32) {
    throw new Error('JWT_SECRET must be set to a random string of at least 32 characters (see .env.example).');
  }
  return secret;
}

const signToken = (userId) => jwt.sign({ id: String(userId) }, getSecret(), { expiresIn: TOKEN_TTL });

const verifyToken = (token) => jwt.verify(token, getSecret());

module.exports = { getSecret, signToken, verifyToken };
