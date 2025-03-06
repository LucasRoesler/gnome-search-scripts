import St from 'gi://St';
import Clutter from 'gi://Clutter';
import Gio from 'gi://Gio';
import GLib from 'gi://GLib';
import Shell from 'gi://Shell';

import { Extension, gettext as _ } from 'resource:///org/gnome/shell/extensions/extension.js';
import * as Main from 'resource:///org/gnome/shell/ui/main.js';

// Settings keys
const SCRIPT_LOCATION_KEY = 'script-location';
const DEFAULT_ICON_KEY = 'default-icon';

class ScriptProvider {
    constructor(extension, settings) {
        this._extension = extension;
        this._settings = settings;
        this._scripts = [];
        this._monitor = null;
        this._monitorChangedId = 0;
        this._reloadScriptsTimeoutId = 0;
        this._scriptLocation = this._expandPath(this._settings.get_string(SCRIPT_LOCATION_KEY));
        this._defaultIcon = this._settings.get_string(DEFAULT_ICON_KEY);
        this._loadScripts();
        this._setupMonitor();
    }

    // Expand ~ to home directory
    _expandPath(path) {
        if (path.startsWith('~')) {
            return GLib.get_home_dir() + path.substring(1);
        }
        return path;
    }

    // Update script location when settings change
    updateScriptLocation() {
        const newLocation = this._expandPath(this._settings.get_string(SCRIPT_LOCATION_KEY));

        // Only update if the location has changed
        if (newLocation !== this._scriptLocation) {
            console.log(`Updating script location from ${this._scriptLocation} to ${newLocation}`);

            // Clean up old monitor
            if (this._monitor) {
                if (this._monitorChangedId) {
                    this._monitor.disconnect(this._monitorChangedId);
                    this._monitorChangedId = 0;
                }
                this._monitor.cancel();
                this._monitor = null;
            }

            // Update location and reload
            this._scriptLocation = newLocation;
            this._scripts = [];
            this._loadScripts();
            this._setupMonitor();
        }
    }

    // Update default icon when settings change
    updateDefaultIcon() {
        this._defaultIcon = this._settings.get_string(DEFAULT_ICON_KEY);

        // Reload scripts to update icons
        this._scripts = [];
        this._loadScripts();
    }

