const User = require('../models').User;
const uuidv1 = require('uuid/v1');
const { dw } = require('../api/dw');

const slackBot = new SlackWebClient(process.env.SLACK_BOT_TOKEN);

const auth = {
  complete(req, res) {
    dw.exchangeAuthCode(req.query.code, (token) => {
      const nonce = req.query.state;
      if (token) {
        // use nonce to retrieve user 
        // Add returned token and expiry date to user model
        // redirect to success / homepage 
        User.findOne({ where: { nonce: nonce } })
          .then((user) => {
            user.update({ dwAccessToken: token }, { fields: ['dwAccessToken'] }).then(() => {
              console.log('Updated user dw token');
              res.send('success');
              //inform user via slack that authentication was successful
              slackBot.im.open(user.slackId)
                .then((res) => {
                  const dmChannelId = res.channel.id;
                  const slackMessage = slackBot.chat.postMessage(dmChannelId, 'Well, it\'s nice to meet you! Thanks for completing authentication.');
                  return Promise.all([slackMessage]);
                });
            });
          }).catch((error) => {
            console.log('Error updating user dw token');
            //redirect to failed auth page.
            res.send('failed');
          });
      } else {
        //redirect to failed auth page.
        res.send('failed');
      }
    });
  },
};

module.exports = { auth };
