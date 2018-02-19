const redis = require('redis');
const url = require('url');
const cacheExpiry = 21600; //seconds equivalent of 6 hours

let client = null;

if (!process.env.REDISCLOUD_URL) {
  // Dev redis config
  const redisURL = url.parse(process.env.REDIS_LOCAL_ADDRESS);
  client = redis.createClient();
} else {
  const redisURL = url.parse(process.env.REDISCLOUD_URL);
  client = redis.createClient(redisURL.port, redisURL.hostname, { no_ready_check: true });
  client.auth(redisURL.auth.split(":")[1]);
}

exports.getValueFromCache = (key, callback) => {
  client.exists(key, function(err, reply) {
    if (reply === 1) {
      client.get(key, function(error, result) {
        if (error) {
          console.error('Error: ' + error);
          callback(error, null);
        } else {
          callback(null, result);
        }
      });
    } else {
      callback(null, null);
    }
  });
}

exports.setValueInCache = (key, value, callback) => {
  // set key in redis keystore
  client.set(key, JSON.stringify(value));
  client.expire(key, cacheExpiry);
  callback(true)
}
