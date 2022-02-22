#!/bin/sh
INSTALLER_DIR="`dirname \"$0\"`"
echo "INSTALLER_DIR = $INSTALLER_DIR"

echo "installing atom js-sdk (by footloose labs)..."


echo "-installing dependencies"

unamestr=$(uname)
if [[ "$unamestr" == 'Linux' ]]; then
   echo "Platform Detected Linux"
   sh $INSTALLER_DIR/redis/install_redis_from_apt.sh
elif [[ "$unamestr" == 'Darwin' ]]; then
   echo "Platform Detected Darwin"
   sh $INSTALLER_DIR/redis/install_redis_from_tar.sh
fi
sudo npm install pm2 -g