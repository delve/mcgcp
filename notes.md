https://cloud.google.com/blog/products/it-ops/brick-by-brick-learn-gcp-by-setting-up-a-minecraft-server
# quicklab
https://www.cloudskillsboost.google/focuses/1852?parent=catalog
## create VM
```
gcloud compute instances create mc-1 --project=minecraft1-336511 --zone=europe-west1-b --machine-type=n1-standard-1 --network-interface=network-tier=STANDARD,subnet=default --maintenance-policy=MIGRATE --service-account=693447691230-compute@developer.gserviceaccount.com --scopes=https://www.googleapis.com/auth/servicecontrol,https://www.googleapis.com/auth/service.management.readonly,https://www.googleapis.com/auth/logging.write,https://www.googleapis.com/auth/monitoring.write,https://www.googleapis.com/auth/trace.append,https://www.googleapis.com/auth/devstorage.read_write --tags=minecratf-server --create-disk=auto-delete=yes,boot=yes,device-name=mc-1,image=projects/debian-cloud/global/images/debian-10-buster-v20211209,mode=rw,size=10,type=projects/minecraft1-336511/zones/europe-west1-b/diskTypes/pd-ssd --create-disk=device-name=mc-1-world,mode=rw,name=mc-1-world,size=50,type=projects/minecraft1-336511/zones/europe-west1-b/diskTypes/pd-ssd --no-shielded-secure-boot --shielded-vtpm --shielded-integrity-monitoring --reservation-affinity=any
```

# firewall rule - skip, handled by functions
gcloud compute --project=minecraft1-336511 firewall-rules create minecraft-rule --direction=INGRESS --priority=1000 --network=default --action=ALLOW --rules=tcp:25565 --source-ranges=0.0.0.0/0 --target-tags=minecratf-server


# at boot, run
sudo mkdir -p /home/minecraft
sudo mkfs.ext4 -F -E lazy_itable_init=0,lazy_journal_init=0,discard /dev/disk/by-id/google-mc-1-world
sudo mount -o discard,defaults /dev/disk/by-id/google-mc-1-world /home/minecraft


# onetime setup
# setup JRE
wget https://download.java.net/java/GA/jdk17/0d483333a00540d886896bac774ff48b/35/GPL/openjdk-17_linux-x64_bin.tar.gz
sudo tar xvf openjdk-17_linux-x64_bin.tar.gz
sudo mv jdk-17 /opt/
(or /usr/bin????)
export JAVA_HOME=/opt/jdk-17
export PATH=$PATH:$JAVA_HOME/bin 
source ~/.bashrc
# get screen
apt-get install -y screen

# setup MC
cd /home/minecraft
curl https://launcher.mojang.com/v1/objects/125e5adf40c659fd3bce3e66e67a16bb49ecc1b9/server.jar > minecraft_server.1.18.jar

echo eula=true > eula.txt

nano server.properties


# run MC
screen -S mcs /opt/jdk-17/bin/java -Xmx1024M -Xms1024M -jar /home/minecraft/minecraft_server.1.18.jar nogui
#screen -r mcs

# setup backup
sudo su
gsutil mb -c coldline --retention 90d gs://minecraft1-336511-minecraft-backup
cat - << EOD > /home/minecraft/backup.sh
#!/bin/bash
screen -r mcs -X stuff '/save-all\n/save-off\n'
/usr/bin/gsutil cp -R \${BASH_SOURCE%/*}/world gs://minecraft1-336511-minecraft-backup/\$(date "+%Y%m%d-%H%M%S")-world
screen -r mcs -X stuff '/save-on\n'
EOD
cat /home/minecraft/backup.sh
chmod 755 /home/minecraft/backup.sh
cat - << EOD > cron
0 */4 * * * /home/minecraft/backup.sh
EOD
crontab cron


# setup start-stop metadata keys
    https://cloud.google.com/sdk/gcloud/reference/compute/instances/add-metadata
    gcloud compute instances add-metadata INSTANCE_NAME [--metadata=KEY=VALUE,[KEY=VALUE,…]] [--metadata-from-file=KEY=LOCAL_FILE_PATH,[…]] [--zone=ZONE] [GCLOUD_WIDE_FLAG …]
startup-script 
#!/bin/bash
mount /dev/disk/by-id/google-mc-1-world /home/minecraft
(crontab -l ; echo "0 */4 * * * /home/minecraft/backup.sh")| crontab -
cd /home/minecraft
screen -d -m -S mcs java -Xms1G -Xmx7G -d64 -jar minecraft_server.1.18.jar nogui

shutdown-script
#!/bin/bash
sudo screen -r -X stuff '/stop\n'


# CREATE cloud functions from script files & package
https://cloud.google.com/sdk/gcloud/reference/functions/deploy
deploy - https://codelabs.developers.google.com/codelabs/local-development-with-cloud-functions#5




gcloud functions deploy startMcServer --trigger-http --runtime=nodejs16 --region=europe-west1
gcloud alpha functions add-iam-policy-binding startMcServer --region=europe-west1 --member=allUsers --role=roles/cloudfunctions.invoker
