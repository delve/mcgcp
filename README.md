# mcgcp
notes on mc on gcp




# execute locally:
install gcloud CLI
```
sudo apt-get install -y apt-transport-https ca-certificates gnupg
echo "deb [signed-by=/usr/share/keyrings/cloud.google.gpg] https://packages.cloud.google.com/apt cloud-sdk main" | sudo tee -a /etc/apt/sources.list.d/google-cloud-sdk.list
curl https://packages.cloud.google.com/apt/doc/apt-key.gpg | sudo apt-key --keyring /usr/share/keyrings/cloud.google.gpg add -
sudo apt-get update && sudo apt-get install -y google-cloud-sdk
gcloud init
gcloud auth application-default login
```

use google funcion framework
```
npx  node_modules/@google-cloud/functions-framework --target=startInstance
```
to run localhost:8080 server with <target>

```
curl -X POST http://localhost:8080 -H "Content-Type:application/json" -d '{\"temp\":\"50\"}'
```

# interactive debugging how?



# helpful
node module repo
https://github.com/googleapis/nodejs-compute/blob/main/samples/startInstance.js
somewhat-
https://zaunere.medium.com/local-development-with-vscode-node-js-and-google-functions-on-windows-10-for-php-developers-2401c583c110
docs
test - https://codelabs.developers.google.com/codelabs/local-development-with-cloud-functions#4
deploy - https://codelabs.developers.google.com/codelabs/local-development-with-cloud-functions#5

https://stackoverflow.com/questions/62012161/no-google-application-credentials-in-cloud-functions-deployment
