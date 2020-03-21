package Util;

import java.io.File;
import java.util.HashMap;
import java.util.Map;
import java.util.Scanner;

public class Util {

    public static Map<String,String> readFromCSVFile(String filename) {
        HashMap<String,String> map = new HashMap<String,String>();

        try {
            File f = new File(filename);
            Scanner myReader = new Scanner(f);
            myReader.nextLine(); // Skip the first line

            while (myReader.hasNextLine()) {
                String line = myReader.nextLine();
                //System.out.println(line);
                String[] data = line.strip().split(",");

                // Put data in the map skipping malformed lines
                try {
                    map.put(data[0], data[1]);
                } catch (Exception e) {
                }
            }

            //System.out.println(map);
            myReader.close();
        } catch (Exception e) {
            System.out.println("An error occurred while reading the CSV file!");
            e.printStackTrace();
        }

        return map;
    }

}
