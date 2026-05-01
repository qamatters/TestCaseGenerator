package com.qamatters.testcasegenerator.controller;

import org.springframework.web.bind.annotation.*;

import java.util.*;

@RestController
@RequestMapping("/api")
@CrossOrigin
public class ApiController {

  @GetMapping("/jira/{storyId}")
  public Map<String, String> jira(@PathVariable String storyId) {
    Map<String, String> stories = Map.of(
            "QA-101", "As a shopper, I can add products to cart. Acceptance: qty update, remove, stock validation.",
            "PROJ-1", "As an admin, I can deactivate users. Acceptance: active sessions invalidated, audit trail added.",
            "SEC-12", "As a user, password reset requires OTP and expires in 10 minutes."
    );
    return Map.of("details", stories.getOrDefault(storyId, "Mock story for " + storyId + ": add acceptance criteria and negative scenarios."));
  }

  @GetMapping("/projects")
  public Map<String, List<Map<String, String>>> projects() {
    return Map.of("projects", List.of(
            Map.of("key", "QAT", "name", "QA Transformation"),
            Map.of("key", "PROJ", "name", "Customer Portal"),
            Map.of("key", "SEC", "name", "Security Hardening")
    ));
  }

  @GetMapping("/projects/{projectKey}/folders")
  public Map<String, List<String>> folders(@PathVariable String projectKey) {
    Map<String, List<String>> db = new HashMap<>();
    db.put("QAT", List.of("Regression/UI", "Regression/API", "Smoke/Web"));
    db.put("PROJ", List.of("Sprint-24/Auth", "Sprint-24/Profile", "Release-3/Checkout"));
    db.put("SEC", List.of("OWASP/Injection", "OWASP/Auth", "Performance/Load"));
    return Map.of("folders", db.getOrDefault(projectKey, List.of("General")));
  }

  @PostMapping("/ai/review")
  public Map<String, String> review(@RequestBody Map<String, String> payload) {
    String details = payload.getOrDefault("jiraDetails", "");
    String review = "QA Review: include boundary values, invalid inputs, API status code matrix, traceability to ACs.";
    if (details.length() < 40) review += " Warning: Story details look short; add clear ACs.";
    return Map.of("review", review);
  }

  @PostMapping("/ai/generate")
  public Map<String, List<Map<String, String>>> generate(@RequestBody Map<String, Object> payload) {
    int count = (int) payload.getOrDefault("testCount", 5);
    String type = ((List<String>) payload.getOrDefault("types", List.of("Functional"))).stream().findFirst().orElse("Functional");
    List<Map<String, String>> tcs = new ArrayList<>();
    for (int i=1; i<=count; i++) {
      tcs.add(Map.of(
              "testName", type + " TC " + i,
              "objective", "Validate " + type + " behavior for selected story",
              "preCondition", "User has valid environment + required permissions",
              "steps", "1. Open module\n2. Perform action " + i + "\n3. Verify response",
              "testData", "{\"input\":\"sample-" + i + "\",\"role\":\"qa-user\"}",
              "expectedResult", "System behaves as defined in acceptance criteria",
              "priority", i % 3 == 0 ? "High" : "Medium"
      ));
    }
    return Map.of("testCases", tcs);
  }

  @PostMapping("/publish/selected")
  public Map<String, String> publishSelected(@RequestBody Map<String, Object> payload) {
    return Map.of("status", "Mock publish success", "message", "Selected test cases published to Zephyr (mock).");
  }

  @PostMapping("/publish/bulk")
  public Map<String, String> publishBulk(@RequestBody Map<String, Object> payload) {
    return Map.of("status", "Mock bulk publish success", "message", "All test cases published to story (mock).");
  }
}
