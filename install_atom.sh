#!/bin/sh
sudo apt-get update
sudo apt-get upgrade

sudo apt-get install git
sudo apt-get install node==12.16.1

git clone <atom-repo> --recurse-submodules
cd <atom-repo> && ./install.sh
