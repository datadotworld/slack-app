/*
 * data.world Slack Application
 * Copyright 2018 data.world, Inc.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 *
 * This product includes software developed at
 * data.world, Inc. (http://data.world/).
 */
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
      .catch(error => {
        console.error(error);
        this.redirectFailed();
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
