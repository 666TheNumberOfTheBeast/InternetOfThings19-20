package aws_iot;

import com.amazonaws.services.iot.client.AWSIotMessage;
import com.amazonaws.services.iot.client.AWSIotQos;

import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;

public class PublishListener extends AWSIotMessage {

    public PublishListener(String topic, AWSIotQos qos, String payload) {
        super(topic, qos, payload);
    }

    @Override
    public void onSuccess() {
        LocalDateTime dateTime = LocalDateTime.now(); // Gets the current date and time
        DateTimeFormatter formatter = DateTimeFormatter.ofPattern("dd-MM-yyyy HH:mm:ss");
        System.out.println(dateTime.format(formatter) + ": >>> " + getTopic() + " " + getStringPayload());
    }

    @Override
    public void onFailure() {
        System.out.println(System.currentTimeMillis() + ": publish failed for " + getStringPayload());
    }

    @Override
    public void onTimeout() {
        System.out.println(System.currentTimeMillis() + ": publish timeout for " + getStringPayload());
    }

}
