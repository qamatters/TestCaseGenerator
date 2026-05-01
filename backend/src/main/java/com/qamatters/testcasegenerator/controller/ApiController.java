package com.qamatters.testcasegenerator.controller;

import org.springframework.web.bind.annotation.*;

import java.util.*;

@RestController
@RequestMapping("/api")
@CrossOrigin
public class ApiController {
  @GetMapping("/jira/{storyId}")
  public Map<String, String> jira(@PathVariable String storyId) {
    return Map.of("details", "Story " + storyId + ": As a QA, I need complete acceptance criteria with edge cases.");
  }

  @PostMapping("/ai/review")
  public Map<String, String> review(@RequestBody Map<String, String> payload) {
    return Map.of("review", "QA Review: include API contracts, negative paths, test data matrix, and performance NFRs.");
  }

  @PostMapping("/ai/generate")
  public Map<String, List<Map<String, String>>> generate(@RequestBody Map<String, Object> payload) {
    List<Map<String, String>> tcs = new ArrayList<>();
    int count = (int) payload.getOrDefault("testCount", 5);
    for (int i=1; i<=count; i++) {
      tcs.add(Map.of("testName", "Generated TC " + i, "objective", "Validate behavior", "preCondition", "User authenticated", "steps", "1. Open page; 2. Submit form", "testData", "Sample test data", "expectedResult", "Expected outcome", "priority", "Medium"));
    }
    return Map.of("testCases", tcs);
  }
}
