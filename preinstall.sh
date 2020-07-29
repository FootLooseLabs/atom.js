#!/bin/sh
echo "installing atom js-sdk (by footloose labs)..."


echo "-installing dependencies"

echo "--redis"
wget http://download.redis.io/redis-stable.tar.gz
tar xvzf redis-stable.tar.gz
cd redis-stable
make