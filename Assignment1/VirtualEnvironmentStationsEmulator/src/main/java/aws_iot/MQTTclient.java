package aws_iot;

import Util.Util;
import com.amazonaws.services.iot.client.AWSIotMqttClient;
import com.amazonaws.services.iot.client.AWSIotQos;

import java.io.FileInputStream;
import java.security.KeyStore;
import java.util.Map;
import java.util.Objects;

public class MQTTclient {
    private AWSIotMqttClient client;

    public MQTTclient() {

    }

    public void initMQTTclient() {
        String path = "../keys/";

        // MSQTT over WebSocket
        // With AWS Educate I cannot create credentials for IAM users
        /*String clientEndpoint = "<prefix>.iot.<region>.amazonaws.com";       // replace <prefix> and <region> with your own
        String clientId = "<unique client id>";                              // replace with your own client ID. Use unique client IDs for concurrent connections.
        String awsAccessKeyId = "", awsSecretAccessKey = "", sessionToken = "";
        // AWS IAM credentials could be retrieved from AWS Cognito, STS, or other secure sources
        client = new AWSIotMqttClient(clientEndpoint, clientId, awsAccessKeyId, awsSecretAccessKey, sessionToken);*/

        // MSQTT over TLS 1.2
        Map<String, String> values = Util.readFromCSVFile(path + "key.txt");
        String keyStoreFile = values.get("filename");
        String keyStorePassword = values.get("keyStorePass");
        String keyPassword = values.get("keyPass");

        KeyStore keyStore = null;
        try {
            keyStore = KeyStore.getInstance(KeyStore.getDefaultType());
            keyStore.load(new FileInputStream(path + keyStoreFile), keyStorePassword.toCharArray());
        } catch (Exception e) {
            System.out.println("An error occurred while initializing the MQTT client!");
            e.printStackTrace();
            System.exit(1);
        }

        String clientEndpoint = values.get("clientEndpoint");
        String clientId = values.get("clientId");
        client = new AWSIotMqttClient(clientEndpoint, clientId, keyStore, keyPassword);

        // optional parameters can be set before connect()
        try {
            client.connect();
        } catch (Exception e) {
            e.printStackTrace();
            System.exit(1);
        }
    }

    // To publish a message to a topic using a blocking/non-blocking API
    public void publish(String topic, String payload, boolean block) {
        //String topic = "my/own/topic";
        //String payload = "any payload";
        AWSIotQos qos = AWSIotQos.QOS0;
        long timeout = 3000;   // milliseconds

        try {
            if (block)
                client.publish(topic, qos, payload);
            else {
                PublishListener message = new PublishListener(topic, qos, payload);
                client.publish(message, timeout);
            }
        } catch (Exception e) {
            e.printStackTrace();
        }
    }

    // To subscribe to a topic
    public void subscribe(String topicName) {
        //String topicName = "my/own/topic";
        AWSIotQos qos = AWSIotQos.QOS0;
        TopicListener topic = new TopicListener(topicName, qos);

        try {
            client.subscribe(topic);
        } catch (Exception e) {
            e.printStackTrace();
        }
    }

    public AWSIotMqttClient getClient() {
        return client;
    }

    @Override
    public boolean equals(Object o) {
        if (!(o instanceof MQTTclient))
            return false;

        return client.equals(((MQTTclient) o).getClient());
    }

    @Override
    public int hashCode() {
        return Objects.hash(client);
    }

}
