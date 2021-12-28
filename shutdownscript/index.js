/**
* stop the Minecraft server
*/
const http = require('http');
const Compute = require('@google-cloud/compute');
const compute = Compute();
const zone = compute.zone('europe-west1-b');
const vm = zone.vm('mc-1');

async function get_server_ip() {
 return new Promise(function(resolve, reject) {
   vm.getMetadata(function(err, metadata, apiResponse) {
     resolve(metadata.networkInterfaces[0].accessConfigs[0].natIP);
   });
 });
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
 
exports.stopInstance = async function stopInstance(req, res) {
 // stop the VM
 const zone = compute.zone('europe-west1-b');
 const vm = zone.vm('mc-1');
 console.log('about to stop a VM');
 vm.stop(function(err, operation, apiResponse) {
   console.log('instance stop command sent');
 });
 console.log('the server is stopping');
 while(!(await check_if_server_is_down())) {
   console.log('Server is still on, waiting 1 second...');
   await sleep(1000);
   console.log('Checking server status again...');
 }
 console.log('the server is stopped');
 
 // Record the function caller's IPv4 address
 console.log(JSON.stringify(req.headers));

 // TODO: add a random cat here https://aws.random.cat/meow
 res.status(200).send('Minecraft Server Stopped! You are now saving REAL MONEY! :D <br />' );
};