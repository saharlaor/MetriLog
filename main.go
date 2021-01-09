package main

import (
	"context"
	"fmt"
	"net"
	"os"

	"docker.io/go-docker"
	"docker.io/go-docker/api/types"
)

func check(e error) {
	if e != nil {
		panic(e)
	}
}

func logToFile(cli *docker.Client, container types.Container) {
	_, containerData, err := cli.ContainerInspectWithRaw(context.Background(), container.ID, false)
	check(err)

	file, err := os.Create(fmt.Sprintf("/var/log%s.log", container.Names[0]))
	check(err)
	defer file.Close()

	ifcfg, err := net.Interfaces()
	check(err)
	addr, err := ifcfg[0].Addrs()
	check(err)

	_, err = file.Write([]byte(fmt.Sprintf("{\n    \"sender\": \"%s\"\n    \"container\": \"%s\"\n}\n", addr[0], container.Names)))
	check(err)

	_, err = file.Write(containerData)
	check(err)
}

func main() {
	// fmt.Println("wow")
	cli, err := docker.NewEnvClient()
	check(err)

	containers, err := cli.ContainerList(context.Background(), types.ContainerListOptions{})
	check(err)

	for _, container := range containers {
		fmt.Printf("%s %s %s\n", container.ID[:10], container.Image, container.Names)

		logToFile(cli, container)
	}
}
