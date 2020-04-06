# Import SDK packages
from AWSIoTPythonSDK.MQTTLib import AWSIoTMQTTClient

class MQTTClient:

    def __init__(self, id):
        self.clientId = id
        self.myMQTTClient = None

    def initMQTTclient(self):
        # For certificate based connection
        self.myMQTTClient = AWSIoTMQTTClient(self.clientId)

        # For Websocket connection
        # myMQTTClient = AWSIoTMQTTClient("myClientID", useWebsocket=True)

        path = "../../Assignment1/keys/"
        values = readFromCSVFile(path + "key.txt")

        # Configurations
        # For TLS mutual authentication
        #self.myMQTTClient.configureEndpoint("YOUR.ENDPOINT", 8883)
        self.myMQTTClient.configureEndpoint(values["clientEndpoint"], 8883)

        # For Websocket
        # myMQTTClient.configureEndpoint("YOUR.ENDPOINT", 443)

        # For TLS mutual authentication with TLS ALPN extension
        # myMQTTClient.configureEndpoint("YOUR.ENDPOINT", 443)

        #self.myMQTTClient.configureCredentials("YOUR/ROOT/CA/PATH", "PRIVATE/KEY/PATH", "CERTIFICATE/PATH")
        self.myMQTTClient.configureCredentials(path+values["rootCAFile"], path+values["privateKeyFile"], path+values["certificateFile"])

        # For Websocket, we only need to configure the root CA
        # myMQTTClient.configureCredentials("YOUR/ROOT/CA/PATH")

        self.myMQTTClient.configureOfflinePublishQueueing(-1)  # Infinite offline Publish queueing
        self.myMQTTClient.configureDrainingFrequency(2)  # Draining: 2 Hz
        self.myMQTTClient.configureConnectDisconnectTimeout(10)  # 10 sec
        self.myMQTTClient.configureMQTTOperationTimeout(5)  # 5 sec
        self.myMQTTClient.connect()

    def publish(self, topic, payload):
        self.myMQTTClient.publish(topic, payload, 0)

    def subscribe(self, topic):
        self.myMQTTClient.subscribe(topic, 1, customCallback)

    def unsubscribe(self, topic):
        self.myMQTTClient.unsubscribe(topic)

    def disconnect(self):
        self.myMQTTClient.disconnect()


def readFromCSVFile(filename):
    dict = {}
    with open(filename) as file:
        file.readline()  # Skip the first line
        i = 1            # line0, line1, ...

        for line in file:
            data = line.strip().split(",")

            try:
                dict[data[0]] = data[1]
            except:
                print("WARNING: line " + i + " is malformed: " + line)

            i += 1
    return dict
