const fs = require("fs");

function readSecretFile(path) {
  if (!path) return "";
  return fs.readFileSync(path, "utf8").trim();
}

function getApiKey() {
  return readSecretFile(process.env.API_KEY_FILE);
}

function getRedisUrl() {
  if (process.env.REDIS_URL_FILE) {
    return readSecretFile(process.env.REDIS_URL_FILE);
  }
  if (process.env.REDIS_PASSWORD_FILE) {
    return `redis://:${readSecretFile(process.env.REDIS_PASSWORD_FILE)}@redis:6379/3`;
  }
  return "redis://localhost:6379/3";
}

module.exports = {
  getApiKey,
  getRedisUrl,
};
