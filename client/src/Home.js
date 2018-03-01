import React, { Component } from 'react';
import { Route, Switch } from 'react-router-dom';
import logo from './logo.svg';
import './App.css';

class Home extends Component {
  state = { users: [] }

  // Fetch passwords after first mount
  componentDidMount() {
    this.getUsers();
  }

  getUsers = () => {
    // Get the passwords and store them in state
    console.log("get users was called.");
    return fetch('/api/v1/users')
      .then(res => res.json())
      .then(users => this.setState({ users }));
  }

  render() {
    const { users } = this.state;
    console.log("users : " + users);
    return (
      <div className="App">
        <header className="App-header">
          <img src={logo} className="App-logo" alt="logo" />
          <h1 className="App-title">Welcome to data.world Slack App</h1>
        </header>
        <p className="App-intro">
          To get started, edit <code>src/App.js</code> and save to reload.
        </p>
      </div>
    );
  }
}

export default Home;