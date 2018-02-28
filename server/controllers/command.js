const command = {
  process(req, res) {
    console.log(req.body);
    res.send('Success');
  },

}
module.exports = { command };
