~~~
$ docker-machine create -d virtualbox blackfreedomstudies.dev
$ eval "$(docker-machine env blackfreedomstudies.dev)"
$ docker run --name blackfreedomstudies-craft --link blackfreedomstudies-mysql:mysql -p 8080:80 -d craftcms???
~~~
