import React, { Component } from 'react';
import { Route, Switch } from 'react-router-dom';
import Home from './Home';
import Auth from './Auth';
import logo from './logo.svg';
import './App.css';

class App extends Component {

  render() {
    return (
      <Switch>
        <Route exact path="/" component={Home}/>
        <Route exact path="/oauth/code_callback" component={Auth}/>
      </Switch>
    );
  }
}

export default App;
