#!/bin/bash

set -e

RESOURCE_GROUP_NAME=$1
SECRET_NAME=$2
SECRET=$3

if [[ -z "$RESOURCE_GROUP_NAME" ]]; then
    echo "Please pass the target Azure Resource Group."
    exit 1
fi
if [[ -z "$SECRET_NAME" ]]; then
    echo "Please specify the name for the SECRET."
    exit 1
fi
if [[ -z "$SECRET" ]]; then
    echo "Please pass the SECRET"
    exit 1
fi

# Marshal SECRET_NAME
KEYVAULT_SECRET_NAME=$(echo $SECRET_NAME | tr -d '_' | tr -d '-' | tr '[:lower:]' '[:upper:]')
FUNCTION_ENV_NAME=$(echo $SECRET_NAME | tr '-' '_' | tr '[:lower:]' '[:upper:]')

KEY_VAULT_NAME=$(az resource list --resource-group $RESOURCE_GROUP_NAME --resource-type 'Microsoft.KeyVault/vaults' | jq -r '.[0].name')
SECRET_URI=$(az keyvault secret set --name $KEYVAULT_SECRET_NAME --vault-name $KEY_VAULT_NAME --value $SECRET | jq -r '.id')

FUNCTION=$(az resource list --resource-group $RESOURCE_GROUP_NAME --resource-type 'Microsoft.Web/sites' | jq -r '.[0].name')
az functionapp config appsettings set --resource-group $RESOURCE_GROUP_NAME --name $FUNCTION --settings "$FUNCTION_ENV_NAME=@Microsoft.KeyVault(SecretUri=$SECRET_URI)"