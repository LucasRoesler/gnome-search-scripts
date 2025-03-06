# Gnome Search Scripts
A GNOME Shell extension that allows you to execute scripts directly from the GNOME Shell search overview. This extension is perfect for users who frequently run scripts and want quick access to them.
Features

    Run executable scripts from a specified directory.
    Display script names, descriptions, and icons in search results.
    Easy integration with GNOME Shell's search provider interface.

## Installation

1. Clone the Repository

2. Place the Extension in the Correct Directory

    Move the my-script-runner@example.com directory to your GNOME Shell extensions directory:
    ```bash
    mv my-script-runner@example.com ~/.local/share/gnome-shell/extensions/
    ```

3. Enable the Extension

    Restart GNOME Shell by pressing Alt+F2, typing r, and pressing Enter. Then, enable the extension using the GNOME Tweaks tool or the following command:

    ```bash
    gnome-extensions enable my-script-runner@example.com
    ```

## Usage

1. Put your executable scripts in the ~/.config/gnome-search-scripts/ directory. Ensure each script has a shebang (#!/bin/bash) and structured comments for metadata:

    ```bash
    #!/bin/bash
    # Name: My Script
    # Description: This script does something useful.
    # Icon: utilities-terminal

    echo "Hello, GNOME Shell!"
    ```
2. Search and Run

    Open the Activities overview and start typing the name of your script. It should appear in the search results with its name, description, and icon. Click on it to run the script.
