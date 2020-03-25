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
    private String clientId;  // the client ID uniquely identify a MQTT connection. Two clients with the same client ID are not allowed to be connected concurrently to a same endpoint.


    public MQTTclient(String id) {
        this.clientId = id;
    }

    public void initMQTTclient() {
        String path = "../keys/";
        Map<String, String> values = Util.readFromCSVFile(path + "key.txt");

        String clientEndpoint = values.get("clientEndpoint");

        // MSQTT over WebSocket
        // With AWS Educate these credentials are updated each 3 hours
        String awsAccessKeyId = "<your-access-key>";
        String awsSecretAccessKey = "<your-secret-key>";
        String sessionToken = "<your-token>";
        // AWS IAM credentials could be retrieved from AWS Cognito, STS, or other secure sources
        client = new AWSIotMqttClient(clientEndpoint, clientId, awsAccessKeyId, awsSecretAccessKey, sessionToken);//*/


        // MSQTT over TLS 1.2 (generating KeyStore from certificate and private key)
        /*String certificateFile = path + values.get("certificateFile");             // X.509 based certificate file
        String privateKeyFile = path + values.get("privateKeyFile");              // PKCS#1 or PKCS#8 PEM encoded private key file

        Util.KeyStorePasswordPair pair = Util.getKeyStorePasswordPair(certificateFile, privateKeyFile);
        client = new AWSIotMqttClient(clientEndpoint, clientId, pair.keyStore, pair.keyPassword);*/


        // MSQTT over TLS 1.2 (loading key store directly from a file)
        /*String keyStoreFile = values.get("filename");
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

        //System.out.println(keyStoreFile);
        //System.out.println(keyStorePassword);
        //System.out.println(keyPassword);
        //System.out.println(clientEndpoint);
        //System.out.println(clientId);

        client = new AWSIotMqttClient(clientEndpoint, clientId, keyStore, keyPassword);
        System.out.println(client);//*/

        // optional parameters can be set before connect()
        try {
            client.connect();
        } catch (Exception e) {
            System.out.println("An error occurred while connecting the MQTT client!");
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
            System.out.println("An error occurred while publishing a message with the MQTT client!");
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
            System.out.println("An error occurred while subscribing to a topic with the MQTT client!");
            e.printStackTrace();
        }
    }

    public void disconnect() {
        try {
            client.disconnect();
        } catch (Exception e) {
            System.out.println("An error occurred while disconnecting the MQTT client!");
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
