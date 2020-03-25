import aws_iot.MQTTclient;
import java.util.UUID;

// Launch the program without GUI
public class Main {

    public static void main(String[] args) {
        String uniqueID = UUID.randomUUID().toString();
        VirtualEnvironmentStation ves = new VirtualEnvironmentStation(uniqueID);
        System.out.println("New Virtual Environment Station started with id = " + uniqueID);

        Thread t = new Thread(ves);
        t.start();
    }

}
