import React from 'react';
import { Component } from 'react';
import './Success.css';

class Success extends Component {
    render() {
        return (
            <div className="Success-icon-div">
                <i className="fa fa-check-circle Success-icon"></i>
                <h1 className="Success-icon-text">Success</h1>
            </div>
        );
    }
}

export default Success;