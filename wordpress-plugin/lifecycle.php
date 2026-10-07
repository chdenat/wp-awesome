<?php
/******************************************************************************
 * This file is part of the wp-awesome package.
 *
 * File: wordpress-plugin/lifecycle.php
 *
 * Author: Christian Denat
 *
 * Created on: 2026-10-07
 * Last modified: 2026-10-07
 *
 * Copyright © 2026 Christian Denat
 ******************************************************************************/

defined('ABSPATH') || exit;

/** Installs and removes the single MU-plugin file owned by WP Awesome. */
final class WP_Awesome_Lifecycle {
    const MU_PLUGIN_FILENAME = 'wp-awesome-mu.php';
    const OWNERSHIP_MARKER = 'WP Awesome managed MU-plugin';

    /** Copies the packaged MU-plugin into WordPress's auto-loaded MU-plugin directory. */
    public static function install_mu_plugin() {
        $source = __DIR__ . DIRECTORY_SEPARATOR . self::MU_PLUGIN_FILENAME;
        $directory = self::mu_plugin_directory();
        $destination = $directory . DIRECTORY_SEPARATOR . self::MU_PLUGIN_FILENAME;

        if (!is_readable($source)) {
            return self::error(__('The bundled WP Awesome MU-plugin file is missing or unreadable.', 'wp-awesome'));
        }

        $contents = file_get_contents($source);
        if (!is_string($contents)) {
            return self::error(__('The bundled WP Awesome MU-plugin file could not be read.', 'wp-awesome'));
        }

        if (is_link($destination)) {
            return self::error(__('The WP Awesome MU-plugin destination is a symbolic link and was left untouched.', 'wp-awesome'));
        }

        if (is_file($destination)) {
            $installed = file_get_contents($destination);
            if (!is_string($installed)) {
                return self::error(__('The installed MU-plugin file could not be read.', 'wp-awesome'));
            }
            if ($installed === $contents) {
                return true;
            }
            if (strpos($installed, self::OWNERSHIP_MARKER) === false) {
                return self::error(__('Another file already uses the WP Awesome MU-plugin path and was left untouched.', 'wp-awesome'));
            }
        } elseif (file_exists($destination)) {
            return self::error(__('The WP Awesome MU-plugin destination exists and is not a regular file.', 'wp-awesome'));
        }

        if (!is_dir($directory) && !wp_mkdir_p($directory)) {
            return self::error(__('WordPress could not create its MU-plugin directory.', 'wp-awesome'));
        }

        $temporary = tempnam($directory, '.wp-awesome-');
        if (!is_string($temporary) || dirname($temporary) !== $directory) {
            if (is_string($temporary) && is_file($temporary)) {
                unlink($temporary);
            }
            return self::error(__('WordPress could not create a temporary MU-plugin file.', 'wp-awesome'));
        }

        $written = file_put_contents($temporary, $contents, LOCK_EX);
        if ($written !== strlen($contents)) {
            unlink($temporary);
            return self::error(__('WordPress could not write the MU-plugin file.', 'wp-awesome'));
        }

        chmod($temporary, 0644);
        if (!rename($temporary, $destination)) {
            unlink($temporary);
            return self::error(__('WordPress could not install the MU-plugin file.', 'wp-awesome'));
        }

        return true;
    }

    /** Removes the owned MU-plugin file while preserving unrelated files and directories. */
    public static function uninstall_mu_plugin() {
        $destination = self::mu_plugin_directory() . DIRECTORY_SEPARATOR . self::MU_PLUGIN_FILENAME;
        if (!file_exists($destination) && !is_link($destination)) {
            return true;
        }
        if (is_link($destination) || !is_file($destination)) {
            return self::error(__('The WP Awesome MU-plugin path is not a regular file and was left untouched.', 'wp-awesome'));
        }

        $contents = file_get_contents($destination);
        if (!is_string($contents) || strpos($contents, self::OWNERSHIP_MARKER) === false) {
            return self::error(__('The MU-plugin file does not carry the WP Awesome ownership marker and was left untouched.', 'wp-awesome'));
        }

        if (!unlink($destination)) {
            return self::error(__('WordPress could not remove the WP Awesome MU-plugin file.', 'wp-awesome'));
        }

        return true;
    }

    /** Resolves the configured MU-plugin directory, including WordPress's default path. */
    private static function mu_plugin_directory() {
        $directory = defined('WPMU_PLUGIN_DIR') ? WPMU_PLUGIN_DIR : WP_CONTENT_DIR . '/mu-plugins';
        return rtrim($directory, '/\\');
    }

    /** Creates a safe WordPress error for a failed filesystem operation. */
    private static function error($message) {
        return new WP_Error('wp_awesome_mu_plugin_filesystem', $message);
    }
}
