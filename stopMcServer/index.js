/**
* stop the Minecraft server
*/
const compute = require('@google-cloud/compute');

const zonename = 'europe-west1-b';
const vmname = 'mc-1';
const projectId = 'minecraft1-336511';

async function get_server_ip() {
  // Instantiates a client
  const instanceClient = new compute.InstancesClient();

  // Construct request
  const request = {
    instance: vmname,
    project: projectId,
    zone: zonename,
  };

  // Run request
  const response = await instanceClient.get(request);
  return response[0].networkInterfaces[0].accessConfigs[0].natIP
}

 
async function check_if_server_is_down() {
 const server_ip = await get_server_ip();
 const down = !server_ip;
 return down
}
 
async function sleep(milliseconds) {
 return new Promise(function(resolve, reject) {
   setTimeout(resolve, milliseconds);
 });
}
 
exports.stopMcServer = async function stopMcServer(req, res) {
 // stop the VM

  const instancesClient = new compute.InstancesClient();
  const beginOperation = await instancesClient.stop({
    project: projectId,
    zone: zonename,
    instance: vmname,
  });
  console.log('Instance ' + vmname + ' is stopping');

  // Wait for the operation to complete.
  let operationState = beginOperation[0];
  let operationName = operationState.name;
  const operationsClient = new compute.ZoneOperationsClient();
  while (operationState.status !== 'DONE') {
    console.log('Waiting for instance shutdown')
    clientResult = await operationsClient.wait({
      operation: operationName,
      project: projectId,
      zone: operationState.zone.split('/').pop(),
    });
    operationState = clientResult[0]
  }
 console.log('the server is stopped');
 
 // Record the function caller's IPv4 address
 console.log(JSON.stringify(req.headers));
 res.status(200).send('Minecraft Server Stopped! You are now SAVING REAL MONEY! :D <br /><img src=https://cataas.com/cat/cute/says/Thank%20you />');
};