rmdir server\src\shared
mklink /J server\src\shared client\src\shared
rmdir client\data
mklink /J client\data server\data