/**
* Start the Minecraft server, return the external IP, and create a FW rule
*/
const http = require('http');
const compute = require('@google-cloud/compute');
const zonename = 'europe-west1-b';
const vmname = 'mc-1';
const projectId = 'minecraft1-336511';
const fwname = 'minecraft-fw-rule-' + Math.floor(new Date() / 1000);

async function get_server_ip() {
 return new Promise(function(resolve, reject) {
   vm.getMetadata(function(err, metadata, apiResponse) {
     resolve(metadata.networkInterfaces[0].accessConfigs[0].natIP);
   });
 });
}

exports.startInstance = async function startInstance(req, res) {
  // Start the VM
  const instancesClient = new compute.InstancesClient();
  console.log('about to start a VM');
  const [response] = await instancesClient.start({
    project: projectId,
    zone: zonename,
    instance: vmname,
  });
  console.log('the server is starting');
  let operation = response.latestResponse;
  const operationsClient = new compute.ZoneOperationsClient();
console.log(operation)
  // Wait for the operation to complete.
  while (operation.status !== 'DONE') {
    [operation] = await operationsClient.wait({
      operation: operation.name,
      project: projectId,
      zone: operation.zone.split('/').pop(),
    });
  }
  console.log('Instance started.');

  const server_ip = await get_server_ip();


  // Record the function caller's IPv4 address
  console.log(JSON.stringify(req.headers));
  sourceIp = req.get('X-Forwarded-For');
  let callerip = req.query.message || req.body.message || sourceIp;
 
  // Set the Firewall configs
  const config = {
    protocols: {tcp: [25565]},
    ranges: [callerip + '/32'],
    tags: ['minecraft-server']
  };
  function callback(err, firewall, operation, apiResponse) {}

  // Create the Firewall
  compute.createFirewall(fwname, config, callback);

  res.status(200).send('Minecraft Server Started! You are now spending REAL MONEY! <br />' + 'The IP address of the Minecraft server is: ' + server_ip + ':25565<br />Your IP address is ' + callerip + '<br />A Firewall rule named ' + fwname + ' has been created for you.' );
};
