import React from 'react';
import { Component } from 'react';
import './Failed.css';

class Failed extends Component {
    render() {
        return (
            <div className="Failed-icon-div">
                <i className="fa fa-exclamation-circle Failed-icon"></i>
                <h1 className="Failed-icon-text">Failed</h1>
            </div>
        );
    }
}

export default Failed;