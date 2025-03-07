import * as MessageTray from 'resource:///org/gnome/shell/ui/messageTray.js';
import * as Main from 'resource:///org/gnome/shell/ui/main.js';
import { gettext as _ } from 'resource:///org/gnome/shell/extensions/extension.js';

/**
 * Manages notifications for script execution
 */
export class NotificationManager {
    constructor() {
        this._notificationSource = null;
    }

    /**
     * Show a notification with the given title, body, and success status
     *
     * @param {string} title - Notification title
     * @param {string} body - Notification body
     * @param {boolean} success - Whether the operation was successful
     */
    showNotification(title, body, success) {
        // Use different icons for success/failure
        const iconName = success ? 'emblem-ok-symbolic' : 'dialog-warning-symbolic';

        // Create notification source if needed
        if (!this._notificationSource) {
            this._notificationSource = new MessageTray.Source({
                title: _('Script Runner'),
                iconName: 'system-run-symbolic'
            });

            this._notificationSource.connect('destroy', () => {
                this._notificationSource = null;
            });

            // Add the source to the message tray
            Main.messageTray.add(this._notificationSource);
        }

        // Create and show notification
        const notification = new MessageTray.Notification({
            source: this._notificationSource,
            title: title,
            body: body,
            iconName: iconName
        });

        this._notificationSource.addNotification(notification);
    }

    /**
     * Show a success notification
     *
     * @param {string} scriptName - Name of the script
     * @param {string} [message] - Optional message (defaults to "Script executed successfully")
     */
    showSuccess(scriptName, message = null) {
        this.showNotification(
            scriptName,
            message || _("Script executed successfully"),
            true
        );
    }

    /**
     * Show an error notification
     *
     * @param {string} scriptName - Name of the script
     * @param {string|Error} error - Error message or Error object
     */
    showError(scriptName, error) {
        const errorMessage = error instanceof Error ? error.message : error;
        this.showNotification(scriptName, errorMessage, false);
    }

    /**
     * Show a notification with the exit code
     *
     * @param {string} scriptName - Name of the script
     * @param {number} exitCode - Process exit code
     */
    showExitStatus(scriptName, exitCode) {
        if (exitCode === 0) {
            this.showSuccess(scriptName);
        } else {
            this.showNotification(
                scriptName,
                _("Failed with exit code %d").format(exitCode),
                false
            );
        }
    }

    /**
     * Clean up resources
     */
    destroy() {
        this._notificationSource = null;
    }
}
