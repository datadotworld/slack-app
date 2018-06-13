import React from "react";
import QueryString from "query-string";
import { Component } from "react";
import axios from "axios";

import "./Auth.css";
class Auth extends Component {
  // Fetch passwords after first mount
  componentDidMount() {
    const parsed = QueryString.parse(window.location.search);
    this.exchangeCode(parsed.code, parsed.state);
  }

  exchangeCode = (code, state) => {
    axios
      .get("/api/v1/auth/exchange?code=" + code + "&state=" + state)
      .then(response => {
        const { statusText, data } = response;

        return statusText === "OK"
          ? this.redirectSuccess(data.url)
          : this.redirectFailed();
      })
      .catch(function(error) {
        console.log(error);
      });
  };

  redirectSuccess = url => {
    window.location = url;
  };

  redirectFailed = () => {
    this.props.history.push("/failed");
  };

  render() {
    return (
      <div className="Auth-loader-div">
        <i className="fa fa-spinner fa-spin fa-3x fa-fw Auth-loader-icon" />
        <span className="sr-only">Loading...</span>
      </div>
    );
  }
}

export default Auth;
