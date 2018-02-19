//=======================================================
// Store utility methods, constants and global variables 
//=======================================================
const _ = require('lodash');

exports.userToJson = function(userObject) {
  return _.pick(userObject, ['_id', 'email', 'firstname', 'lastname','gender', 'birthday', 'phone', 'imageUrl',
   'street', 'apt', 'city', 'state', 'country', 'zip', 'ssn']);
};

exports.sourceToJson = function(sourceObject) {
  return _.pick(sourceObject, ['_id', 'sourceName']);
};