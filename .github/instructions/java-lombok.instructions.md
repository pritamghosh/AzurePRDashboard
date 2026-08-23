---
applyTo: "**/*.java"
---

# Java – Use Lombok to Eliminate Boilerplate

All Java source files in this project must use [Lombok](https://projectlombok.org/) wherever it removes boilerplate.

## Required annotations

| Scenario | Annotation(s) to use |
|---|---|
| POJO / model with all getters + setters | `@Data` |
| Immutable value object (getters only, no setters) | `@Getter` on the class |
| Only getters needed (Jackson deserialises via field) | `@Getter` on the class |
| All-args constructor | `@AllArgsConstructor` |
| No-args constructor | `@NoArgsConstructor` |
| Spring `@Component` / `@Service` / `@RestController` with `final` fields | `@RequiredArgsConstructor` (replaces hand-written constructor injection) |
| Builder pattern | `@Builder` |
| `@ConfigurationProperties` POJO | `@Data` (Spring needs setters for binding) |
| Jackson model classes | `@Getter @Setter @NoArgsConstructor` (avoid `@Data` to preserve `@JsonProperty` / `@JsonIgnoreProperties`) |

## Rules

* **Never write manual getters, setters, or constructors** that Lombok can generate.
* Keep `@JsonIgnoreProperties(ignoreUnknown = true)` and `@JsonProperty` annotations — Lombok does not replace them.
* Use `@RequiredArgsConstructor` on Spring beans; declare injected dependencies as `private final`.
* Do not use `@Data` on Jackson model classes — use `@Getter @Setter @NoArgsConstructor` instead to avoid `equals`/`hashCode` issues with Jackson.
* Lombok must be present as a dependency in `pom.xml` before applying annotations.
* **Never use inline (fully-qualified) package declarations** for annotations or types — always add a proper `import` statement at the top of the file and use the simple name. For example, write `@Getter` with `import lombok.Getter;`, not `@lombok.Getter`. Apply the same rule to Jackson annotations (`@JsonIgnoreProperties`, `@JsonProperty`) and any other annotation or type.

