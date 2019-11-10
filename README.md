# Ghost CMS running as Azure Web App

Automation for initial and continuous deployment of ghost CMS within a Azure WebApp (aka AppService).

## Motivation

Why yet another "ghost on Azure" repo? Most of the existing examples are pretty good to get a
ghost blob up and running. But they all suffer from shortcomings by being too manual and hard to update.
This implementation tries to improve on that:

- Once the WebApp is setup for [Continuous Deployment (CD)](https://docs.microsoft.com/en-us/azure/app-service/app-service-continuous-deployment),
pushing to the repo will trigger the initial deployment from this repo.
- Site specific content is kept in a separate folder next to the ghost app itself.
This makes updates to newer ghost releases safer.
- The deployment script doesn't depend on a ghost release checked in to this repo.
Instead, it pulls the ghost zip file from ghost's official drop point on their github
- Re-deployments are idempotent, i.e. the existing blog/site specific files and database are not clobbered.

## Installation

- clone this repo
- create an Azure WebApp with a Windows VM AppService plan (a free F1 or ~$10 p/m D1 size will do for smaller sites) **TODO**: to be automated soon
- in the Azure portal, setup [Continuous Deployment](https://docs.microsoft.com/en-us/azure/app-service/app-service-continuous-deployment) **TODO**: to be automated soon
- site is deployed and a ghost DB is initialized
- navigate to your new blog: https://mynewblog.azurewebsites.com
- configure your blog at the admin pages:  https://mynewblog.azurewebsites.com/ghost
- make any configuration changes in your repo, and push to origin -> triggers a re-deployment

## Why not ghost-cli?

Since ghost v1.x, the officially recommended deployment is [Ghost CLI](https://docs.ghost.org/docs/ghost-cli).
It does nicely address the re-deployment and separation concerns mentioned above.
But the Ghost CLI (although runnable on Windows), does not play well on Windows since it is currently built with
several Linux/macOS assumptions (e.g. systemd as nodejs runner).

This repo is using a similar structure, separating the site-specific content (images, database, themes) from the actual
ghost server code. This makes updating to newer ghost release straightforward and safe.

## General design and approach

Scripts and flows need to be idempotent: are used to initialize with no resources up,
but can also be used to run ghost updates or roll secrets. In the latter scenario,
ghost bits under app are swapped out, but the site-specific content under mycontent
will remain untouched.

### deploy script called inside WebApp node

- call yarn to determine latest release ghost package: yarn info ghost dist-tags.latest
- download release zip from ghost's github:
    https://github.com/TryGhost/Ghost/releases/download/$latestVersion/Ghost-$latestVersion.zip
- unzip it into 'app' folder
- install ghost's dependencies with: yarn install --prod --non-interactive --no-progress --cwd app
- populate 'mycontent' folder with its data, images, logs, settings, themes subfolders required by ghost
- copy over default theme 'casper' to mycontent/themes
- finalize config.production.json settings, e.g. abs path for contentPath or port; inject secrets from KeyVault
- ensure/create sqlite3 ghost db
- install ghost storage extension for azure blob storage

### Azure resources (**TODO**)

Using ARM template files:

- create resources like storage account, server farm (AppServicePlan)
- create KeyVault for mailgun api key/secrets and blob storage keys/SAS token
- create Web App with AppInsights
- create CDN with custom domain in front of web app url, add TLS termination
- create WebJobs to run DB backups and blob storage backups
