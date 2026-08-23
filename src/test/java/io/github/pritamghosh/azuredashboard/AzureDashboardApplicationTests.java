package io.github.pritamghosh.azuredashboard;

import org.junit.jupiter.api.Test;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.TestPropertySource;

@SpringBootTest
@TestPropertySource(properties = {
        "azure.devops.pat=test-pat",
        "azure.devops.organization=test-org",
        "azure.devops.project=test-project"
})
class AzureDashboardApplicationTests {

    @Test
    void contextLoads() {
        // Verifies the Spring application context starts without errors.
    }
}

