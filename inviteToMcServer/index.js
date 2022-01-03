/**
* Create the VPC Firewall Rule to allow the function caller to access the Minecraft server
*/
// var http = require('http');
const compute = require('@google-cloud/compute');
const computeProtos = compute.protos.google.cloud.compute.v1;
const projectId = 'minecraft1-336511';
const zonename = 'europe-west1-b';
const vmname = 'mc-1';
const fwname = 'minecraft-fw-rule-'+Math.floor(new Date() / 1000);

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

exports.inviteToMcServer = async function inviteToMcServer(req, res) {
  // Record the function caller's IPv4 address
  const server_ip = await get_server_ip();

  console.log(JSON.stringify(req.headers));
  sourceIp = req.get('X-Forwarded-For');
  let callerip = req.query.message || req.body.message || sourceIp;

  const firewallsClient = new compute.FirewallsClient();
  const operationsClient = new compute.GlobalOperationsClient();

  const firewallRule = new computeProtos.Firewall();
  firewallRule.name = fwname;
  firewallRule.direction = 'INGRESS';
  firewallRule.allowed = [
    {
      IPProtocol: 'tcp',
      ports: ['25565'],
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
  // Return a response
  res.status(200).send('Firewall rule created named ' + fwname + ' for IP address ' + callerip + '<br/>Connect to the server at: ' + server_ip + ':25565<br /><img src=https://cataas.com/cat/computer/says/Have%20fun />');
};