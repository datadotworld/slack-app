import React from 'react';
import { Component } from 'react';
import './Auth.css';
class Auth extends Component {
    // Fetch passwords after first mount
    componentDidMount() {
        let code = this.getUrlParameter("code");
        let state = this.getUrlParameter("state");
        this.exchangeCode(code, state);
    }

    getUrlParameter = (name) => {
        name = name.replace(/[\[]/, '\\[').replace(/[\]]/, '\\]');
        let regex = new RegExp('[\\?&]' + name + '=([^&#]*)');
        let results = regex.exec(window.location.search);
        return results === null ? '' : decodeURIComponent(results[1].replace(/\+/g, ' '));
    }

    exchangeCode = (code, state) => {
        // Get the passwords and store them in state
        console.log("exchangeCode was called.");
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