    _setupMonitor() {
        // Create the directory if it doesn't exist
        try {
            const directory = Gio.File.new_for_path(this._scriptLocation);
            if (!directory.query_exists(null)) {
                directory.make_directory_with_parents(null);
            }
        } catch (e) {
            console.error(`Failed to create scripts directory: ${e}`);
        }

        // Set up file monitoring
        try {
            const file = Gio.File.new_for_path(this._scriptLocation);
            this._monitor = file.monitor_directory(
                Gio.FileMonitorFlags.NONE,
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

    _onScriptDirectoryChanged(monitor, file, otherFile, eventType) {
        // React to relevant file events
        if (eventType === Gio.FileMonitorEvent.CREATED ||
            eventType === Gio.FileMonitorEvent.DELETED ||
            eventType === Gio.FileMonitorEvent.CHANGED) {

            // Debounce rapid changes with a timeout
            if (this._reloadScriptsTimeoutId) {
                GLib.source_remove(this._reloadScriptsTimeoutId);
            }

            this._reloadScriptsTimeoutId = GLib.timeout_add(
                GLib.PRIORITY_DEFAULT,
                500, // 500ms delay
                () => {
                    console.log('Reloading scripts due to directory changes');
                    // Reload all scripts
                    this._scripts = [];
                    this._loadScripts();
                    this._reloadScriptsTimeoutId = 0;
                    return GLib.SOURCE_REMOVE;
                }
            );
        }
    }

    destroy() {
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

    // Required properties for GNOME 45+ search providers
    get appInfo() {
        return null;
    }

    get canLaunchSearch() {
        return false;
    }

    get id() {
        return this._extension.uuid;
    }

    _loadScripts() {
        let dir = GLib.Dir.open(this._scriptLocation, 0);
        if (!dir) return;

        let file;
        while ((file = dir.read_name()) !== null) {
            if (file.endsWith('.sh')) {
                let scriptPath = this._scriptLocation + '/' + file;
                let metadata = this._parseScriptMetadata(scriptPath);
                if (metadata) {
                    this._scripts.push({
                        file: file,
                        name: metadata.name || file,
                        description: metadata.description || '',
                        icon: metadata.icon || this._defaultIcon
                    });
                }
            }
        }
        dir.close();
    }

    _parseScriptMetadata(scriptPath) {
        let fileContents = Shell.get_file_contents_utf8_sync(scriptPath);
        let lines = fileContents.split('\n');
        let metadata = {};

        for (let i = 0; i < lines.length; i++) {
            let line = lines[i].trim();
            if (line.startsWith('#!')) continue;
            if (line.startsWith('#')) {
                let match = line.match(/#\s*(\w+):\s*(.*)/);
                if (match) {
                    metadata[match[1].toLowerCase()] = match[2];
                }
            } else {
                break;
            }
        }

        return metadata;
    }

    // Updated to use Promise-based API with cancellable
    async getInitialResultSet(terms, cancellable) {
        return new Promise((resolve, reject) => {
            // Handle cancellation
            const cancelId = cancellable?.connect(() => {
                reject(new Error('Search cancelled'));
            });

            // Filter scripts based on search terms
            const results = this._scripts
                .filter(script =>
                    script.name.toLowerCase().includes(terms.join(' ').toLowerCase()) ||
                    script.description.toLowerCase().includes(terms.join(' ').toLowerCase()))
                .map((_, index) => index.toString());

            if (cancelId && !cancellable.is_cancelled())
                cancellable.disconnect(cancelId);

            resolve(results);
        });
    }

    // Updated to use Promise-based API with cancellable
    async getSubsearchResultSet(results, terms, cancellable) {
        return this.getInitialResultSet(terms, cancellable);
    }

    // New method required for GNOME 45+
    filterResults(results, maxResults) {
        if (results.length <= maxResults)
            return results;
        return results.slice(0, maxResults);
    }

    // Updated to use Promise-based API with cancellable
    async getResultMetas(resultIds, cancellable) {
        return new Promise((resolve, reject) => {
            const cancelId = cancellable?.connect(() => {
                reject(new Error('Operation cancelled'));
            });

            const metas = resultIds.map(id => {
                const script = this._scripts[parseInt(id)];
                const scaleFactor = St.ThemeContext.get_for_stage(global.stage).scale_factor;

                return {
                    id: id,
                    name: script.name,
                    description: script.description,
                    createIcon: (size) => {
                        return new St.Icon({
                            icon_name: script.icon,
                            width: size * scaleFactor,
                            height: size * scaleFactor
                        });
                    }
                };
            });

            if (cancelId && !cancellable.is_cancelled())
                cancellable.disconnect(cancelId);

            resolve(metas);
        });
    }

    // Updated to match GNOME 45+ API
    activateResult(resultId, terms) {
        let script = this._scripts[parseInt(resultId)];
        let scriptPath = this._scriptLocation + '/' + script.file;

        // Use Gio.SubprocessLauncher to run the script
        let launcher = new Gio.SubprocessLauncher({
            flags: Gio.SubprocessFlags.NONE
        });

        launcher.set_cwd(this._scriptLocation);

        try {
            // Use spawnv instead of spawn_async
            let proc = launcher.spawnv([scriptPath]);

            // Optional: Wait for the process to complete
            proc.wait_check_async(null, (proc, result) => {
                try {
                    proc.wait_check_finish(result);
                } catch (e) {
                    console.error(`Script execution failed: ${e}`);
                }
            });
        } catch (e) {
            console.error(`Failed to launch script: ${e}`);
        }

        Main.overview.hide();
    }

    // Optional method for custom result display
    createResultObject(meta) {
        return null; // Use default implementation
    }
}

export default class ScriptSearchExtension extends Extension {
    constructor(metadata) {
        super(metadata);
        this._settings = null;
        this._settingsChangedIds = [];
    }

    enable() {
        // Load settings (uses the settings-schema from metadata.json)
        this._settings = this.getSettings();

        // Initialize the provider with the settings
        this._scriptProvider = new ScriptProvider(this, this._settings);

        // Connect to settings changes
        this._settingsChangedIds.push(
            this._settings.connect(`changed::${SCRIPT_LOCATION_KEY}`,
                () => this._scriptProvider.updateScriptLocation())
        );
        this._settingsChangedIds.push(
            this._settings.connect(`changed::${DEFAULT_ICON_KEY}`,
                () => this._scriptProvider.updateDefaultIcon())
        );

        // Register the provider
        Main.overview.searchController.addProvider(this._scriptProvider);
    }

    disable() {
        // Unregister the provider
        Main.overview.searchController.removeProvider(this._scriptProvider);

        // Disconnect settings signals
        this._settingsChangedIds.forEach(id => {
            if (this._settings) {
                this._settings.disconnect(id);
            }
        });
        this._settingsChangedIds = [];

        // Clean up the provider
        if (this._scriptProvider) {
            this._scriptProvider.destroy();
            this._scriptProvider = null;
        }

        this._settings = null;
    }
}
