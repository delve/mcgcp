/**
* Start the Minecraft server, return the external IP, and create a FW rule
*/
// const http = require('http')
const compute = require('@google-cloud/compute');
const computeProtos = compute.protos.google.cloud.compute.v1;
const {DNS} = require('@google-cloud/dns');
const dns = new DNS();

const zonename = 'europe-west1-b';
const vmname = 'mc-1';
const projectId = 'minecraft1-336511';
const fwname = 'minecraft-fw-rule-' + Math.floor(new Date() / 1000);
const dnsDomain = 'latest1.kirbycraft.goober.site.'
const dnsZone = 'minecraft'
const dnsRecordType = 'a'
const dnsRecordTtl = '300'


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

async function update_domain(server_ip) {
  const zone = dns.zone(dnsZone);

  //get existing DNS A records
  const query = {
    name: dnsDomain,
    type: 'A'
  };
  const records = await zone.getRecords(query);
  const currentIp = records[0][0].data[0]

  //create the change set
  const oldARecord = zone.record(dnsRecordType, {
    name: dnsDomain,
    data: currentIp,
    ttl: dnsRecordTtl
  });
  const newARecord = zone.record(dnsRecordType, {
    name: dnsDomain,
    data: server_ip,
    ttl: dnsRecordTtl
  });
  const changeset = {
    add: newARecord,
    delete: oldARecord
  };

  //execute the change
  zone.createChange(changeset, (err, change, apiResponse) => {
    if (err) {
      // The change failed
      console.log(err)
    }
  });
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
}

exports.startMcServer = async function startMcServer(req, res) {
  console.log('Preparing to start instance ' + vmname);
  // Start the VM
  const instancesClient = new compute.InstancesClient();

  const startOperation = await instancesClient.start({
    project: projectId,
    zone: zonename,
    instance: vmname,
  });
  console.log('Instance ' + vmname + ' is starting');

  // Wait for the operation to complete.
  let operationState = startOperation[0];
  let operationName = operationState.name;
  const operationsClient = new compute.ZoneOperationsClient();
  while (operationState.status !== 'DONE') {
    console.log('Waiting for instance startup')
    clientResult = await operationsClient.wait({
      operation: operationName,
      project: projectId,
      zone: operationState.zone.split('/').pop(),
    });
    operationState = clientResult[0]
  }
  console.log('Instance started.');
  const server_ip = await get_server_ip();
  console.log('Found instance NAT IP ' + server_ip)
  update_domain(server_ip)
  console.log(server_ip + ' registered on ' + dnsDomain)

  // Set the Firewall configs
  // Record the function caller's IPv4 address
  console.log(JSON.stringify(req.headers));
  sourceIp = req.get('X-Forwarded-For');
  let callerip = req.query.message || req.body.message || sourceIp;

  createFirewallRule(callerip)
  console.log('Firewall rule created for ' + callerip);

  //TODO: figure out how to poll the MC process for startup state (MC takes minutes to start as well)
  res.status(200).send('Minecraft Server Started! You are now spending REAL MONEY! <br />' + 'The IP address of the Minecraft server is: ' + server_ip + ':25565<br />A Firewall rule named ' + fwname + ' has been created for your IP address: ' +  callerip);
};

// test functions
exports.getServerIp = async function getServerIp(req, res) {
  const server_ip = await get_server_ip();
  res.status(200).send('Found server IP address ' + server_ip );
}
