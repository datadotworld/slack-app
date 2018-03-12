import React, { Component } from 'react';
import { Route, Switch } from 'react-router-dom';

import Home from './HomeView/Home';
import Auth from './AuthView/Auth';
import Failed from './FailedView/Failed';
import Success from './SuccessView/Success';
class App extends Component {

  render() {
    return (
      <Switch>
        <Route exact path="/" component={Home}/>
        <Route path="/oauth/code_callback" component={Auth}/>
        <Route path="/failed" component={Failed}/>
        <Route path="/success" component={Success}/>
      </Switch>
    );
  }
}

export default App;
