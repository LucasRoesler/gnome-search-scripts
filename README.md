# GNOME Search Scripts

A GNOME Shell extension that allows you to execute scripts directly from the GNOME Shell search overview. This extension is perfect for users who frequently run scripts and want quick access to them.

## Features

- Run executable scripts from a customizable directory
- Display script names, descriptions, and icons in search results
- Configure notifications for script execution (status, output, or silent)
- Customize the default icon for scripts
- File monitoring to automatically detect script changes
- Easy integration with GNOME Shell's search provider interface

## Installation

1. **Clone the Repository**
   ```bash
   git clone https://github.com/LucasRoesler/gnome-search-scripts.git
   cd gnome-search-scripts
   ```

2. **Install the Extension**
   Place the extension in your GNOME Shell extensions directory:
   ```bash
   cp -r gnome-search-scripts@example.com ~/.local/share/gnome-shell/extensions/
   ```

3. **Enable the Extension**
   Restart GNOME Shell:
   - On X11: Press Alt+F2, type 'r', press Enter
   - On Wayland: Log out and log back in

   Then enable the extension using GNOME Extensions app or run:
   ```bash
   gnome-extensions enable gnome-search-scripts@example.com
   ```

**Compatibility:** This extension is designed for GNOME Shell 45 and later.

## Usage

1. **Script Location**
   By default, scripts are stored in `~/.config/gnome-search-scripts/`. You can change this location in the extension preferences.

2. **Script Format**
   Create executable scripts with a shebang and metadata comments:

   ```bash
   #!/bin/bash
   # Name: My Script
   # Description: This script does something useful
   # Icon: utilities-terminal-symbolic
   # Notify: stdout

   echo "Hello, GNOME Shell!"
   ```

   **Metadata Options:**
   - `Name`: The display name in search results (required)
   - `Description`: A brief explanation of what the script does
   - `Icon`: The icon name to display (uses GNOME icon names)
   - `Notify`: How to notify after execution (status, stdout, or none)

3. **Subdirectory Support**
   Scripts can be organized in subdirectories within the main scripts directory:

   ```
   ~/.config/gnome-search-scripts/
   ├── system/
   │   ├── reboot.sh
   │   └── shutdown.sh
   ├── network/
   │   ├── wifi-toggle.sh
   │   └── vpn-connect.sh
   └── media/
       ├── volume-up.sh
       └── volume-down.sh
   ```

   The extension will recursively search all subdirectories for `.sh` files and make them available in search results. When executing scripts in subdirectories, the working directory is set to the script's directory, allowing scripts to use relative paths for resources in the same directory.

   **Note:** If you add or modify scripts in subdirectories, you may need to use the "Refresh Scripts" button in the extension preferences to ensure they are detected.

4. **Notification Types**
   - `status`: Shows success/failure with exit code (default)
   - `stdout`: Shows the script's output in the notification
   - `none`: No notifications

5. **Running Scripts**
   Open the Activities overview and start typing the name of your script. It will appear in the search results with its name, description, and icon. Click on it to run the script.

6. **Preferences**
   Access the extension preferences through the GNOME Extensions app or run:
   ```bash
   gnome-extensions prefs gnome-search-scripts@example.com
   ```

   The preferences window allows you to:
   - Change the scripts directory location
   - Manually refresh scripts (useful for detecting changes in subdirectories)
   - Set the default icon for scripts
   - Configure the default notification style
