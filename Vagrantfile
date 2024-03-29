# -*- mode: ruby -*-
# vi: set ft=ruby :

# ------------------------------------------------------------------------
# CONFIGURABLE PROPERTIES
# ------------------------------------------------------------------------
$project_name  = 'blackfreedomstudiesorg'
$ip_address = '192.168.11.11'
$hostname = $project_name + '.craft.dev'
# ------------------------------------------------------------------------

Vagrant.configure('2') do |config|
  # Basics
  config.vm.box     = 'precise64'
  config.vm.box_url = 'http://files.vagrantup.com/precise64.box'

  config.vm.provider "virtualbox" do |v|
      v.customize ["modifyvm", :id, "--cpuexecutioncap", "90"]
      v.customize ["modifyvm", :id, "--memory", "512"]
      v.customize ["modifyvm", :id, "--cpus", 2]
  end

  # Host manager
  config.hostmanager.enabled = true
  config.hostmanager.manage_host = true

  # Networking
  config.vm.define $project_name do |node|
    node.vm.hostname = $hostname
    node.vm.network :private_network, ip: $ip_address
    node.hostmanager.aliases = [ 'www.' + $hostname ]
  end

  config.vm.provision :hostmanager

  # Provisioning
  config.vm.provision :shell, :path => 'puppet/bootstrap/bootstrap.sh'

  config.vm.provision :puppet do |puppet|
    puppet.facter = {
      'hostname' => $hostname
    }

    puppet.manifest_file  = 'init.pp'
    puppet.manifests_path = 'puppet/manifests'
    puppet.module_path    = 'puppet/modules'
  end

  # Shared folders
  config.vm.synced_folder "./public/assets", "/vagrant/public/assets", owner: "www-data", group: "www-data"
  config.vm.synced_folder ".", "/vagrant", :nfs => true
end
