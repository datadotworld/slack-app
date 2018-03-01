const User = require('../models').User;
const uuidv1 = require('uuid/v1');
const {dw} = require('../api/dw');

const auth = {
  complete(req, res) {
	dw.exchangeAuthCode(req.query.code, (token) => {
		const nonce = req.query.state;
		if (token) {
			// use nonce to retrieve user 
			// Add returned token and expiry date to user model
			// redirect to success / homepage 
			console.log(token);
			res.send('success');
		} 
		// else redirect to failed auth page.
	});   
  },
};

module.exports = { auth };
