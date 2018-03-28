import React from 'react';
import QueryString from 'query-string';
import { Component } from 'react';
import './Auth.css';
class Auth extends Component {
    // Fetch passwords after first mount
    componentDidMount() {
        const parsed = QueryString.parse(window.location.search);
        this.exchangeCode(parsed.code, parsed.state);
    }

    exchangeCode = (code, state) => {
        // Get the passwords and store them in state
        return fetch('/api/v1/auth/exchange?code=' + code + '&state=' + state)
            .then(res => res.ok)
            .then((success) => success ? this.redirectSuccess() : this.redirectFailed());
    }

    redirectSuccess = () => {
        this.props.history.push("/success");
    }

    redirectFailed = () => {
        this.props.history.push("/failed");
    }

    render() {
        return (
            <div className="Auth-loader-div">
                <i className="fa fa-spinner fa-spin fa-3x fa-fw Auth-loader-icon"></i>
                <span className="sr-only">Loading...</span>
            </div>
        );
    }
}

export default Auth;