# GNOME Search Scripts Extension

A GNOME Shell extension that allows you to run scripts from a folder directly from the GNOME Shell search.

## Features

- Run scripts directly from GNOME Shell search
- Organize scripts in folders
- Customize script metadata (name, description, icon)
- Different notification styles (status, output, none)

## TypeScript Implementation

This extension is implemented in TypeScript and uses esbuild for compilation. The TypeScript code is compiled to JavaScript during the build process.

## Development Setup

### Prerequisites

- Node.js and npm
- GNOME Shell development tools
- TypeScript

### Installation

1. Clone the repository:
   ```
   git clone https://github.com/yourusername/gnome-search-scripts.git
   cd gnome-search-scripts
   ```

2. Install dependencies:
   ```
   npm install
   ```

3. Build the extension:
   ```
   make build
   ```

4. Install the extension to your GNOME Shell:
   ```
   make install
   ```

5. Restart GNOME Shell (Alt+F2, type 'r', press Enter) or log out and log back in.

6. Enable the extension using GNOME Extensions app or the Extensions website.

### Development Workflow

1. Make changes to the TypeScript files in the `src/` directory.
2. Build the extension:
   ```
   make build
   ```
   or use watch mode for automatic rebuilding:
   ```
   npm run watch
   ```
3. Install the extension:
   ```
   make install
   ```
4. Restart GNOME Shell to load the changes.

### Project Structure

- `src/`: TypeScript source files
  - `extension.ts`: Main extension entry point
  - `prefs.ts`: Preferences dialog
  - `lib/`: Library modules
    - `constants.ts`: Constants and settings keys
    - `fileManager.ts`: File operations and monitoring
    - `notificationManager.ts`: Notification handling
    - `scriptProvider.ts`: Main script provider
    - `searchHandler.ts`: Search functionality
    - `utils.ts`: Utility functions
- `dist/`: Compiled JavaScript files (generated during build)
- `gnome-search-scripts@example.com/`: Original JavaScript files

### Building for Distribution

To create a zip file for distribution:

```
make pack
```

This will create a `gnome-search-scripts.zip` file that can be uploaded to the GNOME Extensions website.

## Usage

1. Create a directory for your scripts (default: `~/.config/gnome-search-scripts`).
2. Add executable scripts with the `.sh` extension.
3. Add metadata to your scripts using comments:
   ```bash
   #!/bin/bash
   # Name: My Script
   # Description: This script does something useful
   # Icon: utilities-terminal-symbolic
   # Notify: stdout

   echo "Hello, GNOME Shell!"
   ```
4. Open the GNOME Shell overview and start typing the name of your script.
5. Click on the script to run it.

## License

This project is licensed under the GPL-3.0 License - see the LICENSE file for details.
