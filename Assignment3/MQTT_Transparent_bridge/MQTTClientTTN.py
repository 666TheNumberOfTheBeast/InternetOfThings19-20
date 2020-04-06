import time
import ttn
import json
import datetime

import sys
# insert at 1, 0 is the script path (or '' in REPL)
sys.path.insert(1, '../../Assignment2/MQTT-SN_MQTT_Transparent_bridge')

import MQTTClient

class MQTTClientTTN:

    def __init__(self):
        self.myMQTTClient = None
        self.app_id = None
        self.access_key = None

    def uplink_callback(self, msg, client):
      print("Received uplink from ", msg.dev_id)
      print(msg)
      #print(msg.payload_fields)

      # obj is a unicode string
      obj = msg.payload_fields.string
      #print(repr(obj))

      # Convert the object in a python string
      obj = str(obj)
      print(repr(obj))

      # Try to parse a JSON
      js = ""
      try:
          js = json.loads(obj)
      except:
          return False

      id = js["Id"]
      if (id is None):
          return False

      # Check if the MQTTClient is initialized
      if (self.myMQTTClient is None):
          self.myMQTTClient = MQTTClient.MQTTClient(id)
          self.myMQTTClient.initMQTTclient()

      # Since LoRa time is wrong, add the correct one
      now = datetime.datetime.now()
      print("Current date and time : ")
      print(now.strftime("%d-%m-%Y %H:%M:%S"))
      js["dateTime"] = now.strftime("%d-%m-%Y %H:%M:%S")

      print(js)

      # Send JSON to the AWS broker via the MQTTClient adding the ID of the station
      self.myMQTTClient.publish("sensor/station" + id, json.dumps(js))
      return True

    def initMQTTclientTTN(self):
        path = "../keys/"
        values = MQTTClient.readFromCSVFile(path + "TTNkeys.txt")
        self.app_id = values["appID"]
        self.access_key = values["accessKey"]
        self.cert_file = values["certFile"]

        handler = ttn.HandlerClient(self.app_id, self.access_key, cert_path=path+self.cert_file)

        self.mqtt_client = handler.data()
        self.mqtt_client.set_uplink_callback(self.uplink_callback)
        self.mqtt_client.connect()

    def disconnect(self):
        self.mqtt_client.close()



mqtt_client_ttn = MQTTClientTTN()
print("Connecting the transparent bridge...")
mqtt_client_ttn.initMQTTclientTTN()
print("Connected")

# Loop to receive messages and intercept Ctrl+c to disconnect in a correct way
try:
    while True:
        pass
except KeyboardInterrupt:
    print("\nClosing the transparent bridge...")
    mqtt_client_ttn.disconnect()
    print("Closed")
    sys.exit()
