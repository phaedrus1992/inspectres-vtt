---
sidebar_position: 1
---

# Installation from Release

Download and install the latest stable release of InSpectres VTT.

## Prerequisites

- **Foundry VTT 13+** — [Download from foundryvtt.com](https://foundryvtt.com/) if you don't have it
- **Foundry data folder location** — You need to know where your Foundry system files are stored

## Installation Steps

### 1. Download the Latest Release

1. Go to the [InSpectres VTT releases page](https://github.com/phaedrus1992/inspectres-vtt/releases)
2. Find the latest release (top of the page)
3. Download the `inspectres.zip` file

### 2. Extract to Your Foundry Systems Folder

1. Extract `inspectres.zip` to your computer (temporary location is fine)
2. You should have a folder named `inspectres` inside the ZIP

**Copy the `inspectres` folder to your Foundry data directory:**

- **Windows:** `C:\Users\<username>\AppData\Local\FoundryVTT\Data\systems\`
- **macOS:** `~/Library/Application Support/FoundryVTT/Data/systems/`
- **Linux:** `~/.local/share/FoundryVTT/Data/systems/`

After copying, your folder structure should look like:
```
systems/
  inspectres/
    inspectres.js
    styles/
    templates/
    ... (other files)
```

### 3. Launch Foundry and Activate the System

1. Start Foundry VTT
2. Create a new world (or open an existing one)
3. In the world creation dialog, select **InSpectres VTT** from the System dropdown
4. Finish creating the world and launch it

### 4. Verify Installation

Once in the world, you're ready to play. Check that:
- InSpectres VTT is listed in **World Settings → System**
- You can create a new **Agent** (player character)
- You can create a new **Franchise** (your investigation agency)

## Troubleshooting

### "System not found" or blank system dropdown

- Verify the `inspectres` folder is in the correct `systems/` directory (see step 2 above)
- Restart Foundry completely (close and reopen)
- Check folder capitalization — must be lowercase `inspectres`

### Windows: "Access Denied" when copying files

- Right-click the `inspectres` folder and select **Properties**
- Uncheck **Read-only** if it's checked
- Click **Apply** and retry

### macOS: "Cannot open because it is from an unidentified developer"

- Right-click the downloaded ZIP file and select **Open**
- macOS will now allow it

### Installation folder is confusing / unclear

See Foundry's official documentation on [system installation](https://foundryvtt.com/article/manifest/) for detailed guidance with screenshots.

## Next Steps

Once installation is verified, check out [Getting Started](../gameplay/getting-started.md) to run your first session.
