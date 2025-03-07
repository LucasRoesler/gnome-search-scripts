import Gio from 'gi://Gio';
import GLib from 'gi://GLib';
import * as Main from 'resource:///org/gnome/shell/ui/main.js';
import { gettext as _ } from 'resource:///org/gnome/shell/extensions/extension.js';

import { FileManager } from './fileManager.js';
import { NotificationManager } from './notificationManager.js';
import { SearchHandler } from './searchHandler.js';
import * as Utils from './utils.js';

/**
 * Main script provider class that integrates all components
 */
export class ScriptProvider {
    /**
     * Create a new ScriptProvider
     *
     * @param {Object} extension - Extension instance
     * @param {Object} settings - Extension settings
     */
    constructor(extension, settings) {
        this._extension = extension;
        this._settings = settings;
        this._scripts = [];

        // Initialize script location and defaults
        this._scriptLocation = Utils.expandPath(this._settings.get_string('script-location'));
        this._defaultIcon = this._settings.get_string('default-icon');
        this._defaultNotificationStyle = this._settings.get_string('default-notification-style');

        // Initialize components
        this._notificationManager = new NotificationManager();
        this._fileManager = new FileManager(
            this._scriptLocation,
            this._defaultIcon,
            this._defaultNotificationStyle,
            this._onScriptsChanged.bind(this)
        );

        // Initialize search handler with empty array
        this._searchHandler = new SearchHandler([]);

        // Load scripts
        this.refreshScripts(false);
    }

    /**
     * Manually refresh all scripts
     *
     * @param {boolean} showNotification - Whether to show a notification when done
     */
    refreshScripts(showNotification = true) {
        console.log('Manually refreshing scripts');
        this._scripts = this._fileManager.loadScripts();

        // Update search handler
        if (this._searchHandler) {
            this._searchHandler.updateScripts(this._scripts);
        }

        console.log(`Loaded ${this._scripts.length} scripts`);
        for (const script of this._scripts) {
            console.log(`- ${script.name}`);
        }

        // Show a notification if requested
        if (showNotification && this._notificationManager) {
            this._notificationManager.showSuccess(
                _('Scripts Refreshed'),
                _('All scripts have been reloaded from disk')
            );
        }
    }

    /**
     * Handle script changes
     */
    _onScriptsChanged() {
        this.refreshScripts(false);
    }

    /**
     * Update script location when settings change
     */
    updateScriptLocation() {
        const newLocation = Utils.expandPath(this._settings.get_string('script-location'));

        if (this._fileManager.updateScriptLocation(newLocation)) {
            this._scriptLocation = newLocation;
            this.refreshScripts(false);
        }
    }

    /**
     * Update default icon when settings change
     */
    updateDefaultIcon() {
        this._defaultIcon = this._settings.get_string('default-icon');
        this._fileManager.updateDefaultIcon(this._defaultIcon);

        // Reload scripts to update icons
        this.refreshScripts(false);
    }

    /**
     * Update default notification style when settings change
     */
    updateDefaultNotificationStyle() {
        this._defaultNotificationStyle = this._settings.get_string('default-notification-style');
        this._fileManager.updateDefaultNotificationStyle(this._defaultNotificationStyle);

        // Reload scripts to update notification styles
        this.refreshScripts(false);
    }

    /**
     * Clean up resources
     */
    destroy() {
        if (this._fileManager) {
            this._fileManager.destroy();
        }

        if (this._notificationManager) {
            this._notificationManager.destroy();
        }

        this._scripts = [];
        this._searchHandler = null;
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

    /**
     * Get initial result set based on search terms
     */
    async getInitialResultSet(terms, cancellable) {
        return this._searchHandler.getInitialResultSet(terms, cancellable);
    }

    /**
     * Get subsearch result set based on previous results and new terms
     */
    async getSubsearchResultSet(results, terms, cancellable) {
        return this._searchHandler.getSubsearchResultSet(results, terms, cancellable);
    }

    /**
     * Filter results to the maximum number allowed
     */
    filterResults(results, maxResults) {
        return this._searchHandler.filterResults(results, maxResults);
    }

    /**
     * Get metadata for search results
     */
    async getResultMetas(resultIds, cancellable) {
        return this._searchHandler.getResultMetas(resultIds, cancellable);
    }

    /**
     * Activate a search result (execute a script)
     *
     * @param {string} resultId - Result ID
     * @param {Array} terms - Search terms
     */
    activateResult(resultId, terms) {
        const script = this._scripts[parseInt(resultId)];
        const scriptPath = this._scriptLocation + '/' + (script.path || script.file);
        const notifyType = script.notify;

        // Configure subprocess launcher with appropriate flags
        let flags = Gio.SubprocessFlags.NONE;

        // Capture stdout if needed for notification
        if (notifyType === 'stdout') {
            flags |= Gio.SubprocessFlags.STDOUT_PIPE;
        }

        // Always capture stderr for error reporting
        flags |= Gio.SubprocessFlags.STDERR_PIPE;

        const launcher = new Gio.SubprocessLauncher({
            flags: flags
        });

        // Set working directory to the script's directory for proper relative path handling
        const scriptDir = GLib.path_get_dirname(scriptPath);
        launcher.set_cwd(scriptDir);

        try {
            const proc = launcher.spawnv([scriptPath]);

            if (notifyType === 'none') {
                // No notification needed, but still wait for completion to catch errors
                proc.wait_check_async(null, (proc, result) => {
                    try {
                        proc.wait_check_finish(result);
                    } catch (e) {
                        console.error(`Script execution failed: ${e.message}`);
                    }
                });
            } else if (notifyType === 'stdout') {
                // Capture output and show notification
                proc.communicate_utf8_async(null, null, (proc, result) => {
                    try {
                        const [, stdout, stderr] = proc.communicate_utf8_finish(result);
                        const success = proc.get_exit_status() === 0;

                        // Use stdout for notification, or stderr if stdout is empty and there was an error
                        const output = stdout || (stderr && !success ? stderr : '');

                        if (output) {
                            this._notificationManager.showNotification(script.name, output, success);
                        } else if (!success) {
                            this._notificationManager.showExitStatus(script.name, proc.get_exit_status());
                        } else {
                            this._notificationManager.showSuccess(script.name);
                        }
                    } catch (e) {
                        this._notificationManager.showError(script.name, e);
                    }
                });
            } else { // status notification
                proc.wait_check_async(null, (proc, result) => {
                    try {
                        proc.wait_check_finish(result);
                        this._notificationManager.showSuccess(script.name);
                    } catch (e) {
                        const exitStatus = proc.get_exit_status();
                        this._notificationManager.showExitStatus(script.name, exitStatus);
                    }
                });
            }
        } catch (e) {
            if (notifyType !== 'none') {
                this._notificationManager.showError(script.name, e);
            }
            console.error(`Failed to launch script: ${e.message}`);
        }

        // Hide the overview
        Main.overview.hide();
    }

    // Optional method for custom result display
    createResultObject(meta) {
        return null; // Use default implementation
    }
}
