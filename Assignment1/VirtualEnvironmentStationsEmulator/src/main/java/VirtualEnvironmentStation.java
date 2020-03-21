import aws_iot.MQTTclient;

import javax.swing.JTextArea;
import java.util.Objects;

public class VirtualEnvironmentStation implements Runnable {
    // Constants
    private final double MIN_VALUE_TEMPERATURE = -50;
    private final double MAX_VALUE_TEMPERATURE = -50;
    private final double MIN_VALUE_HUMIDITY = 0;
    private final double MAX_VALUE_HUMIDITY = 100;
    private final double MIN_VALUE_WIND_DIRECTION = 0;
    private final double MAX_VALUE_WIND_DIRECTION = 360;
    private final double MIN_VALUE_WIND_INTENSITY = 0;
    private final double MAX_VALUE_WIND_INTENSITY = 100;
    private final double MIN_VALUE_RAIN_HEIGHT = 0;
    private final double MAX_VALUE_RAIN_HEIGHT = 50;

    // Variables
    private String id;
    private double temperature, humidity, windDirection, windIntensity, rainHeight;
    private boolean fired, suspended;
    private JTextArea textArea;
    private MQTTclient mqttClient;

    public VirtualEnvironmentStation(String id, MQTTclient mqttClient) {
        this.id = id;
        this.mqttClient = mqttClient;
    }

    public VirtualEnvironmentStation(String id, JTextArea textArea, MQTTclient mqttClient) {
        this.id = id;
        this.textArea = textArea;
        this.mqttClient = mqttClient;
    }

    // Return a random value N such that a <= N <= b
    private double genValue(double min, double max) {
        return (Math.random() * ((max-min) + 1)) + min;
    }

    public String getId() {
        return id;
    }

    public double getTemperature() {
        return temperature;
    }

    public double getHumidity() {
        return humidity;
    }

    public double getWindDirection() {
        return windDirection;
    }

    public double getWindIntensity() {
        return windIntensity;
    }

    public double getRainHeight() {
        return rainHeight;
    }

    @Override
    public boolean equals(Object o) {
        if (!(o instanceof VirtualEnvironmentStation))
            return false;

        return id.equals(((VirtualEnvironmentStation) o).getId());
    }

    @Override
    public int hashCode() {
        return Objects.hash(temperature, humidity, windDirection, windIntensity, rainHeight);
    }

    @Override
    public String toString() {
        return "id = " + id
                + "\nTemperature = " + getTemperature()
                + "\nHumidity = " + getHumidity()
                + "\nWind direction = " + getWindDirection()
                + "\nWind intensity = " + getWindIntensity()
                + "\nRain height = " + getRainHeight()
                + "\n";
    }

    @Override
    public void run() {
        fired = true;
        String separator = "********************\n";

        while(fired) {
            while (suspended) {
                try{
                    Thread.sleep(5000);
                } catch (Exception e) {
                    e.printStackTrace();
                }
            }

            temperature = genValue(MIN_VALUE_TEMPERATURE, MAX_VALUE_TEMPERATURE);
            humidity = genValue(MIN_VALUE_HUMIDITY, MAX_VALUE_HUMIDITY);
            windDirection = genValue(MIN_VALUE_WIND_DIRECTION, MAX_VALUE_WIND_DIRECTION);
            windIntensity = genValue(MIN_VALUE_WIND_INTENSITY, MAX_VALUE_WIND_INTENSITY);
            rainHeight = genValue(MIN_VALUE_RAIN_HEIGHT, MAX_VALUE_RAIN_HEIGHT);

            if (textArea != null)
                textArea.append(separator + this.toString() + separator);
            else
                System.out.println(separator + this.toString() + separator);

            mqttClient.publish("sensor/temperature/station"+id, String.valueOf(temperature), false);
            mqttClient.publish("sensor/humidity/station"+id, String.valueOf(humidity), false);
            mqttClient.publish("sensor/windDirection/station"+id, String.valueOf(windDirection), false);
            mqttClient.publish("sensor/windIntensity/station"+id, String.valueOf(windIntensity), false);
            mqttClient.publish("sensor/rainHeight/station"+id, String.valueOf(rainHeight), false);

            try{
                Thread.sleep(5000);
            } catch (Exception e) {
                e.printStackTrace();
            }
        }
    }

    public void stop() {
        suspended = true;
    }

    public void resume() {
        suspended = false;
    }

}
