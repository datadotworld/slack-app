import React, { Component } from 'react';
import { Route, Switch } from 'react-router-dom';

import Home from './HomeView/Home';
import Auth from './AuthView/Auth';

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
