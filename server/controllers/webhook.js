const webhook = {
  process(req, res) {
    console.log('Incoming DW webhook event : ', req.body);
    res.status(200).send("Success");
  }
};
module.exports = { webhook };