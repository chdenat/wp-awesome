<?php
/******************************************************************************
 * This file is part of the wp-awesome package.
 *
 * File: wordpress-plugin/uninstall.php
 *
 * Author: Christian Denat
 *
 * Created on: 2026-10-07
 * Last modified: 2026-10-07
 *
 * Copyright © 2026 Christian Denat
 ******************************************************************************/

// WordPress sets this only for uninstall; direct requests must never remove files.
defined('WP_UNINSTALL_PLUGIN') || exit;

load_plugin_textdomain(
    'wp-awesome',
    false,
    dirname(plugin_basename(__FILE__)) . '/languages'
);

require_once __DIR__ . '/lifecycle.php';

$result = WP_Awesome_Lifecycle::uninstall_mu_plugin();
if (is_wp_error($result)) {
    wp_die(esc_html($result->get_error_message()));
}
