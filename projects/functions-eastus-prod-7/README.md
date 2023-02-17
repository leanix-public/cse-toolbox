# Azure function: CBrandsMaturityGapComputed

## Description

### Customer

Constellation Brands

### Deployment

1. Requested resource group to team Hook (L3: Bernhard L.) via ticket https://leanix.atlassian.net/browse/HOOK-4839 => functions-eastus-prod-7
2. Followed this guide: https://leanix.atlassian.net/wiki/spaces/K8S/pages/763889686/Functions+deployment+into+Function+App+CSE
3. Note: authLevel shoud be "function" - https://leanix.atlassian.net/wiki/spaces/K8S/pages/7525007808/Azure+Functions+with+anonymous+authentication+level

### UseCase

The user wants to compute the difference (maturityGap) between two single-select fields,
targetMaturity and currentMaturity, set for BusinessCapability factsheet type. The maturityGap is computed as an integer resulting from the absolute difference between the array indexes of targetMaturity and currentMaturity values. If any of targetMaturity or currentMaturity is null, then maturityGap becomes null as well.

| Value      | Index |
| ---------- | ----- |
| adhoc      | 0     |
| repeatable | 1     |
| defined    | 2     |
| managed    | 3     |
| optimized  | 4     |

E.g.:

1. targetMaturity = 'defined' and currentMaturity = 'adhoc', maturityGap = | 2 - 0 | = 2
2. targetMaturity = 'repeatable' and currentMaturity = 'defined', maturityGap = | 1 - 2 | = 1

## Requirements

The following App Keys are required: "LXR_HOST" and "LXR_APITOKEN".
Without those keys defined, the webhook listener will return a "401 - Invalid credentials" error.

### How to add App Keys?

1. Check this guide [here](https://learn.microsoft.com/en-us/cli/azure/functionapp/config/appsettings?view=azure-cli-latest#az-functionapp-config-appsettings-set).
2. App keys can be set via the Azure CLI. Examples:
   1. az functionapp config appsettings set --name <FUNCTION_APP_NAME> --resource-group <RESOURCE_GROUP_NAME> --settings "LXR_HOST=<YOUR_INSTANCE_HERE>"
   2. az functionapp config appsettings set --name <FUNCTION_APP_NAME> --resource-group <RESOURCE_GROUP_NAME> --settings "LXR_APITOKEN=<YOUR_APITOKEN_HERE>"
3. Or via the Azure web console by navigating to:
   1. The "Function App" view -> "Configuration" (on the left column, under the "Settings" section) -> "Application settings"

### Data model

The three following fields must be added to the **Business Capability** data model:

| Key             | Type          | inFacet | inView | Values                                                     |
| --------------- | ------------- | ------- | ------ | ---------------------------------------------------------- |
| targetMaturity  | SINGLE_SELECT | true    | true   | ["adhoc", "repeatable", "defined", "managed", "optimized"] |
| currentMaturity | SINGLE_SELECT | true    | true   | ["adhoc", "repeatable", "defined", "managed", "optimized"] |
| maturityGap     | SINGLE_SELECT | true    | true   | ["aligned", "low", "medium", "large", "max"]               |

### Security

The azure function is secured by setting the "authLevel" option to "function", in the "function.json" file.
The function key generated in Azure needs to be added to the webhook target endpoint as a queryParam "code".
A full example looks like this:
https://functionapp.azurewebsites.net/api/WebHookListener?code=yDHg3qnzKJ-_7KVBzqOEJVTR4zcu7rlOrHgiqGEw3ZzyAzFuwWZdv-==

## References

### Target workspace

https://cbrands.leanix.net/ConstellationBrands (US)

### Tickets

https://leanix.zendesk.com/agent/tickets/64895
https://leanix.atlassian.net/browse/CSES-2403
