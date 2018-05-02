

const getType = (event) => {
};

const webhook = {
  process(req, res) {
    console.log('Incoming DW webhook event : ', req.body);
    res.status(200).send();

    // get event type

    // process event based on type
  }
};
module.exports = { webhook };