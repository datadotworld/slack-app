const User = require('../models').User;
const uuidv1 = require('uuid/v1');

const user = {
  create(req, res) {
    // for now we just create a user with a unique nonce.
    return User
      .create({
        nonce: uuidv1(),
      })
      .then(user => res.status(201).send(user)) // respond with the auth url + nonce slack message instead.
      .catch(error => res.status(400).send(error));
  },
  all(req, res) {
    // return mock users.
    res.json([{
      id: 1,
      username: "samsepi0l"
    }, {
      id: 2,
      username: "D0loresH4ze"
    }]);
  },
};

module.exports = { user };
