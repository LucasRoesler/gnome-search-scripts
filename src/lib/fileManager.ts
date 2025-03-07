import Gio from 'gi://Gio';
import GLib from 'gi://GLib';

import * as Utils from './utils.js';
import { SCRIPT_FILE_EXTENSION } from './constants.js';
import { Script } from './searchHandler.js';
import { NotificationType } from './constants.js';

/**
 * Manages file operations and directory monitoring
 */
export class FileManager {
    private _scriptLocation: string;
    private _defaultIcon: string;
    private _defaultNotificationStyle: NotificationType;
    private _onScriptsChanged: (() => void) | null;
    private _monitor: Gio.FileMonitor | null;
    private _monitorChangedId: number;
    private _reloadScriptsTimeoutId: number;

    /**
     * Create a new FileManager
     *
     * @param scriptLocation - Base location for scripts
     * @param defaultIcon - Default icon for scripts
     * @param defaultNotificationStyle - Default notification style
     * @param onScriptsChanged - Callback when scripts change
     */
    constructor(
        scriptLocation: string,
        defaultIcon: string,
        defaultNotificationStyle: NotificationType,
        onScriptsChanged: () => void
    ) {
        this._scriptLocation = scriptLocation;
        this._defaultIcon = defaultIcon;
        this._defaultNotificationStyle = defaultNotificationStyle;
        this._onScriptsChanged = onScriptsChanged;
        this._monitor = null;
        this._monitorChangedId = 0;
        this._reloadScriptsTimeoutId = 0;

        this._setupMonitor();
    }

    /**
     * Set up directory monitoring
     */
    private _setupMonitor(): void {
        // Create the directory if it doesn't exist
        try {
            const directory = Gio.File.new_for_path(this._scriptLocation);
            if (!directory.query_exists(null)) {
                directory.make_directory_with_parents(null);
            }
        } catch (e) {
            console.error(`Failed to create scripts directory: ${e}`);
        }

        // Set up file monitoring for the root directory
        try {
            const file = Gio.File.new_for_path(this._scriptLocation);
            this._monitor = file.monitor_directory(
                // Use WATCH_MOUNTS to detect new subdirectories
                Gio.FileMonitorFlags.WATCH_MOUNTS |
                    // Use WATCH_MOVES to detect file/directory renames
                    Gio.FileMonitorFlags.WATCH_MOVES,
                null
            );

            this._monitorChangedId = this._monitor.connect(
                'changed',
                this._onScriptDirectoryChanged.bind(this)
            );
        } catch (e) {
            console.error(`Failed to set up directory monitoring: ${e}`);
        }
    }

    /**
     * Handle directory changes
     */
    private _onScriptDirectoryChanged(
        monitor: Gio.FileMonitor,
        file: Gio.File,
        otherFile: Gio.File | null,
        eventType: Gio.FileMonitorEvent
    ): void {
        // Get file info to check if it's a directory or a script file
        let isRelevant = false;

        try {
            // Check if the file exists (it might have been deleted)
            if (file && file.query_exists(null)) {
                const fileInfo = file.query_info(
                    'standard::name,standard::type',
                    Gio.FileQueryInfoFlags.NONE,
                    null
                );
                const fileName = fileInfo.get_name();
                const fileType = fileInfo.get_file_type();

                // Consider changes relevant if:
                // 1. It's a directory (new directory created or deleted)
                // 2. It's a script file
                isRelevant =
                    fileType === Gio.FileType.DIRECTORY ||
                    (fileType === Gio.FileType.REGULAR && fileName.endsWith(SCRIPT_FILE_EXTENSION));
            } else {
                // If the file doesn't exist anymore, we need to check if it was a directory or script file
                // Since we can't query it directly, we'll assume it's relevant
                isRelevant = true;
            }
        } catch (e) {
            // If we can't get file info, assume it's relevant
            isRelevant = true;
        }

        // React to relevant file events
        if (
            isRelevant &&
            (eventType === Gio.FileMonitorEvent.CREATED ||
                eventType === Gio.FileMonitorEvent.DELETED ||
                eventType === Gio.FileMonitorEvent.CHANGED ||
                eventType === Gio.FileMonitorEvent.MOVED ||
                eventType === Gio.FileMonitorEvent.RENAMED)
        ) {
            // Debounce rapid changes with a timeout
            if (this._reloadScriptsTimeoutId) {
                GLib.source_remove(this._reloadScriptsTimeoutId);
            }

            this._reloadScriptsTimeoutId = GLib.timeout_add(
                GLib.PRIORITY_DEFAULT,
                500, // 500ms delay
                () => {
                    console.log('Reloading scripts due to directory changes');
                    // Notify that scripts need to be reloaded
                    if (this._onScriptsChanged) {
                        this._onScriptsChanged();
                    }
                    this._reloadScriptsTimeoutId = 0;
                    return GLib.SOURCE_REMOVE;
                }
            );
        }
    }

