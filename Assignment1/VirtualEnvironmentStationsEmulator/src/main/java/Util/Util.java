package Util;

import java.io.*;
import java.math.BigInteger;
import java.net.URL;
import java.security.*;
import java.security.cert.Certificate;
import java.security.cert.CertificateException;
import java.security.cert.CertificateFactory;
import java.util.*;

public class Util {

    public static Map<String,String> readFromCSVFile(String filename) {
        HashMap<String,String> map = new HashMap<String,String>();

        try {
            File f = new File(filename);
            Scanner myReader = new Scanner(f);
            myReader.nextLine(); // Skip the first line
            int i = 1;

            while (myReader.hasNextLine()) {
                String line = myReader.nextLine();
                //System.out.println(line);
                String[] data = line.strip().split(",");

                // Put data in the map skipping malformed lines
                try {
                    map.put(data[0], data[1]);
                } catch (Exception e) {
                    System.out.println("WARNING: line " + i + " is malformed: "+line);
                }

                i += 1;
            }

            //System.out.println(map);
            myReader.close();
        } catch (Exception e) {
            System.out.println("An error occurred while reading the CSV file!");
            e.printStackTrace();
        }

        return map;
    }



    /*
     * Copyright 2016 Amazon.com, Inc. or its affiliates. All Rights Reserved.
     *
     * Licensed under the Apache License, Version 2.0 (the "License").
     * You may not use this file except in compliance with the License.
     * A copy of the License is located at
     *
     *  http://aws.amazon.com/apache2.0
     *
     * or in the "license" file accompanying this file. This file is distributed
     * on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either
     * express or implied. See the License for the specific language governing
     * permissions and limitations under the License.
    */

    /**
     * This is a helper class to facilitate reading of the configurations and
     * certificate from the resource files.
    */
    public static class KeyStorePasswordPair {
        public KeyStore keyStore;
        public String keyPassword;

        public KeyStorePasswordPair(KeyStore keyStore, String keyPassword) {
           this.keyStore = keyStore;
           this.keyPassword = keyPassword;
        }
    }

    public static KeyStorePasswordPair getKeyStorePasswordPair(final String certificateFile, final String privateKeyFile) {
        return getKeyStorePasswordPair(certificateFile, privateKeyFile, null);
    }

    public static KeyStorePasswordPair getKeyStorePasswordPair(final String certificateFile, final String privateKeyFile,
                                                                   String keyAlgorithm) {
        if (certificateFile == null || privateKeyFile == null) {
            System.out.println("Certificate or private key file missing");
            return null;
        }
        System.out.println("Cert file:" +certificateFile + " Private key: "+ privateKeyFile);

        final PrivateKey privateKey = loadPrivateKeyFromFile(privateKeyFile, keyAlgorithm);

        final List<Certificate> certChain = loadCertificatesFromFile(certificateFile);

        if (certChain == null || privateKey == null) return null;

        return getKeyStorePasswordPair(certChain, privateKey);
    }

    public static KeyStorePasswordPair getKeyStorePasswordPair(final List<Certificate> certificates, final PrivateKey privateKey) {
        KeyStore keyStore;
        String keyPassword;
        try {
            keyStore = KeyStore.getInstance(KeyStore.getDefaultType());
            keyStore.load(null);

            // randomly generated key password for the key in the KeyStore
            keyPassword = new BigInteger(128, new SecureRandom()).toString(32);

            Certificate[] certChain = new Certificate[certificates.size()];
            certChain = certificates.toArray(certChain);
            keyStore.setKeyEntry("alias", privateKey, keyPassword.toCharArray(), certChain);
        } catch (KeyStoreException | NoSuchAlgorithmException | CertificateException | IOException e) {
            System.out.println("Failed to create key store");
            return null;
        }

        return new KeyStorePasswordPair(keyStore, keyPassword);
    }

    private static List<Certificate> loadCertificatesFromFile(final String filename) {
        File file = new File(filename);
        if (!file.exists()) {
            System.out.println("Certificate file: " + filename + " is not found.");
            return null;
        }

        try (BufferedInputStream stream = new BufferedInputStream(new FileInputStream(file))) {
            final CertificateFactory certFactory = CertificateFactory.getInstance("X.509");
            return (List<Certificate>) certFactory.generateCertificates(stream);
        } catch (IOException | CertificateException e) {
            System.out.println("Failed to load certificate file " + filename);
        }
        return null;
    }

    private static PrivateKey loadPrivateKeyFromFile(final String filename, final String algorithm) {
        PrivateKey privateKey = null;

        File file = new File(filename);
        if (!file.exists()) {
            System.out.println("Private key file not found: " + filename);
            return null;
        }
        try (DataInputStream stream = new DataInputStream(new FileInputStream(file))) {
            privateKey = PrivateKeyReader.getPrivateKey(stream, algorithm);
        } catch (IOException | GeneralSecurityException e) {
            System.out.println("Failed to load private key from file " + filename);
        }

        return privateKey;
    }

}
