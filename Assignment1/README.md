#Assignment1
In this assignment you will create a cloud-based IoT system that collects information from a set of virtual environmental sensors using the MQTT protocol. You will also create a simple web site to display the data collected from the sensors.

#Virtual Sensors
Using your favorite programming language you need to create a stand-alone program that represents a virtual environmental station that generates periodically a set of random values for 5 different sensors:

-temperature (-50 ... 50 Celsius)
-humidity (0 ... 100%)
-wind direction (0 ... 360 degrees)
-wind intensity (0 ... 100 m/s)
-rain height (0 ... 50 mm/h)

The virtual environmental station uses a unique ID (identity) to publish these random values on an MQTT channel. You need to have at least 2 such virtual stations running and publishing their values on the MQTT channel.

#Cloud-based IoT Backend
The MQTT is controled by the cloud-based backend implemented using AWS IoT.


#Web-based Dashboard
Using your favorite programming language and web development libraries develop a web site that provides the following functionality:

-Display the latest values received from all the sensors of a specified environmental station.
-Display the values received during the last hour from all environmental station of a specified sensor.

#WHAT/HOW TO SUBMIT
Create a YouTube video with a 3 minute demonstration of your system.
Create a Blog Post where you present a hands-on tutorial on how to setup and run your system.
Create a GitHub repository where you will push all your code and scripts that are need to realize the above assignment, along with a main README.md file where you provide links to your video and post.
