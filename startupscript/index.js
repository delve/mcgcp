/**
* Start the Minecraft server, return the external IP, and create a FW rule
*/
const http = require('http');
const compute = require('@google-cloud/compute');
const computeProtos = compute.protos.google.cloud.compute.v1;
const zonename = 'europe-west1-b';
const vmname = 'mc-1';
const projectId = 'minecraft1-336511';
const fwname = 'minecraft-fw-rule-' + Math.floor(new Date() / 1000);

async function get_server_ip() {
  //TODO: make this work! but apparently the metadata server is only accessible from a VM
  //      so debugging is an absolute nightmare! ref https://cloud.google.com/compute/docs/metadata/querying-metadata
//  return new Promise(function(resolve, reject) {
//    vm.getMetadata(function(err, metadata, apiResponse) {
//      resolve(metadata.networkInterfaces[0].accessConfigs[0].natIP);
//    });
//  });
  return '34.79.179.110'
}

async function createFirewallRule(callerip) {
  const firewallsClient = new compute.FirewallsClient();
  const operationsClient = new compute.GlobalOperationsClient();

  const firewallRule = new computeProtos.Firewall();
  firewallRule.name = fwname;
  firewallRule.direction = 'INGRESS';
  firewallRule.allowed = [
    {
      IPProtocol: 'tcp',
      ports: ['25566'],
    },
  ];
  firewallRule.sourceRanges = [callerip + '/32']
  firewallRule.targetTags = ['minecratf-server'];
  firewallRule.network = 'global/networks/default';
  firewallRule.description = 'Allowing TCP traffic to Minecraft.';

  const startOperation = await firewallsClient.insert({
    project: projectId,
    firewallResource: firewallRule,
  });
  let operationState = startOperation[0];
  let operationName = operationState.name;
  // Wait for the create operation to complete.
  while (operationState.status !== 'DONE') {
    clientResult = await operationsClient.wait({
      operation: operationName,
      project: projectId,
    });
    operationState = clientResult[0]
  }

  console.log('Firewall rule created');
}

exports.startInstance = async function startInstance(req, res) {
  // Start the VM
  const instancesClient = new compute.InstancesClient();
  console.log('about to start a VM');

  const startOperation = await instancesClient.start({
    project: projectId,
    zone: zonename,
    instance: vmname,
  });
  console.log('the server is starting');

  // Wait for the operation to complete.
  let operationState = startOperation[0];
  let operationName = operationState.name;
  const operationsClient = new compute.ZoneOperationsClient();
  while (operationState.status !== 'DONE') {
    clientResult = await operationsClient.wait({
      operation: operationName,
      project: projectId,
      zone: operationState.zone.split('/').pop(),
    });
    operationState = clientResult[0]
  }
  console.log('Instance started.');

  const server_ip = await get_server_ip();


  // Record the function caller's IPv4 address
  console.log(JSON.stringify(req.headers));
  sourceIp = req.get('X-Forwarded-For');
  let callerip = req.query.message || req.body.message || sourceIp;
 
  // Set the Firewall configs
  createFirewallRule(callerip)

  //TODO: figure out how to poll the MC process for startup state (MC takes minutes to start as well)
  res.status(200).send('Minecraft Server Started! You are now spending REAL MONEY! <br />' + 'The IP address of the Minecraft server is: ' + server_ip + ':25565<br />Your IP address is ' + callerip + '<br />A Firewall rule named ' + fwname + ' has been created for you.' );
};
