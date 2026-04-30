<p align="center">
  <img src="public/logo.svg" alt="Benchmodel" width="120" />
</p>

<h1 align="center">Benchmodel</h1>

<p align="center">
  <strong>Postman for open source LLMs. Local first. Ollama first.</strong>
</p>

<p align="center">
  <a href="LICENSE"><img alt="license" src="https://img.shields.io/badge/license-MIT-blue.svg" /></a>
  <a href="#"><img alt="build" src="https://img.shields.io/badge/build-passing-brightgreen.svg" /></a>
  <a href="#"><img alt="npm" src="https://img.shields.io/badge/npm-v0.1.0-orange.svg" /></a>
</p>

## Why Benchmodel

- **Local first.** Runs against your own Ollama, vLLM, llama.cpp, LM Studio, or any OpenAI compatible endpoint. Nothing leaves your machine.
- **Versionable prompts.** Collections live as YAML or JSON files. Commit them to Git, review them in pull requests, diff them like code.
- **Side by side comparisons.** Pick a prompt, fan it out across many (provider, model) pairs in parallel, and see latency, tokens, cost, and assertion results in one matrix.

## Demo

> Replace this section with an animated GIF once a recording is available.

![Benchmodel demo placeholder](docs/demo-placeholder.gif)

## Quick start

### Docker

```bash
docker compose up
# open http://localhost:3737
```

### npm

```bash
npx benchmodel
# data is stored in ~/.benchmodel/data.db
# open http://localhost:3737
```

### Local development

```bash
pnpm install
pnpm dev
# open http://localhost:3737
```

## Collection schema

Collections are plain YAML or JSON files. Both formats use the same shape and are validated with Zod on import.

```yaml
name: "Customer support classifier"           # required, free text
description: "Tests for routing tickets"      # optional
prompts:                                      # required, at least one entry
  - name: "classify_ticket"                   # required, used in the UI
    system: "You are a classifier..."         # optional, system message
    user: "Classify this ticket: {{ticket}}"  # required, supports {{variables}}
    variables:                                # optional, default values
      ticket: "My order is late"
    assertions:                               # optional, run on every output
      - type: contains
        value: "shipping"
      - type: regex
        pattern: "ABC-\\d+"
        flags: "i"
      - type: json_schema
        schema:
          type: object
          properties:
            category: { type: string }
            priority: { type: string }
```

Three assertion types are supported in MVP: `contains`, `regex`, and `json_schema` (validated with Ajv).

See full examples in [examples/collection.example.yaml](examples/collection.example.yaml) and [examples/collection.example.json](examples/collection.example.json).

## How it compares

| Tool | Local first | Versionable prompts | Side by side compare | Open source |
|---|---|---|---|---|
| Benchmodel | yes | yes (YAML or JSON in Git) | yes (matrix UI) | yes (MIT) |
| Open WebUI | yes | partial | no | yes |
| Promptfoo | yes | yes (CLI focused) | yes (CLI table) | yes |
| OpenRouter | no (cloud) | no | partial | no |
| LM Studio | yes | no | no | no (proprietary) |

Benchmodel's specific bet is to combine the developer ergonomics of Promptfoo with the visual feedback of Postman, while staying friendly to local models.

## Roadmap

**MVP (current)**
- Ollama and OpenAI compatible providers
- Collections in YAML and JSON
- Variables and three assertion types
- Side by side comparison matrix
- Run history with metrics and cost estimate
- Export snippets in Python and curl

**v2**
- LLM as judge assertions
- Function calling and tool use
- Multi user with roles
- OpenTelemetry tracing for runs
- Streaming output in the matrix
- Embedded Git sync for collections

## Contributing

We love contributions. See [CONTRIBUTING.md](CONTRIBUTING.md) for setup, conventions, and the PR checklist.

Look for issues labeled `good first issue` or `help wanted` to get started.

## License

[MIT](LICENSE)
