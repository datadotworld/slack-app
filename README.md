# Slack-app
Data.World slack application.

### How it works

Once you've the app up and running and installed in your workspace (See CONTRIBUTING.md for setup instructions) you can perform the following actions :

       1. OAuth handshake / User binding
       2. Unfurling of Data.World links 
       3. Subscribe / Unsubscribe to Dataset, Project or Account using slash commands.

##### OAuth handshake / User account binding 

This means binding a user's slack account to his/her data.world account and there by giving data.world slack app the permission to perform 
read, write and webhook operations on behalf of the user.User can revoke permission at will from data.world [settings](https://data.world/settings/advanced) page.

Account binding is required to be able to run data.world slash commands. Hence, the data.world slack app will prompt the user
to complete Account binding any time he/she tries to use any of the available commands in slack.

##### Unfurling of Data.World links

Any data.world link pasted in a slack channel will be automatically unfurled, this requires at least one slack user in the workspace to have completed account binding.
For ambiguous urls like workspace url, the underlying dataset or project will be unfurled.

 
##### Subscribe / Unsubscribe to Dataset, Project or Account using slash commands

Using the `/data.world` user can perform a series of actions on a slack channel(private or public) where data.world bot is a member.
To make use of these slash commands, slack user must have completed account binding successfully. below is a list of commands and there description

1. _Subscribe to a data.world dataset :_ `/data.world subscribe [owner/datasetid]` 

2. _Subscribe to a data.world project._ : `/data.world subscribe [owner/projectid]`

3. _Subscribe to a data.world account._ : `/data.world subscribe [account]`

4. _Unsubscribe from a data.world dataset._ : `/data.world unsubscribe [owner/datasetid]`

5. _Unsubscribe from a data.world project._ : `/data.world unsubscribe [owner/projectid]`

6. _Unsubscribe from a data.world account._ : `/data.world unsubscribe [account]`

7. _List active subscriptions._ : `/data.world list`

8. _Show this help message_ : `/data.world help`
