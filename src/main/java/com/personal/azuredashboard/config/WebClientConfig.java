package com.personal.azuredashboard.config;

import lombok.extern.slf4j.Slf4j;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.web.reactive.function.client.ExchangeFilterFunction;
import org.springframework.web.reactive.function.client.WebClient;
import reactor.core.publisher.Mono;

import java.nio.charset.StandardCharsets;
import java.util.Base64;

/**
 * Creates the WebClient bean used to call the Azure DevOps REST API.
 *
 * Azure DevOps uses HTTP Basic Authentication where:
 *   username = "" (empty)
 *   password = PAT
 *
 * The encoded header value is: "Basic " + Base64(":" + pat)
 *
 * Set {@code azure.devops.debug-logging: true} in application-local.yml to log
 * every outgoing request URL and incoming response status at DEBUG level.
 */
@Slf4j
@Configuration
public class WebClientConfig {

    /**
     * Single WebClient pre-configured for all Azure DevOps API calls.
     * Base URL: https://dev.azure.com/{organization}
     *
     * When {@code azure.devops.debug-logging} is {@code true}, request and
     * response details are logged via {@link ExchangeFilterFunction}.
     */
    @Bean("azureDevOpsWebClient")
    public WebClient azureDevOpsWebClient(AzureDevOpsProperties props) {
        String encodedPat = encodePatToBasicAuth(props.getPat());
        WebClient.Builder builder = WebClient.builder()
                .baseUrl("https://dev.azure.com/" + props.getOrganization())
                .defaultHeader("Authorization", "Basic " + encodedPat)
                .defaultHeader("Accept", "application/json")
                .codecs(config -> config.defaultCodecs().maxInMemorySize(10 * 1024 * 1024));

        if (props.isDebugLogging()) {
            log.info("[AzureDevOps] Debug logging enabled — all requests and responses will be logged.");
            builder.filter(logRequest()).filter(logResponse());
        }

        return builder.build();
    }

    // ── Logging filters ────────────────────────────────────────────────────

    /**
     * Logs the HTTP method and full request URL.
     * The {@code Authorization} header is intentionally omitted to avoid leaking the PAT.
     */
    private static ExchangeFilterFunction logRequest() {
        return ExchangeFilterFunction.ofRequestProcessor(request -> {
            log.debug("[AzureDevOps] → {} {}", request.method(), request.url());
            request.headers().forEach((name, values) -> {
                if (!name.equalsIgnoreCase("Authorization")) {
                    log.debug("[AzureDevOps]   {}: {}", name, String.join(", ", values));
                }
            });
            return Mono.just(request);
        });
    }

    /**
     * Logs the HTTP response status code.
     * Does NOT consume the body so downstream processing is unaffected.
     */
    private static ExchangeFilterFunction logResponse() {
        return ExchangeFilterFunction.ofResponseProcessor(response -> {
            log.debug("[AzureDevOps] ← {}", response.statusCode());
            return Mono.just(response);
        });
    }

    // PAT is passed as the password part of HTTP Basic Auth; username is left empty.
    private String encodePatToBasicAuth(String pat) {
        String credentials = ":" + pat;
        return Base64.getEncoder().encodeToString(credentials.getBytes(StandardCharsets.UTF_8));
    }
}
