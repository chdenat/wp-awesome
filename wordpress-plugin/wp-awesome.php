<?php
/******************************************************************************
 * This file is part of the wp-awesome package.
 *
 * File: wordpress-plugin/wp-awesome.php
 *
 * Author: Christian Denat
 *
 * Created on: 2026-10-07
 * Last modified: 2026-10-07
 *
 * Copyright © 2026 Christian Denat
 ******************************************************************************/

/**
 * Plugin Name: WP Awesome
 * Description: Installs the WP Awesome build controls as a managed MU-plugin.
 * Version: 0.1.0
 * Requires at least: 5.6
 * Requires PHP: 7.2
 * Text Domain: wp-awesome
 * Domain Path: /languages
 */

defined('ABSPATH') || exit;

require_once __DIR__ . '/lifecycle.php';

/** Keeps the managed MU-plugin installed and links to its build controls. */
final class WP_Awesome_Plugin_Installer {
    /** @var string Filesystem error to display during the current admin request. */
    public static $install_error = '';

    /** Installs the MU-plugin when an administrator activates WP Awesome. */
    public static function activate() {
        self::load_textdomain();
        $result = WP_Awesome_Lifecycle::install_mu_plugin();
        if (is_wp_error($result)) {
            wp_die(esc_html($result->get_error_message()));
        }
    }

    /** Removes the MU-plugin so deactivating the installer also stops build controls. */
    public static function deactivate() {
        $result = WP_Awesome_Lifecycle::uninstall_mu_plugin();
        if (is_wp_error($result)) {
            wp_die(esc_html($result->get_error_message()));
        }
    }

    /** Refreshes an owned MU-plugin after package updates without replacing foreign files. */
    public static function sync_mu_plugin() {
        $result = WP_Awesome_Lifecycle::install_mu_plugin();
        if (is_wp_error($result)) {
            self::$install_error = $result->get_error_message();
        }
    }

    /** Loads the bundled translations for the installer and its managed MU-plugin. */
    public static function load_textdomain() {
        $language_relative_path = dirname(plugin_basename(__FILE__)) . '/languages';
        load_plugin_textdomain(
            'wp-awesome',
            false,
            $language_relative_path
        );

        $locale = sanitize_locale_name(determine_locale());
        $language_directory = WP_PLUGIN_DIR . DIRECTORY_SEPARATOR
            . str_replace('/', DIRECTORY_SEPARATOR, $language_relative_path);
        $translation_file = $language_directory . DIRECTORY_SEPARATOR . 'wp-awesome-' . $locale . '.mo';
        if (is_readable($translation_file) && !is_textdomain_loaded('wp-awesome')) {
            load_textdomain('wp-awesome', $translation_file);
        }
    }

    /** Displays an installation failure while preserving the administrator's current page. */
    public static function render_install_error() {
        if (self::$install_error === '') {
            return;
        }

        echo '<div class="notice notice-error"><p>' . esc_html(self::$install_error) . '</p></div>';
    }

    /** Adds a direct link to the single build-controls page. */
    public static function add_plugin_link($links) {
        $url = admin_url('tools.php?page=wp-awesome');
        $links[] = '<a href="' . esc_url($url) . '">' . esc_html__('Build site', 'wp-awesome') . '</a>';
        return $links;
    }
}

register_activation_hook(__FILE__, array('WP_Awesome_Plugin_Installer', 'activate'));
register_deactivation_hook(__FILE__, array('WP_Awesome_Plugin_Installer', 'deactivate'));
add_action('init', array('WP_Awesome_Plugin_Installer', 'load_textdomain'), 0);
add_action('admin_init', array('WP_Awesome_Plugin_Installer', 'sync_mu_plugin'), 1);
add_action('admin_notices', array('WP_Awesome_Plugin_Installer', 'render_install_error'));
add_filter(
    'plugin_action_links_' . plugin_basename(__FILE__),
    array('WP_Awesome_Plugin_Installer', 'add_plugin_link')
);
