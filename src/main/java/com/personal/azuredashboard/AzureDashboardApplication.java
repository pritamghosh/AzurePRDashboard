package com.personal.azuredashboard;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.boot.context.properties.ConfigurationPropertiesScan;

@SpringBootApplication
@ConfigurationPropertiesScan
public class AzureDashboardApplication {

    public static void main(String[] args) {
        SpringApplication.run(AzureDashboardApplication.class, args);
    }
}

