# ghost CMS running as Azure Web App

Bootstrap to install and configure ghost CMS within an [Azure Web App](https://docs.microsoft.com/en-us/azure/app-service/app-service-web-get-started-nodejs).

This repo can be setup as [Continuous Deployment (CD)](https://docs.microsoft.com/en-us/azure/app-service/app-service-continuous-deployment) within an Azure Web App

## General flow

Scripts and flows need to be idempotent: are used to initialize with no resources up,
but can also be used to run ghost updates or roll secrets. In the latter scenario,
ghost bits under app are swapped out, but the site-specific content under mycontent
will remain untouched.

### Azure resources

Using ARM template files:

- create resources like storage account, server farm (AppServicePlan)
- create KeyVault for mailgun api key/secrets and blob storage keys/SAS token
- create Web App with AppInsights
- create CDN with custom domain in front of web app url, add TLS termination
- TODO: create WebJobs to run DB backups (and blob storage backups)

### Bootstrap inside Web App node

- npm call to determine latest ghost package: npm info ghost dist-tags.latest
- download release zip from ghost's github:
    https://github.com/TryGhost/Ghost/releases/download/$latestVersion/Ghost-$latestVersion.zip
- unzip it into 'app' folder
- install ghost's dependencies with: yarn install --prod --non-interactive --no-progress --cwd app
- ensure/create 'mycontent' folder with its data, images, logs, settings, themes subfolders required by ghost
- ensure/copy over default theme 'casper' to mycontent/themes
- finalize config.production.json settings, e.g. abs path for contentPath or port; inject secrets from KeyVault
- ensure/create sqlite3 ghost db
- install ghost storage extension for azure blob storage
