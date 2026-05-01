package com.qamatters.testcasegenerator.config;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.springframework.stereotype.Service;

import java.io.File;

@Service
public class ExternalConfigService {
  private final ObjectMapper mapper = new ObjectMapper();
  public JsonNode loadConfig() {
    try {
      String path = System.getenv().getOrDefault("APP_EXTERNAL_CONFIG", "../external-config/sample-config.json");
      return mapper.readTree(new File(path));
    } catch (Exception e) {
      return mapper.createObjectNode();
    }
  }
}
