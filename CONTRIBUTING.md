# Data.world Slack Application

## Setup and configuration

#### 1. Repo setup
    1. git clone https://github.com/datadotworld/slack-app
    2. From the project root dir : run npm install && cd server && npm install

#### 2. Postgres config (https://launchschool.com/blog/how-to-install-postgresql-on-a-mac)
    1. Install Postgres : brew install postgres
    2. Start Postgres using : brew services start postgresql
    3. Open postgres shell : psql postgres
    4. Create database slackapp in postgres : CREATE DATABASE slackapp

#### 3. DW Oauth Client configuration
    1. Create an oauth client on DW
    2. Add the following allowed roles : user_api_read, user_api_write, user_api_hooks
    3. Set webhook active field to : true
    4. Set the value of redirect_url to :  <ngrok or localhost>/oauth/code_callback

#### 4. Create slack app

    Under features section in the left panel, configure each of the following :
     
    1. Slash Commands 
        a. Click create new command 
        b. Fill the form with the data below and save.
            i. Command : /data.world
            ii. Request url : <ngrok or localhost>/api/v1/command/
            iii. Enable Escape channels, users, and links sent to your app 
    2. Oauth & Permission 
        a. Add new redirect url : <ngrok or localhost>/api/v1/auth/oauth
        b. Click save urls
        c. Add the following scopes : bot, commands, link:read, link:write
        d. Click save changes
    3. Add Bot user 
        a. Set display name and default name to : dataworld
        b. Enable : Always show my bot as online
    4. Event Subscriptions 
        a. Enable events 
        b. Add request url, this require passing a challenge (We'll skip this step for now and add later when the app 
        is up and running)
        c. Add workspace event : link_shared
        d. Add app unfurl domain : data.world
        h. Add bot events : link_shared, member_joined_channel
        i. Click save changes

#### 5. Add env variables 
    1. Create a .env file in the project /server directory.
    2. Add and set value of the following env variables :
    
        The following can be copied from basic information section in slack app settings: 
        
        SLACK_APP_ID= slack app id
        SLACK_CLIENT_ID= slack client id
        SLACK_CLIENT_SECRET= slack client secret
        SLACK_VERIFICATION_TOKEN= slack verification token
        SLACK_OAUTH_ACCESS_URL= https://slack.com/api/oauth.access

        The following should be copied from the install app settings section.

        SLACK_TEAM_TOKEN= slack team oauth access token e.g xoxp-215****...
        SLACK_BOT_TOKEN= slack bot user oauth token e.g xoxb-322****...

        PORT= node server port (defaults to 5000)
        PG_USERNAME= Postgres username
        PG_PASSWORD= Postgres password
        PG_DATABASE= Postgres database name(slackapp)
        DW_BASE_URL= https://api.data.world/v0
        
        AUTH_URL= DW auth url (e.g https://data.world/embed/oauth-authorize
        ?client_id=<Your DW client_id>
        &redirect_uri=<ngrok or localhost>/oauth/code_callback
        &state=)
        
        ACCESS_TOKEN_URL=  DW access token request url (e.g https://data.world/oauth/access_token
        ?client_id=<Your DW client_id>
        &client_secret=<Your DW client_secret>
        &grant_type=authorization_code
        &code=)

#### 6. Run the application
    1. From the project root dir run : npm start

#### 7. Event subscription request url
    1. Go to slack app settings page 
    2. Go to event subscription section
    3. Enable events 
    3. Add request url <ngrok or localhost>/api/v1/unfurl/action (Challenge should be successful).
    4. Click save changes.

#### 8. Install app in workspace
    1. Go to slack app settings page 
    2. Go to event install app section
    3. Click install application button.
