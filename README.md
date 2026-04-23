# InSpectres

**A paranormal investigation RPG system for [Foundry VTT](https://foundryvtt.com/)**

InSpectres is a tabletop role-playing game where players run a paranormal investigation agency. This repository contains the Foundry VTT system plugin and tools for managing long-running campaigns.

## Quick Start

### Install from Release

1. Download the latest release from [GitHub Releases](https://github.com/phaedrus1992/inspectres-vtt/releases)
2. Extract `inspectres.zip` to your Foundry systems folder:
   - **Windows:** `C:\Users\<username>\AppData\Local\FoundryVTT\Data\systems\`
   - **macOS:** `~/Library/Application Support/FoundryVTT/Data/systems/`
   - **Linux:** `~/.local/share/FoundryVTT/Data/systems/`
3. Launch Foundry, create a world, select **InSpectres** as the system

See [Installation from Release](https://phaedrus1992.github.io/inspectres-vtt/install/from-release) for detailed steps.

### Install from Source (Development)

```bash
git clone https://github.com/phaedrus1992/inspectres-vtt.git
cd inspectres-vtt/foundry
npm install
npm run build
# Link or copy foundry/dist to your Foundry systems folder
```

See [Installation from Source](https://phaedrus1992.github.io/inspectres-vtt/install/from-source) for full development setup.

## Documentation

Full documentation is available at **[https://phaedrus1992.github.io/inspectres-vtt/](https://phaedrus1992.github.io/inspectres-vtt/)**

- **[Getting Started](https://phaedrus1992.github.io/inspectres-vtt/gameplay/getting-started)** — Run your first session
- **[Mechanics](https://phaedrus1992.github.io/inspectres-vtt/gameplay/mechanics)** — Complete rules reference
- **[Development Setup](https://phaedrus1992.github.io/inspectres-vtt/development/setup)** — Build from source

## Docker

Foundry VTT can be run locally or self-hosted using Docker. The InSpectres system is pre-installed automatically.

See [docs/docker.md](docs/current/docker.md) for full setup instructions.

## Contributing

Contributions are welcome! See [Contributing](https://phaedrus1992.github.io/inspectres-vtt/development/contributing) for guidelines.

## License

This project is licensed under the MIT License. See LICENSE for details.

## Official Resources

- **InSpectres Rulebook** — The official game rules
- **Rules Spec** — `reference/inspectres-rules-spec.md` in this repository (comprehensive rules reference)
- **GitHub Issues** — Report bugs or suggest features at [github.com/phaedrus1992/inspectres-vtt/issues](https://github.com/phaedrus1992/inspectres-vtt/issues)

