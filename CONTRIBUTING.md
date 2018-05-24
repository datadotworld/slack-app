#Data.world Slack Application

##Setup and configuration

####1. Create slack app

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
    3. Event Subscriptions 
        a. Enable events 
        b. Add request url : <ngrok or localhost>/api/v1/unfurl/action
        c. Add workspace event : link_shared
        d. Add bot events : link_shared, member_joined_channel
        e. Add app unfurl domain : data.world
    4. Bot users 
        a. Set display name and default name as : dataworld
        b. Enable : Always show my bot as online
        c. User ID Translation
        d. Enable Translate Global IDs

####2. Add environment variables 
    1. Create a .env file in the project /server directory.
    2. Copy the content of example_env in the /server directory
    3. Paste it in the .env file created above.
    4. Update the values in the your .env 

####3. Postgres config 
    1. Install Postgres
    2. Install sequelize-cli
    3. Create database slackapp in postgres

####4. DW Oauth Client configuration
    1. Create an oauth client on DW
    2. Add the following allowed roles : user_api_read, user_api_write, user_api_hooks
    3. Set the value of redirect_url to :  <ngrok or localhost>/oauth/code_callback