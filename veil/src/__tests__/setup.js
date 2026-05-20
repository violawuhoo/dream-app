// Polyfill crypto.randomUUID for Jest/Node environment
if (!global.crypto) {
  global.crypto = {};
}
if (!global.crypto.randomUUID) {
  const { randomUUID } = require("crypto");
  global.crypto.randomUUID = randomUUID;
}
