import * as MessageTray from 'resource:///org/gnome/shell/ui/messageTray.js';
import * as Main from 'resource:///org/gnome/shell/ui/main.js';
import { gettext as _ } from 'resource:///org/gnome/shell/extensions/extension.js';

/**
 * Manages notifications for script execution
 */
export class NotificationManager {
    private _notificationSource: any = null;

    constructor() {
        this._notificationSource = null;
    }

    /**
     * Show a notification with the given title, body, and success status
     *
     * @param title - Notification title
     * @param body - Notification body
     * @param success - Whether the operation was successful
     */
    showNotification(title: string, body: string, success: boolean): void {
        // Use different icons for success/failure
        const iconName = success ? 'emblem-ok-symbolic' : 'dialog-warning-symbolic';

        // Create notification source if needed
        if (!this._notificationSource) {
            // Use any type to bypass strict type checking
            this._notificationSource = new (MessageTray as any).Source(
                _('Script Runner'),
                'system-run-symbolic'
            );

            this._notificationSource.connect('destroy', () => {
                this._notificationSource = null;
            });

            // Add the source to the message tray
            Main.messageTray.add(this._notificationSource);
        }

        // Create and show notification
        // Use any type to bypass strict type checking
        const notification = new (MessageTray as any).Notification(
            this._notificationSource,
            title,
            body
        );

        // Add notification to the source
        this._notificationSource.addNotification(notification);
    }

    /**
     * Show a success notification
     *
     * @param scriptName - Name of the script
     * @param message - Optional message (defaults to "Script executed successfully")
     */
    showSuccess(scriptName: string, message: string | null = null): void {
        this.showNotification(scriptName, message || _('Script executed successfully'), true);
    }

    /**
     * Show an error notification
     *
     * @param scriptName - Name of the script
     * @param error - Error message or Error object
     */
    showError(scriptName: string, error: string | Error): void {
        const errorMessage = error instanceof Error ? error.message : error;
        this.showNotification(scriptName, errorMessage, false);
    }

    /**
     * Show a notification with the exit code
     *
     * @param scriptName - Name of the script
     * @param exitCode - Process exit code
     */
    showExitStatus(scriptName: string, exitCode: number): void {
        if (exitCode === 0) {
            this.showSuccess(scriptName);
        } else {
            this.showNotification(
                scriptName,
                _('Failed with exit code %d').format(exitCode),
                false
            );
        }
    }

    /**
     * Clean up resources
     */
    destroy(): void {
        this._notificationSource = null;
    }
}
