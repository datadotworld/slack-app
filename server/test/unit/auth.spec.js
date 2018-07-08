const { auth } = require("../../controllers/auth");

describe("jasmine-node", function() {
  it("should multiply 3 and 5", function() {
    var product = auth.multiply(3, 5);
    expect(product).toBe(15);
  });
});
