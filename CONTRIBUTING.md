# Data.world Slack Application

## Setup and configuration

#### 1. Repo setup

    1. git clone https://github.com/datadotworld/slack-app
    2. From the project root dir : run yarn (This will install all necessary project depenedencies)

#### 2. Postgres config (https://launchschool.com/blog/how-to-install-postgresql-on-a-mac)

    1. Install Postgres : brew install postgres
    2. Start Postgres using : brew services start postgresql
    3. Open postgres shell : psql postgres
    4. Create database slackapp in postgres : CREATE DATABASE slackapp
    5. Quit postgres shell : \q

#### 3. Download and configure Ngrok

    1. Follow instructions [here](https://ngrok.com/download) to setup ngrok.
    2. Bind ngrok to port 5000 : ./ngrok http 5000
    3. keep you ngrok url handy

#### 4. DW Oauth Client configuration

    1. Create an oauth client on DW
    2. set "allowedRoles" field to : [ "user_api_read", "user_api_write", "user_api_hooks", "user_api_offline" ]
    3. Set "webhookActive" field to : true
    4. Set the value of "redirect_url" to :  <ngrok url>/oauth/code_callback
    5. Set the value of "webhookUrl" to: <ngrok url>/api/v1/webhook/dw/events

#### 5. Create slack app

    A. Goto https://api.slack.com/apps
    B. Click create slack app button (positioned top right corner)

    C. Under features section in the left panel, configure each of the following :

        1. Interactive Components

            a. Enable Interactivity
            b. Add request url, this require passing a challenge (We'll skip this step for now and add later when the app is up and running)

        1. Slash Commands 

            a. Click create new command 
            b. Fill the form with the data below and save.
                i.  Command : /data.world (you can use any text here, not necessarily data.world)
                ii. Request url : <ngrok url>/api/v1/command/
                iii.Add a short description of the command.
                iv. Enable Escape channels, users, and links sent to your app 

        2. Oauth & Permission 

            a. Add new redirect url : <ngrok url>/api/v1/auth/oauth
            b. Click save urls
            c. Add the following scopes : bot, commands, link:read, link:write, chat:write:bot
            d. Click save changes

        3. Add Bot user 

            a. Set display name and default name to : dataworld (you can use any text here, not necessarily data.world)
            b. Enable : Always show my bot as online

        4. Event Subscriptions 

            a. Enable events 
            b. Add request url, this require passing a challenge (We'll skip this step for now and add later when the app is up and running)
            c. Add workspace event : link_shared, app_uninstalled
            d. Add bot events : link_shared, member_joined_channel
            e. Add app unfurl domain : data.world
            f. Click save changes

#### 6. Add env variables 

    1. Create a .env file in the project directory.

    2. Set slack env variables :
    
        The following can be copied from basic information section in slack app settings: 
        
        SLACK_APP_ID= slack app id
        SLACK_CLIENT_ID= slack client id
        SLACK_CLIENT_SECRET= slack client secret
        SLACK_VERIFICATION_TOKEN= slack verification token
        SLASH_COMMAND=data.world (The slash command text for this app)

        SLACK_TEAM_TOKEN & SLACK_BOT_TOKEN should be added to the .env file with no values yet(we'll come back to them).

        SLACK_TEAM_TOKEN= (only required When app is installed as internal integration.)
        SLACK_BOT_TOKEN= (only required When app is installed as internal integration.)
    
    3. Set data.world env variables :

        DW_BASE_URL=https://api.data.world/v0
        DW_CLIENT_ID= (client id from the DW Oauth Client created earlier in step 4.)
        DW_CLIENT_SECRET= (client secret from the DW Oauth Client created earlier in step 4.)
        DW_AUTH_BASE_URL=https://data.world/oauth/authorize
        DW_GET_TOKEN_BASE_URL=https://data.world/oauth
        DW_REDIRECT_URI= <ngrok url>/oauth/code_callback

    4. Set Other env variables :

        PORT= node server port (defaults to 5000, if you decide to use a different port number, please revisit your ngrok config and ensure it's listening on the same port you've choosen.)
        PG_USERNAME= Postgres username
        PG_PASSWORD= Postgres password
        PG_DATABASE=slackapp  (Postgres database name, ensure it correlates with database created earlier in step 2 above.)

#### 7. Start the server

    1. From the project root dir run : yarn dev (server should build and start on port 5000 or any other port you decide to go with)

#### 8. Event subscription & Interactive Components request url

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

#### 9. Install and Run app in workspace

    We can install this app either as a custom integration in our current workspace or using the Add to Slack button to directly install it into current workspace (This is how it will be installed by end users).

    A. Install as custom integration in current workspace
        
        1. Go to slack app settings page 
        2. Go to Install app section
        3. Click install application button.
        4. Copy the "OAuth Access Token" and use it as the value of SLACK_TEAM_TOKEN in .env
        5. Copy the "Bot User OAuth Access Token" and use it as the value of SLACK_BOT_TOKEN in .env
        6. Shutdown the server and restart with "yarn start" / "yarn dev"

    B. Install as an integration in any workspace 

        1. Go to slack app settings page
        2. Go to manage distribution 
        3. Click Add to slack button and follow the prompt.

#### 10. Deploy to heroku
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

### 11. Running Test

    From the root directory run : yarn test

[![Deploy](https://www.herokucdn.com/deploy/button.svg)](https://heroku.com/deploy?template=https://github.com/datadotworld/slack-app/tree/master)
