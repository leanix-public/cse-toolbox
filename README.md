## Environment variable definition
For testing, the following environment variables must either be defined in the system or placed in an ".env" file located in the project root folder:

|   Environment Variable   |   Type   | Description |
| ------------------------ | -------- | ----------- |
| LXR_HOST                 | string   | LeanIX instance for tests |
| LXR_APITOKEN             | string   | LeanIX API token for tests |


## Azure functions ref
https://learn.microsoft.com/pt-br/azure/azure-functions/create-first-function-cli-typescript?tabs=azure-cli%2Cbrowser

### Create new Project:
npx func init projects/demo_function_project --typescript
cd projects/demo_function_project
npx func new --name HttpExample --template "HTTP trigger" --authlevel "anonymous"


## Ref monorepo
https://github.com/rhyek/typescript-monorepo-example


## Azure Functions Local debugging setup (Typescript)
https://learn.microsoft.com/en-us/azure/azure-functions/functions-reference-node?tabs=v2-v3-v4-export%2Cv2-v3-v4-done%2Cv2%2Cv2-log-custom-telemetry%2Cv2-accessing-request-and-response%2Cwindows-setting-the-node-version#local-debugging


## Debugging Azure Functions Locally:
1. Navigate to the function folder
2. Run ```npm run start```
3. Launch VS Code Debugger config "Attach to Azure Function"
4. Set breakpoints in your code and debug it

### Troubleshooting
Q: I cannot trigger any breakpoints set in my source code
A: Check the following points: the "dist" folder of your function contains a source-map *.js.map file generated during the build process, the "local.settings.json" file contains a "Values" entry { "languageWorkers:node:arguments": "--inspect=9229" }, the .vscode directory in the repository root contains a "launch.json" file with a configuration of type "node", request "attach" configured for port 9929
". Additional info [here](https://learn.microsoft.com/en-us/azure/azure-functions/functions-reference-node?tabs=v2-v3-v4-export%2Cv2-v3-v4-done%2Cv2%2Cv2-log-custom-telemetry%2Cv2-accessing-request-and-response%2Cwindows-setting-the-node-version#local-debugging
)


## Azure Publish Workflow
https://learn.microsoft.com/en-us/azure/azure-functions/functions-reference-node?tabs=v2-v3-v4-export%2Cv2-v3-v4-done%2Cv2%2Cv2-log-custom-telemetry%2Cv2-accessing-request-and-response%2Cwindows-setting-the-node-version#publish-to-azure
