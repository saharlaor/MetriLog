package main

import (
	"bytes"
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

func newLogFile(cli *docker.Client, container types.Container) (file *os.File) {

	file, err := os.OpenFile(fmt.Sprintf("/var/log%s.log", container.Names[0]), os.O_RDWR|os.O_CREATE|os.O_TRUNC, 0755)
	check(err)

	ifcfg, err := net.Interfaces()
	check(err)
	addr, err := ifcfg[0].Addrs()
	check(err)

	_, err = file.Write([]byte(fmt.Sprintf("{\n    \"sender\": \"%s\"\n    \"container\": \"%s\"\n}\n", addr[0], container.Names)))
	check(err)
	return
}

func logInspect(cli *docker.Client, container types.Container, file *os.File) {
	_, containerData, err := cli.ContainerInspectWithRaw(context.Background(), container.ID, false)
	check(err)

	_, err = file.Write(containerData)
	check(err)
}

func logStats(cli *docker.Client, container types.Container, file *os.File) {
	containerData, err := cli.ContainerStats(context.Background(), container.ID, false)
	check(err)

	buffer := new(bytes.Buffer)
	buffer.ReadFrom(containerData.Body)
	stats := buffer.Bytes()

	_, err = file.Write(stats)
	check(err)
}

func main() {
	cli, err := docker.NewEnvClient()
	check(err)

	containers, err := cli.ContainerList(context.Background(), types.ContainerListOptions{})
	check(err)

	for _, container := range containers {
		fmt.Printf("%s %s %s\n", container.ID[:10], container.Image, container.Names)

		logFile := newLogFile(cli, container)
		logInspect(cli, container, logFile)
		logStats(cli, container, logFile)
		logFile.Close()
		fmt.Printf("Closed file %s to writing\n", logFile.Name())
	}

}
