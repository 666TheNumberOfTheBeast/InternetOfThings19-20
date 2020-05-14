import aws_iot.MQTTclient;
import com.google.gson.JsonObject;

import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.Objects;

public class VirtualEnvironmentStation implements Runnable {
    // Constants
    private final double MIN_VALUE_TEMPERATURE = -50;
    private final double MAX_VALUE_TEMPERATURE = 50;
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
    private GUImain gui;
    private MQTTclient mqttClient;

    public VirtualEnvironmentStation(String id) {
        this.id = id;
    }

    public VirtualEnvironmentStation(String id, GUImain gui) {
        this.id = id;
        this.gui = gui;
    }

    // Return a random value N such that a <= N <= b
    private double genValue(double min, double max) {
        double v = (Math.random() * ((max-min) + 1)) + min;
        return Math.floor(v * 100) / 100; // Return only 2 decimal digits
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

        mqttClient = new MQTTclient(id);
        mqttClient.initMQTTclient();

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

            LocalDateTime now = LocalDateTime.now(); // Gets the current date and time
            DateTimeFormatter formatter = DateTimeFormatter.ofPattern("dd-MM-yyyy HH:mm:ss");
            String dateTime = now.format(formatter);

            if (gui != null)
                gui.write(separator + dateTime + "\n" + this.toString() + separator);
            else
                System.out.println(separator + dateTime + "\n" + this.toString() + separator);

            // Since Amazon DynamoDB is NoSQL cannot exist two tuples with same primary key,
            // so I cannot send multiple messaged with same id and dateTime
            /*mqttClient.publish("sensor/id/station"+id, id, false);
            mqttClient.publish("sensor/dateTime/station"+id, dateTime, false);
            mqttClient.publish("sensor/temperature/station"+id, String.valueOf(temperature), false);
            mqttClient.publish("sensor/humidity/station"+id, String.valueOf(humidity), false);
            mqttClient.publish("sensor/windDirection/station"+id, String.valueOf(windDirection), false);
            mqttClient.publish("sensor/windIntensity/station"+id, String.valueOf(windIntensity), false);
            mqttClient.publish("sensor/rainHeight/station"+id, String.valueOf(rainHeight), false);*/

            // Since Amazon DynamoDB is NoSQL cannot exist two tuples with same primary key,
            // so send a JSON
            JsonObject json = new JsonObject();
            json.addProperty("Id", id);
            json.addProperty("dateTime", dateTime);
            json.addProperty("temperature", temperature);
            json.addProperty("humidity", humidity);
            json.addProperty("windDirection", windDirection);
            json.addProperty("windIntensity", windIntensity);
            json.addProperty("rainHeight", rainHeight);

            mqttClient.publish("sensor/station/"+id, json.toString(), false);

            try{
                Thread.sleep(5000);
            } catch (Exception e) {
                e.printStackTrace();
            }
        }
    }

    public void stop() {
        suspended = true;
        mqttClient.disconnect();
    }

    public void pause() {
        suspended = true;
    }

    public void resume() {
        suspended = false;
    }

    public boolean isFired() {
        return fired;
    }

    public boolean isRunning() {
        return !suspended;
    }

}
