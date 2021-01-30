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

// Check raises an error if given one
// Its purpose is to make sure a function didn't fail
func Check(e error) {
	if e != nil {
		panic(e)
	}
}

// NewLogFile creates/overwrites a log file for container
// Adds metadata in json format and opens a body section
// It returns the file created
func NewLogFile(cli *docker.Client, container types.Container) (file *os.File) {

	file, err := os.OpenFile(fmt.Sprintf("/var/log/metrilog%s.json", container.Names[0]), os.O_RDWR|os.O_CREATE|os.O_TRUNC, 0755)
	Check(err)

	ifcfg, err := net.Interfaces()
	Check(err)
	addr, err := ifcfg[0].Addrs()
	Check(err)

	_, err = file.Write([]byte(fmt.Sprintf(
		`{
  "metadata": {
    "sender": "%s",
    "container": "%s"
  },
  "body": {
`,
		addr[0], container.Names[0])))
	Check(err)

	return
}

// CloseLogFile closes file to writing
// Before that it adds curly brackets to close the body section and the whole file
func CloseLogFile(file *os.File) {
	fmt.Printf("Closing the body section in the json syntax file and reformatting %s\n", file.Name())
	_, err := file.Write([]byte(
		`  }
}`))
	Check(err)

	//// Doesn't work
	//// TODO: Fix JSON Reformatting
	// fmt.Println("Reformatting the json content of the file")
	// fileContent := []byte("")
	// _, err = file.Read(fileContent)
	// Check(err)
	// buffer := new(bytes.Buffer)
	// encoder := json.NewEncoder(buffer)
	// encoder.SetIndent("", "  ")

	// err = encoder.Encode(fileContent)
	// Check(err)

	err = file.Close()
	Check(err)
	fmt.Printf("Closed file %s to writing\n", file.Name())
}

// LogInspect adds to file's body section the docker inspect results for container
func LogInspect(cli *docker.Client, container types.Container, file *os.File) {
	_, containerData, err := cli.ContainerInspectWithRaw(context.Background(), container.ID, false)
	Check(err)
	containerData = containerData[:len(containerData)-1] //delete the new line at the end of the byte array

	containerData = append([]byte(`"Inspect": `), containerData...)
	containerData = append(containerData, ",\n"...)

	_, err = file.Write(containerData)
	Check(err)
}

// LogStats adds to file's body section the docker stats results for container
func LogStats(cli *docker.Client, container types.Container, file *os.File) {
	containerData, err := cli.ContainerStats(context.Background(), container.ID, false)
	Check(err)

	buffer := new(bytes.Buffer)
	buffer.ReadFrom(containerData.Body)
	stats := buffer.Bytes()

	_, err = file.Write([]byte(`"Stats": `))
	Check(err)

	_, err = file.Write(stats)
	Check(err)
}

func main() {
	cli, err := docker.NewEnvClient()
	Check(err)

	containers, err := cli.ContainerList(context.Background(), types.ContainerListOptions{})
	Check(err)

	for _, container := range containers {
		fmt.Printf("%s %s %s\n", container.ID[:10], container.Image, container.Names)

		logFile := NewLogFile(cli, container)
		LogInspect(cli, container, logFile)
		LogStats(cli, container, logFile)
		CloseLogFile(logFile)
	}
	fmt.Println("Finished logging all docker containers")
}
