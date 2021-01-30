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

	file, err := os.OpenFile(fmt.Sprintf("/var/log/metrilog%s.json", container.Names[0]), os.O_RDWR|os.O_CREATE|os.O_TRUNC, 0755)
	check(err)

	ifcfg, err := net.Interfaces()
	check(err)
	addr, err := ifcfg[0].Addrs()
	check(err)

	_, err = file.Write([]byte(fmt.Sprintf(
		`{
  "metadata": {
    "sender": "%s",
    "container": "%s"
  },
  "body": {
`,
		addr[0], container.Names[0])))
	check(err)

	return
}

func closeLogFile(file *os.File) {
	fmt.Printf("Closing the body section in the json syntax file and reformatting %s\n", file.Name())
	_, err := file.Write([]byte(
		`  }
}`))
	check(err)

	//// Doesn't work
	//// TODO: Fix JSON Reformatting
	// fmt.Println("Reformatting the json content of the file")
	// fileContent := []byte("")
	// _, err = file.Read(fileContent)
	// check(err)
	// buffer := new(bytes.Buffer)
	// encoder := json.NewEncoder(buffer)
	// encoder.SetIndent("", "  ")

	// err = encoder.Encode(fileContent)
	// check(err)

	err = file.Close()
	check(err)
	fmt.Printf("Closed file %s to writing\n", file.Name())
}

func logInspect(cli *docker.Client, container types.Container, file *os.File) {
	_, containerData, err := cli.ContainerInspectWithRaw(context.Background(), container.ID, false)
	check(err)
	containerData = containerData[:len(containerData)-1] //delete the new line at the end of the byte array

	containerData = append([]byte(`"Inspect": `), containerData...)
	containerData = append(containerData, ",\n"...)

	_, err = file.Write(containerData)
	check(err)
}

func logStats(cli *docker.Client, container types.Container, file *os.File) {
	containerData, err := cli.ContainerStats(context.Background(), container.ID, false)
	check(err)

	buffer := new(bytes.Buffer)
	buffer.ReadFrom(containerData.Body)
	stats := buffer.Bytes()

	_, err = file.Write([]byte(`"Stats": `))
	check(err)

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
		closeLogFile(logFile)
	}
	fmt.Println("Finished logging all docker containers")
}