    /**
     * Load all scripts from the script location
     *
     * @returns Array of script objects
     */
    loadScripts(): Script[] {
        const scripts: Script[] = [];
        this._loadScriptsRecursive('', scripts);

        // Log the loaded scripts with detailed information
        console.log(`Loaded ${scripts.length} scripts`);
        scripts.forEach(script => {
            console.log(
                `- ${script.name} (file: ${script.file}, path: ${script.path}, description: "${script.description}")`
            );
        });

        return scripts;
    }

    /**
     * Recursively load scripts from the given relative path
     *
     * @param relativePath - Relative path within the script location
     * @param scripts - Array to populate with script objects
     */
    private _loadScriptsRecursive(relativePath: string, scripts: Script[]): void {
        const fullPath = this._scriptLocation + (relativePath ? '/' + relativePath : '');

        // Use Gio.File for better directory handling
        const dir = Gio.File.new_for_path(fullPath);

        try {
            // Get directory enumerator
            const enumerator = dir.enumerate_children(
                'standard::name,standard::type',
                Gio.FileQueryInfoFlags.NONE,
                null
            );

            let fileInfo: Gio.FileInfo | null;
            while ((fileInfo = enumerator.next_file(null)) !== null) {
                const fileName = fileInfo.get_name();
                const fileType = fileInfo.get_file_type();

                // Skip hidden files and directories
                if (fileName.startsWith('.')) {
                    continue;
                }

                // Build the relative path for this item
                const itemRelativePath = relativePath ? relativePath + '/' + fileName : fileName;

                if (fileType === Gio.FileType.DIRECTORY) {
                    // Recursively process subdirectories
                    this._loadScriptsRecursive(itemRelativePath, scripts);
                } else if (
                    fileType === Gio.FileType.REGULAR &&
                    fileName.endsWith(SCRIPT_FILE_EXTENSION)
                ) {
                    // Process script files
                    const scriptPath = this._scriptLocation + '/' + itemRelativePath;
                    const metadata = Utils.parseScriptMetadata(
                        scriptPath,
                        this._defaultNotificationStyle
                    );

                    if (metadata) {
                        scripts.push({
                            file: fileName,
                            path: itemRelativePath,
                            name: metadata.name || fileName,
                            description: metadata.description || '',
                            icon: metadata.icon || this._defaultIcon,
                            notify: metadata.notify || this._defaultNotificationStyle,
                        });
                    }
                }
            }

            enumerator.close(null);
        } catch (e) {
            console.error(`Failed to read directory ${fullPath}: ${e}`);
        }
    }

    /**
     * Update the script location
     *
     * @param newLocation - New script location
     * @returns True if the location was changed
     */
    updateScriptLocation(newLocation: string): boolean {
        // Only update if the location has changed
        if (newLocation !== this._scriptLocation) {
            console.log(`Updating script location from ${this._scriptLocation} to ${newLocation}`);

            // Clean up old monitor
            this.destroy();

            // Update location
            this._scriptLocation = newLocation;

            // Set up new monitor
            this._setupMonitor();

            return true;
        }

        return false;
    }

    /**
     * Update the default icon
     *
     * @param newIcon - New default icon
     */
    updateDefaultIcon(newIcon: string): void {
        this._defaultIcon = newIcon;
    }

    /**
     * Update the default notification style
     *
     * @param newStyle - New default notification style
     */
    updateDefaultNotificationStyle(newStyle: NotificationType): void {
        this._defaultNotificationStyle = newStyle;
    }

    /**
     * Clean up resources
     */
    destroy(): void {
        // Clean up monitor
        if (this._monitorChangedId && this._monitor) {
            this._monitor.disconnect(this._monitorChangedId);
            this._monitorChangedId = 0;
        }

        if (this._monitor) {
            this._monitor.cancel();
            this._monitor = null;
        }

        // Clean up timeout
        if (this._reloadScriptsTimeoutId) {
            GLib.source_remove(this._reloadScriptsTimeoutId);
            this._reloadScriptsTimeoutId = 0;
        }
    }
}
