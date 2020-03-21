import aws_iot.MQTTclient;
import java.util.UUID;

// Launch the program without GUI
public class Main {

    public static void main(String[] args) {
        MQTTclient mqttClient = new MQTTclient();
        mqttClient.initMQTTclient();

        String uniqueID = UUID.randomUUID().toString();
        VirtualEnvironmentStation ves = new VirtualEnvironmentStation(uniqueID, mqttClient);
        System.out.println("New Virtual Environment Station started with id = " + uniqueID);

        Thread t = new Thread(ves);
        t.start();
    }

}
