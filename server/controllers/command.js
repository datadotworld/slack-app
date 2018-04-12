const User = require("../models").User;
const { slack } = require("../api/slack");
const { auth } = require("./auth");

const commands = {
  "/test": "Test message received successfully"
};

const command = {
  test(req, res) {
    // respond to request immediately no need to wait.
    res.json({ response_type: "in_channel" });
    // Authenticate the Slack user
    // An assumption is being made: all commands require authentication
    // check association status
    auth.checkSlackAssociationStatus(req.body.user_id, (error, isAssociated) => {
        let message;
        if (error) { // An internal error has occured send a descriptive message
          message = `Sorry <@${req.body.user_id}>, we're unable to process command \`${req.body.command}\` right now. Kindly, try again later.`;
        } else {
          if (isAssociated) { // User is associated, carry on and process command
            // Execution of command
            message = commands[req.body.command] || `Cannot understand the command: \`${req.body.command}\``;
          } else {
            // User is not associated begin association process.
            message = `Sorry <@${req.body.user_id}>, you cannot run \`${req.body.command}\` until after you authenticate. I can help you, just check my DM for the next step, and then you can try the command again.`; 
            auth.beginSlackAssociation(req.body.user_id, req.body.user_name, req.body.team_id);
          }
        }
        if(message) {
          let data = { response_type: "in_channel", text: message };
          slack.sendResponse(req.body.response_url, data);
        }
      });
  }
};

module.exports = { command };