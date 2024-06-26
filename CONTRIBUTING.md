# Contributing Guidelines

## General

* Contributions of all kinds (issues, ideas, proposals), not just code, are highly appreciated.
* Pull requests are welcome with the understanding that major changes will be carefully evaluated 
and discussed, and may not always be accepted. Starting with a discussion is always best!
* All contributions including documentation, filenames and discussions should be written in English language.

## Issues

Our [issue tracker](https://github.com/datadotworld/slack-app/issues) can be used to report 
issues and propose changes to the current or next version of the data.world for Slack.

## Contribute Code

### Review Relevant Docs

* [data.world API](https://apidocs.data.world)
* <https://api.slack.com/>

### Set up machine

Install:

* NodeJS
* npm
* yarn

### Fork the Project

Fork the [project on Github](https://github.com/datadotworld/slack-app) and check out your copy.

```
git clone https://github.com/[YOUR_GITHUB_NAME]/slack-app.git
cd slack-app
git remote add upstream https://github.com/datadotworld/slack-app.git
```

### Install and Test

Ensure that you can build the project and run tests.

Install dependencies:
```bash
yarn
```

Run tests:
```bash
yarn test
```

### Create a Feature Branch

Make sure your fork is up-to-date and create a feature branch for your feature or bug fix.

```bash
git checkout main
git pull upstream main
git checkout -b my-feature-branch
```

### Write Tests

Try to write a test that reproduces the problem you're trying to fix or describes a feature that 
you want to build.

We definitely appreciate pull requests that highlight or reproduce a problem, even without a fix.

## Setup and configuration

#### 1. Postgres config (https://launchschool.com/blog/how-to-install-postgresql-on-a-mac)

    1. Install Postgres : brew install postgres
    2. Start Postgres using : brew services start postgresql
    3. Open postgres shell : psql postgres
    4. Create database slackapp in postgres : CREATE DATABASE slackapp;
    5. Quit postgres shell : \q

#### 2. Download and configure Ngrok

    1. Follow instructions [here](https://ngrok.com/download) to setup ngrok.
    2. Bind ngrok to port 5000 : ./ngrok http 5000
    3. keep you ngrok url handy

#### 3. DW Oauth Client configuration

    1. Create an oauth client on DW
    2. set "allowedRoles" field to : [ "user_api_read", "user_api_write", "user_api_hooks", "user_api_offline" ]
    3. Set "webhookActive" field to : true
    4. Set the value of "redirect_url" to :  <ngrok url>/oauth/code_callback
    5. Set the value of "webhookUrl" to: <ngrok url>/api/v1/webhook/dw/events

#### 4. Create slack app

    #### Create slack app using a manifest

        A. Go to https://api.slack.com/start/overview#creating

        B. Click on the `Create a Slack app` button

        C. Select create from app manifest option

        D. Copy and paste the content of manifest.yml in the root directory

        E. Update all url parameters to refelect your app domain. 

            1. Slash_commands url
            2. Oauth_config redirect_urls
            3. Event_subscriptions request_url
            4. Interactivity request_url

        F. Click Next and review the app configuration.

        G. Click Create

    #### Create slack app from the UI

        A. Go to https://api.slack.com/start/overview#creating

        B. Click on the `Create a Slack app` button

        C. Select create from scratch option

        D. Under features section in the left panel, configure each of the following :

            1. App Home 

                a. Go to App Home
                b. Set bot display and default name to : dataworld (you can use any text here, not necessarily data.world)
                c. Enable : Always show my bot as online
                d. Ensure Messages Tab is enabled.

            2. Org apps program
            
                a. Opt-In for the Org apps program, this will makes it easy for administrators to add our app across multiple workspaces in an enterprise organization.

            3. Interactive & Shortcut

                a. Enable Interactivity
                b. Add request url, this require passing a challenge (We'll skip this step for now and add later when the app is up and running)

            4. Slash Commands 

                a. Click create new command 
                b. Fill the form with the data below and save.
                    i.  Command : /data.world (you can use any text here, not necessarily data.world)
                    ii. Request url : <ngrok url>/api/v1/command/
                    iii.Add a short description of the command.
                    iv. Enable Escape channels, users, and links sent to your app 

            5. Oauth & Permission 

                a. Add new redirect url : <ngrok url>/api/v1/auth/oauth
                b. Click save urls
                c. Add the following scopes : channels:read, chat:write, commands, groups:read, im:history, im:read, im:write, links:read, links:write
                d. Click save changes

            6. Event Subscriptions 

                a. Enable events 
                b. Add request url, this require passing a challenge (We'll skip this step for now and add later when the app is up and running)
                c. Add workspace event : link_shared, app_uninstalled
                d. Add bot events : link_shared, member_joined_channel, message.im
                e. Add app unfurl domain : data.world
                f. Click save changes

#### 5. Add env variables 

    1. Create a .env file in the project directory.

    2. Set slack env variables :
    
        The following can be copied from basic information section in slack app settings: 
        
        SLACK_APP_ID= slack app id
        SLACK_CLIENT_ID= slack client id
        SLACK_CLIENT_SECRET= slack client secret
        SLACK_SIGNING_SECRET= slack signing secret
        SLASH_COMMAND=data.world (The slash command text for this app)

        SLACK_TEAM_TOKEN & SLACK_BOT_TOKEN should be added to the .env file with no values yet(we'll come back to them).

        SLACK_TEAM_TOKEN= (only required When app is installed as internal integration.)
        SLACK_BOT_TOKEN= (only required When app is installed as internal integration.)
    
    3. Set data.world oauth client env variables :

        DW_BASE_URL=https://api.data.world/v0
        DW_CLIENT_ID= (client id from the DW Oauth Client created earlier in step 4.)
        DW_CLIENT_SECRET= (client secret from the DW Oauth Client created earlier in step 4.)
        DW_AUTH_BASE_URL=https://auth.data.world/oauth/authorize
        DW_GET_TOKEN_BASE_URL=https://data.world/oauth/access_token
        DW_REDIRECT_URI= <ngrok url>/oauth/code_callback

    4. Set Other env variables :

        SERVER_PUBLIC_HOSTNAME= <ngrok url>

        PORT= node server port (defaults to 5000, if you decide to use a different port number, please revisit your ngrok config and ensure it's listening on the same port you've choosen.)
        DB_USER= Postgres username
        DB_PASS= Postgres password
        DB_NAME =slackapp  (Postgres database name, ensure it correlates with database created earlier in step 2 above.)

#### 6. Start the server

    1. From the project root dir run : yarn start-dev (server should build and start on port 8000 or any other port you decide to go with)

#### 7. Event subscription & Interactive Components request url (Not required if app was created with a manifest)

    1. Go to slack app settings page 
    2. Go to event subscription section
    3. Enable events 
    3. Add request url <ngrok url>/api/v1/unfurl/action (Challenge should be successful).
    4. Click save changes.

    Add request url for Interactive Components

    1. Go to interactive components section
    2. Ensure interactivity is enabled
    3. Add request url <ngrok url>/api/v1/command/action (Challenge should be successful).
    4. Click save changes.

#### 8. Install and Run app in workspace

    We can install this app either as a custom integration in our current workspace or using the Add to Slack button to directly install it into current workspace (This is how it will be installed by end users).

    A. Install as custom integration in current workspace
        
        1. Go to slack app settings page 
        2. Go to Install app section
        3. Click install application button.
        4. Copy the "OAuth Access Token" and use it as the value of SLACK_TEAM_TOKEN in .env
        5. Copy the "Bot User OAuth Access Token" and use it as the value of SLACK_BOT_TOKEN in .env
        6. Shutdown the server and restart with "yarn start-dev"

    B. Install as an integration in any workspace 

        1. Go to slack app settings page
        2. Go to manage distribution 
        3. Click Add to slack button and follow the prompt.

# Deploy to heroku (for testing)

    You can deploy to Heroku using the heroku deploy button but before that ensure you do the following:

    A. Goto https://api.slack.com/apps

    B. Click create slack app button (positioned top right corner).

    C. Click the heroku deploy button at the bottom of this doc .

    D. Fill in the environment variables, you can skip the DW_REDIRECT_URI and SLASH_COMMAND             variables for now.

    E. Go ahead and create a DW Oauth Client following step 4 above (Replacing <ngrok url> with <heroku app base url>)
    
    F. Go back and complete Slack app setup, See step 5c above. (Replacing <ngrok url> with <heroku app base url>) 

    G. Now, go to https://dashboard.heroku.com/apps/<your app name / id>/settings to add 
       DW_REDIRECT_URI and SLASH_COMMAND env variables. 
    
    H. Click Reveal Config Vars and set value for DW_REDIRECT_URI and SLASH_COMMAND env variables.

    I. Click the More button at the top right corner of the screen

    J. Select Restart all dynos. 

    You can now install the app by following the steps in 9b

[![Deploy](https://www.herokucdn.com/deploy/button.svg)](https://heroku.com/deploy?template=https://github.com/datadotworld/slack-app/tree/main)
