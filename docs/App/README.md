# Assignment 4
In this assignment I developed a mobile application to provide a crowd-sensing extension to my application. I built on-top of the cloud-based and edge-based components developed in the first and second assignments.

# Crowd Sensing Application
I developed an *HTML5* application using the *Generic Sensor API* that collects data from the accelerator sensor of the mobile phone.
These values are transmitted to my Cloud infrastructure using an unique ID (identity) via MQTT.

# Cloud-based IoT Backend
The MQTT is controlled by the cloud-based backend implemented using *AWS IoT*.

# User Activity Recognition
Using the collected data, I developed a simple activity recognition model that detects if the user is standing still or not.

Assuming a movement of at most 0.5 Hz (i.e. 30 steps per minute), a sampling frequency of 1Hz (i.e. 1 message per second) is theoretically sufficient to recognize the pattern.

# Cloud-based Deployment
Deploy the activity recognition model to the cloud. Given the data arriving to the cloud, I execute the model and provide a status for the state of the user whenever new values arrive.

The web app provides the following functionalities:
- Display the latest values received from all the sensors and the resulting activity.
- Display the values received during the last hour from all the sensors and the resulting activity.

# Edge-based Deployment
Deploy the activity recognition model to the mobile phone. Given the data collected by the mobile phone, the model is executed locally to provide a status for the state of the user.

In this edge-based deployment the raw sensor data are not transmitted to the cloud. Instead only the outcome of the activity recognition model should be transmitted to the cloud.

The web app provides the following functionalities:
- Display the latest activity of the user.
- Display the activities received during the last hour.

# Usage
The [web app](https://666thenumberofthebeast.github.io/InternetOfThings19-20/App/index.html) is available as a GitHub page and provides three buttons:
- One for the Cloud Computing
- One for the Edge Computing
- One for the last hour values of the chosen computation

# Extra
[Demo](https://www.youtube.com/watch?v=F51n_hRgXw4) of the system.  
[Blog Post](https://www.hackster.io/xmetal1997/iot-human-activity-recognition-web-app-45402d) where you can find a hands-on tutorial on how to reproduce the system.

[Assignment 1](https://github.com/666TheNumberOfTheBeast/InternetOfThings19-20/tree/master/Assignment1)

[Assignment 2](https://github.com/666TheNumberOfTheBeast/InternetOfThings19-20/tree/master/Assignment2)

[Assignment 3](https://github.com/666TheNumberOfTheBeast/InternetOfThings19-20/tree/master/Assignment3)

***
© All rights reserved, 666TheNumberOfTheBeast
