# Assignment 1
In this assignment I created a cloud-based IoT system that collects information from a set of virtual environmental sensors using the MQTT protocol. I also created a simple website to display the data collected from the sensors.

# Virtual Sensors
Using *Java* language programming I wrote a stand-alone program that represent a virtual environmental station that generates periodically a set of random values for 5 different sensors:
- temperature (-50 ... 50 Celsius)
- humidity (0 ... 100%)
- wind direction (0 ... 360 degrees)
- wind intensity (0 ... 100 m/s)
- rain height (0 ... 50 mm/h)

The virtual environmental station uses a unique ID (identity) to publish these random values on an MQTT channel, so you can start several instances which publish their values on the MQTT channel.

# Usage
The program can be started in two ways:
- terminal based (no control on sending MQTT messages. Start it and it will work until you'll stop it)
- GUI based (*recommended*: more control on sending MQTT messages. Start, pause, resume and stop it by using a simple UI)

# Cloud-based IoT Backend
The MQTT is controlled by the cloud-based backend implemented using *AWS IoT*.

# Web-based Dashboard
Using *HTML, CSS* and *Javascript* I developed a [website](https://666thenumberofthebeast.github.io/InternetOfThings19-20/) that provides the following functionalities:
- display the latest values received from all the sensors of a specified environmental station
- display the values received during the last hour from all environmental station of a specified sensor

# Extra
[Demo](https://youtu.be/Bl5EqkK0KrA) of the system.
[Blog Post](https://www.hackster.io/xmetal1997/iot-virtual-environment-stations-emulator-4fc78b) where you can find a hands-on tutorial on how to setup and run the system.

[Assignment 2](https://github.com/666TheNumberOfTheBeast/InternetOfThings19-20/tree/master/Assignment2)
[Assignment 3](https://github.com/666TheNumberOfTheBeast/InternetOfThings19-20/tree/master/Assignment3)

***
© All rights reserved, 666TheNumberOfTheBeast
