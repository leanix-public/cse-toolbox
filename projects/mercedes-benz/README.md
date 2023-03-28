# Azure function: MercedesBenzWebhookListener

## Description

### Customer

Mercedes Benz

### Deployment

1. Requested resource group to team Hook (L3: Bernhard L.) via ticket https://leanix.atlassian.net/browse/HOOK-5146
 => <TBD: functions-eastus-prod-7 >
1. Followed this guide: https://leanix.atlassian.net/wiki/spaces/K8S/pages/763889686/Functions+deployment+into+Function+App+CSE
2. Note: authLevel shoud be "function" - https://leanix.atlassian.net/wiki/spaces/K8S/pages/7525007808/Azure+Functions+with+anonymous+authentication+level

### UseCase

The user wants to set the "mbgAppOperationalStatus" Application field to "deprecated" if the end of life date has been reached.

## Requirements

The following App Keys are required: "LXR_HOST" and "LXR_APITOKEN".
Without those keys defined, the webhook listener will return a "401 - Invalid credentials" error.

### Data model

The following field must be added to the **Application** data model:

| Key                      | Type          | inFacet | inView | Values                                                     |
| ------------------------ | ------------- | ------- | ------ | ---------------------------------------------------------- |
| mbgAppOperationalStatus  | SINGLE_SELECT | true    | true   | ["operational", "deprecated"]                              |


### Security

The azure function is secured by setting the "authLevel" option to "function", in the "function.json" file.
The function key generated in Azure needs to be added to the webhook target endpoint as a queryParam "code".
A full example looks like this:
https://functionapp.azurewebsites.net/api/WebHookListener?code=yDHg3qnzKJ-_7KVBzqOEJVTR4zcu7rlOrHgiqGEw3ZzyAzFuwWZdv-==

## References

### Target workspace

https://mercedes-benz.leanix.net/MercedesBenzDev (DE)

### Tickets

https://leanix.zendesk.com/agent/tickets/74076
https://leanix.atlassian.net/browse/HOOK-5146

