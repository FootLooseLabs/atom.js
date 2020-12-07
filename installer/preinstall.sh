#!/bin/sh
INSTALLER_DIR="`dirname \"$0\"`"
echo "INSTALLER_DIR = $INSTALLER_DIR"

echo "installing atom js-sdk (by footloose labs)..."


echo "-installing dependencies"

sh $INSTALLER_DIR/redis/install_redis_from_apt.sh


sudo npm install pm2 -g