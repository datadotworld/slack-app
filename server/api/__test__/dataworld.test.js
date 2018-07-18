const dataworld = require("../dataworld");
const axios = require("axios");

const accessTokenUrl = `${process.env.DW_GET_TOKEN_BASE_URL}?client_id=${
  process.env.DW_CLIENT_ID
}&client_secret=${
  process.env.DW_CLIENT_SECRET
}&grant_type=authorization_code&code=`;
const headers = {
  Accept: "application/json",
  "Content-Type": "application/json"
};
const baseUrl = process.env.DW_BASE_URL;
const events = { events: ["ALL"] };

describe("Test dataworld api wrapper.", () => {

  it("should exchange authorization code for access token", done => {
    const authCode = "authCode";
    const requestUrl = `${accessTokenUrl}${authCode}`;

    axios.post = jest.fn(() => Promise.resolve());

    dataworld.exchangeAuthCode(authCode);

    expect(axios.post).toBeCalledWith(requestUrl, {}, { headers });

    done();
  });

  it("should get active DW user", done => {
    const token = "token";
    const requestUrl = `${baseUrl}/user`;
    const authHeader = headers;
    authHeader.authorization = `Bearer ${token}`;

    axios.get = jest.fn(() => Promise.resolve());

    dataworld.getActiveDWUser(token);

    expect(axios.get).toHaveBeenCalledWith(requestUrl, { headers: authHeader });

    done();
  });

  it("should get DW user", done => {
    const token = "token";
    const account = "dwAgent";
    const requestUrl = `${baseUrl}/users/${account}`;
    const authHeader = headers;
    authHeader.authorization = `Bearer ${token}`;

    axios.get = jest.fn(() => Promise.resolve());

    dataworld.getDWUser(token, account);

    expect(axios.get).toHaveBeenCalledWith(requestUrl, { headers: authHeader });

    done();
  });

  it("should get DW dataset", done => {
    const token = "token";
    const owner = "owner";
    const id = "id";
    const requestUrl = `${baseUrl}/datasets/${owner}/${id}`;
    const authHeader = headers;
    authHeader.authorization = `Bearer ${token}`;

    axios.get = jest.fn(() => Promise.resolve());

    dataworld.getDataset(id, owner, token);

    expect(axios.get).toHaveBeenCalledWith(requestUrl, { headers: authHeader });

    done();
  });

  it("should get DW project", done => {
    const token = "token";
    const owner = "owner";
    const id = "id";
    const requestUrl = `${baseUrl}/projects/${owner}/${id}`;
    const authHeader = headers;
    authHeader.authorization = `Bearer ${token}`;

    axios.get = jest.fn(() => Promise.resolve());

    dataworld.getProject(id, owner, token);

    expect(axios.get).toHaveBeenCalledWith(requestUrl, { headers: authHeader });

    done();
  });

  it("should get DW project", done => {
    const token = "token";
    const owner = "owner";
    const id = "id";
    const versionId = "versionId";
    const requestUrl = `${baseUrl}/projects/${owner}/${id}/v/${versionId}`;
    const authHeader = headers;
    authHeader.authorization = `Bearer ${token}`;

    axios.get = jest.fn(() => Promise.resolve());

    dataworld.getProjectByVersion(id, owner, versionId, token);

    expect(axios.get).toHaveBeenCalledWith(requestUrl, { headers: authHeader });

    done();
  });

  it("should get insight", done => {
    const token = "token";
    const owner = "owner";
    const id = "id";
    const projectId = "projectId";
    const requestUrl = `${baseUrl}/insights/${owner}/${projectId}/${id}`;
    const authHeader = headers;
    authHeader.authorization = `Bearer ${token}`;

    axios.get = jest.fn(() => Promise.resolve());

    dataworld.getInsight(id, projectId, owner, token);

    expect(axios.get).toHaveBeenCalledWith(requestUrl, { headers: authHeader });

    done();
  });

  it("should get insights", done => {
    const token = "token";
    const owner = "owner";
    const projectId = "projectId";
    const requestUrl = `${baseUrl}/insights/${owner}/${projectId}`;
    const authHeader = headers;
    authHeader.authorization = `Bearer ${token}`;

    axios.get = jest.fn(() => Promise.resolve());

    dataworld.getInsights(projectId, owner, token);

    expect(axios.get).toHaveBeenCalledWith(requestUrl, { headers: authHeader });

    done();
  });

  it("should get subscriptions", done => {
    const token = "token";
    const requestUrl = `${baseUrl}/user/webhooks`;
    const authHeader = headers;
    authHeader.authorization = `Bearer ${token}`;

    axios.get = jest.fn(() => Promise.resolve());

    dataworld.getSubscriptions(token);

    expect(axios.get).toHaveBeenCalledWith(requestUrl, { headers: authHeader });

    done();
  });

  it("should subscribe to dataset", done => {
    const token = "token";
    const owner = "owner";
    const id = "id";
    const requestUrl = `${baseUrl}/user/webhooks/datasets/${owner}/${id}`;
    const authHeader = headers;
    authHeader.authorization = `Bearer ${token}`;

    axios.put = jest.fn(() => Promise.resolve());

    dataworld.subscribeToDataset(owner, id, token);

    expect(axios.put).toHaveBeenCalledWith(requestUrl, events, {
      headers: authHeader
    });

    done();
  });

  it("should subscribe to project", done => {
    const token = "token";
    const owner = "owner";
    const id = "id";
    const requestUrl = `${baseUrl}/user/webhooks/projects/${owner}/${id}`;
    const authHeader = headers;
    authHeader.authorization = `Bearer ${token}`;

    axios.put = jest.fn(() => Promise.resolve());

    dataworld.subscribeToProject(owner, id, token);

    expect(axios.put).toHaveBeenCalledWith(requestUrl, events, {
      headers: authHeader
    });

    done();
  });

  it("should subscribe to account", done => {
    const token = "token";
    const id = "id";
    const requestUrl = `${baseUrl}/user/webhooks/users/${id}`;
    const authHeader = headers;
    authHeader.authorization = `Bearer ${token}`;

    axios.put = jest.fn(() => Promise.resolve());

    dataworld.subscribeToAccount(id, token);

    expect(axios.put).toHaveBeenCalledWith(requestUrl, events, {
      headers: authHeader
    });

    done();
  });

  it("should unsubscribe from dataset", done => {
    const token = "token";
    const owner = "owner";
    const id = "id";
    const requestUrl = `${baseUrl}/user/webhooks/datasets/${owner}/${id}`;
    const authHeader = headers;
    authHeader.authorization = `Bearer ${token}`;

    axios.delete = jest.fn(() => Promise.resolve());

    dataworld.unsubscribeFromDataset(owner, id, token);

    expect(axios.delete).toHaveBeenCalledWith(requestUrl, {
      headers: authHeader
    });

    done();
  });

  it("should unsubscribe from project", done => {
    const token = "token";
    const owner = "owner";
    const id = "id";
    const requestUrl = `${baseUrl}/user/webhooks/projects/${owner}/${id}`;
    const authHeader = headers;
    authHeader.authorization = `Bearer ${token}`;

    axios.delete = jest.fn(() => Promise.resolve());

    dataworld.unsubscribeFromProject(owner, id, token);

    expect(axios.delete).toHaveBeenCalledWith(requestUrl, {
      headers: authHeader
    });

    done();
  });

  it("should unsubscribe from account", done => {
    const token = "token";
    const id = "id";
    const requestUrl = `${baseUrl}/user/webhooks/users/${id}`;
    const authHeader = headers;
    authHeader.authorization = `Bearer ${token}`;

    axios.delete = jest.fn(() => Promise.resolve());

    dataworld.unsubscribeFromAccount(id, token);

    expect(axios.delete).toHaveBeenCalledWith(requestUrl, {
      headers: authHeader
    });

    done();
  });

  it("should verify valid dw token", async done => {
    const token = "token";
    const requestUrl = `${baseUrl}/user`;
    const authHeader = headers;
    authHeader.authorization = `Bearer ${token}`;

    axios.get = jest.fn(() => Promise.resolve({ data: {} }));

    const response = await dataworld.verifyDwToken(token);

    expect(axios.get).toHaveBeenCalledWith(requestUrl, { headers: authHeader });
    expect(response).toBeTruthy();
    done();
  });

  it("should verify invalid dw token", async done => {
    const token = "token";
    const requestUrl = `${baseUrl}/user`;
    const authHeader = headers;
    authHeader.authorization = `Bearer ${token}`;

    axios.get = jest.fn(() => Promise.reject(new Error("Test - Invalid token")));

    const response = await dataworld.verifyDwToken(token);

    expect(axios.get).toHaveBeenCalledWith(requestUrl, { headers: authHeader });
    expect(response).toBeFalsy();
    done();
  });
});
