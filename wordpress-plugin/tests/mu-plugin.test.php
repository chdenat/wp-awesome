<?php
/******************************************************************************
 * This file is part of the wp-awesome package.
 *
 * File: wordpress-plugin/tests/mu-plugin.test.php
 *
 * Author: Christian Denat
 *
 * Created on: 2026-10-07
 * Last modified: 2026-10-07
 *
 * Copyright © 2026 Christian Denat
 ******************************************************************************/

define('ABSPATH', __DIR__ . '/');
define('WP_UNINSTALL_PLUGIN', true);
define('WPEC_CONNECTOR_GITHUB_TOKEN', 'test-token');
define('WPEC_CONNECTOR_REPOSITORY', 'beautiful/site');
define('WPEC_CONNECTOR_TARGETS', array(
    'staging' => array('event_type' => 'beautiful_content', 'enabled' => true),
));

/** Models the WordPress post fields used by the build controller. */
class WP_Post {
    public $ID;
    public $post_type;
    public $post_status;
    public $post_title;
    public $post_content;
    public $post_excerpt;
    public $post_name;
    public $post_parent;
    public $menu_order;
}

/** Models WordPress errors returned by filesystem and HTTP helpers. */
class WP_Error {
    private $message;

    /** Stores the failure message used by the filesystem and HTTP test doubles. */
    public function __construct($code, $message) {
        $this->message = $message;
    }

    /** Returns the failure text for assertions and WordPress error handling. */
    public function get_error_message() {
        return $this->message;
    }
}

/** Marks a redirect so the test can inspect it without ending the process. */
final class Test_Redirect extends RuntimeException {}

/** Fails a deterministic PHP check with its behavior description. */
function test_assert($condition, $message) {
    if (!$condition) {
        throw new RuntimeException('FAIL: ' . $message);
    }
}

/** Removes only files created under this test's temporary WordPress directory. */
function test_remove_tree($path) {
    if (!is_dir($path)) {
        if (file_exists($path)) {
            unlink($path);
        }
        return;
    }

    foreach (scandir($path) as $entry) {
        if ($entry !== '.' && $entry !== '..') {
            test_remove_tree($path . DIRECTORY_SEPARATOR . $entry);
        }
    }
    rmdir($path);
}

$GLOBALS['test_root'] = sys_get_temp_dir() . '/wp-awesome-php-' . getmypid() . '-' . uniqid('', true);
define('WP_CONTENT_DIR', $GLOBALS['test_root'] . '/wp-content');
define('WPMU_PLUGIN_DIR', WP_CONTENT_DIR . '/mu-plugins');
define('WP_PLUGIN_DIR', WP_CONTENT_DIR . '/plugins');
$GLOBALS['test_actions'] = array();
$GLOBALS['test_filters'] = array();
$GLOBALS['test_activation_callback'] = null;
$GLOBALS['test_deactivation_callback'] = null;
$GLOBALS['test_admin_page'] = null;
$GLOBALS['test_posts'] = array();
$GLOBALS['test_post_types'] = array();
$GLOBALS['test_capabilities'] = array('manage_options' => true, 'edit_post' => array());
$GLOBALS['test_requests'] = array();
$GLOBALS['test_response_code'] = 204;
$GLOBALS['test_redirect_url'] = '';
$GLOBALS['test_loaded_textdomains'] = array();
$GLOBALS['test_loaded_translation_files'] = array();
$GLOBALS['test_locale'] = 'en_US';
$GLOBALS['test_translations'] = array();

/** Captures the activation handler registered by the normal plugin entry point. */
function register_activation_hook($file, $callback) {
    $GLOBALS['test_activation_callback'] = $callback;
}

/** Captures the deactivation handler registered by the normal plugin entry point. */
function register_deactivation_hook($file, $callback) {
    $GLOBALS['test_deactivation_callback'] = $callback;
}

/** Stores an action callback and its declared argument count. */
function add_action($hook, $callback, $priority = 10, $accepted_args = 1) {
    $GLOBALS['test_actions'][$hook][] = array($callback, $accepted_args);
}

/** Stores a filter callback for deterministic list-table checks. */
function add_filter($hook, $callback, $priority = 10, $accepted_args = 1) {
    $GLOBALS['test_filters'][$hook][] = array($callback, $accepted_args);
}

/** Runs callbacks registered for one simulated WordPress action. */
function run_test_action($hook, ...$arguments) {
    foreach (isset($GLOBALS['test_actions'][$hook]) ? $GLOBALS['test_actions'][$hook] : array() as $entry) {
        call_user_func_array($entry[0], array_slice($arguments, 0, $entry[1]));
    }
}

/** Applies callbacks registered for one simulated WordPress filter. */
function apply_test_filters($hook, $value) {
    foreach (isset($GLOBALS['test_filters'][$hook]) ? $GLOBALS['test_filters'][$hook] : array() as $entry) {
        $value = call_user_func($entry[0], $value);
    }
    return $value;
}

/** Returns the plugin path used by the action-link registration test. */
function plugin_basename($file) { return 'wp-awesome/wp-awesome.php'; }
/** Captures the plugin translation directory registered by WordPress. */
function load_plugin_textdomain($domain, $deprecated = false, $plugin_rel_path = false) {
    $GLOBALS['test_loaded_textdomains'][] = array($domain, $plugin_rel_path);
    return true;
}
/** Returns the locale selected for the simulated WordPress admin request. */
function determine_locale() { return $GLOBALS['test_locale']; }
/** Keeps only the locale characters accepted in translation file names. */
function sanitize_locale_name($locale) { return preg_replace('/[^A-Za-z0-9_-]/', '', (string) $locale); }
/** Captures the compiled catalog loaded for the current locale. */
function load_textdomain($domain, $mofile) {
    $GLOBALS['test_loaded_translation_files'][] = array($domain, $mofile);
    return true;
}
/** Reports whether the simulated WordPress text domain already has a catalog. */
function is_textdomain_loaded($domain) {
    foreach ($GLOBALS['test_loaded_translation_files'] as $loaded) {
        if ($loaded[0] === $domain) {
            return true;
        }
    }
    return false;
}
/** Builds an admin URL for the simulated WordPress site. */
function admin_url($path = '') { return 'https://wordpress.example/wp-admin/' . ltrim($path, '/'); }
/** Escapes a URL for HTML output. */
function esc_url($value) { return htmlspecialchars((string) $value, ENT_QUOTES, 'UTF-8'); }
/** Sanitizes a URL before it is included in a GitHub event. */
function esc_url_raw($value) { return filter_var((string) $value, FILTER_SANITIZE_URL); }
/** Escapes text for HTML output. */
function esc_html($value) { return htmlspecialchars((string) $value, ENT_QUOTES, 'UTF-8'); }
/** Translates and escapes a string for HTML output. */
function esc_html__($value, $domain = null) { return esc_html(__($value, $domain)); }
/** Escapes a value for an HTML attribute. */
function esc_attr($value) { return htmlspecialchars((string) $value, ENT_QUOTES, 'UTF-8'); }
/** Returns a configured fixture translation or the English source string. */
function __($value, $domain = null) {
    return $domain === 'wp-awesome' && isset($GLOBALS['test_translations'][$value])
        ? $GLOBALS['test_translations'][$value]
        : $value;
}
/** Identifies errors created by the WordPress test double. */
function is_wp_error($value) { return $value instanceof WP_Error; }
/** Creates a directory recursively like the WordPress filesystem helper. */
function wp_mkdir_p($path) { return is_dir($path) || mkdir($path, 0775, true); }
/** Stops a request when a simulated WordPress permission check fails. */
function wp_die($message) { throw new RuntimeException((string) $message); }
/** Captures the Tools page callback registered by the MU-plugin. */
function add_management_page($page_title, $menu_title, $capability, $menu_slug, $callback) {
    $GLOBALS['test_admin_page'] = $callback;
}
/** Checks the test user's global or per-record capability. */
function current_user_can($capability, $object_id = null) {
    if ($capability === 'edit_post') {
        return !empty($GLOBALS['test_capabilities']['edit_post'][$object_id]);
    }
    return !empty($GLOBALS['test_capabilities'][$capability]);
}
/** Renders a deterministic nonce field for form checks. */
function wp_nonce_field($action) { return '<input name="_wpnonce" value="nonce:' . esc_attr($action) . '">'; }
/** Enforces the action nonce submitted by a simulated admin request. */
function check_admin_referer($action) {
    if (!isset($_REQUEST['_wpnonce']) || $_REQUEST['_wpnonce'] !== 'nonce:' . $action) {
        throw new RuntimeException('Invalid nonce for ' . $action);
    }
}
/** Adds the deterministic action nonce to a row URL. */
function wp_nonce_url($url, $action) { return add_query_arg('_wpnonce', 'nonce:' . $action, $url); }
/** Renders the single admin submit button. */
function submit_button($text, $type = 'primary', $name = 'submit', $wrap = true) {
    echo '<button type="submit" class="button ' . esc_attr($type) . '">' . esc_html($text) . '</button>';
}
/** Adds encoded query parameters to a simulated WordPress URL. */
function add_query_arg($key, $value = null, $url = null) {
    if (is_array($key)) {
        $arguments = $key;
        $url = $value;
    } else {
        $arguments = array($key => $value);
    }
    $separator = strpos($url, '?') === false ? '?' : '&';
    return $url . $separator . http_build_query($arguments);
}
/** Captures a safe redirect and exits the handler through a test exception. */
function wp_safe_redirect($url) {
    $GLOBALS['test_redirect_url'] = $url;
    throw new Test_Redirect($url);
}
/** Removes request slashes recursively, matching the WordPress helper. */
function wp_unslash($value) {
    return is_array($value) ? array_map('wp_unslash', $value) : stripslashes((string) $value);
}
/** Returns the absolute integer representation of a test value. */
function absint($value) { return abs((int) $value); }
/** Normalizes a value to the lowercase characters accepted in WordPress keys. */
function sanitize_key($value) { return strtolower(preg_replace('/[^A-Za-z0-9_\-]/', '', (string) $value)); }
/** Returns the public post types used by the list-column fixture. */
function get_post_types($args, $output) { return array('post', 'page', 'book', 'attachment'); }
/** Returns a registered fixture post-type definition. */
function get_post_type_object($post_type) {
    return isset($GLOBALS['test_post_types'][$post_type]) ? $GLOBALS['test_post_types'][$post_type] : null;
}
/** Returns whether a fixture taxonomy is publicly visible. */
function get_taxonomy($taxonomy) {
    return (object) array('public' => $taxonomy === 'category');
}
/** Returns one fixture post by ID. */
function get_post($post_id) { return isset($GLOBALS['test_posts'][$post_id]) ? $GLOBALS['test_posts'][$post_id] : null; }
/** Builds the public URL for a fixture post. */
function get_permalink($post) { return 'https://wordpress.example/' . $post->post_type . '/' . $post->ID . '/'; }
/** Marks fixture posts as non-revisions. */
function wp_is_post_revision($post_id) { return false; }
/** Marks fixture posts as non-autosaves. */
function wp_is_post_autosave($post_id) { return false; }
/** Captures a GitHub request and returns the configured HTTP response. */
function wp_remote_request($url, $args) {
    $GLOBALS['test_requests'][] = array('url' => $url, 'args' => $args);
    return array('response' => array('code' => $GLOBALS['test_response_code']));
}
/** Returns the HTTP status from a simulated WordPress response. */
function wp_remote_retrieve_response_code($response) { return $response['response']['code']; }
/** Encodes the JSON request bodies under test. */
function wp_json_encode($value) { return json_encode($value); }

$page_type = (object) array('public' => true, 'show_ui' => true);
$book_type = (object) array('public' => true, 'show_ui' => true, 'hierarchical' => true);
$GLOBALS['test_post_types'] = array(
    'post' => $page_type,
    'page' => $page_type,
    'book' => $book_type,
    'attachment' => $page_type,
    'private_note' => (object) array('public' => false, 'show_ui' => true),
);

try {
    $translation_directory = WP_PLUGIN_DIR . '/wp-awesome/languages';
    mkdir($translation_directory, 0775, true);
    copy(dirname(__DIR__) . '/languages/wp-awesome-fr_FR.mo', $translation_directory . '/wp-awesome-fr_FR.mo');

    require dirname(__DIR__) . '/wp-awesome.php';
    test_assert(is_array($GLOBALS['test_activation_callback']), 'the normal plugin registers its installer activation hook');
    test_assert(is_array($GLOBALS['test_deactivation_callback']), 'the normal plugin registers its MU-plugin cleanup hook');
    call_user_func($GLOBALS['test_activation_callback']);
    run_test_action('init');
    test_assert(in_array(array('wp-awesome', 'wp-awesome/languages'), $GLOBALS['test_loaded_textdomains'], true), 'English-default plugin strings load the bundled translation catalog');
    $GLOBALS['test_locale'] = 'fr_FR';
    WP_Awesome_Plugin_Installer::load_textdomain();
    test_assert(in_array(array('wp-awesome', $translation_directory . '/wp-awesome-fr_FR.mo'), $GLOBALS['test_loaded_translation_files'], true), 'the French admin locale loads the bundled French catalog');
    $GLOBALS['test_locale'] = 'en_US';
    $plugin_links = WP_Awesome_Plugin_Installer::add_plugin_link(array());
    test_assert(strpos($plugin_links[0], 'Build site') !== false, 'the plugin action link uses English by default');
    $GLOBALS['test_translations']['Build site'] = 'Mise à jour du site';
    $french_plugin_links = WP_Awesome_Plugin_Installer::add_plugin_link(array());
    test_assert(strpos($french_plugin_links[0], 'Mise à jour du site') !== false, 'the plugin action link can render its French translation');
    $GLOBALS['test_translations'] = array();

    $mu_plugin = WPMU_PLUGIN_DIR . '/wp-awesome-mu.php';
    $source = file_get_contents(dirname(__DIR__) . '/wp-awesome-mu.php');
    test_assert(is_file($mu_plugin) && file_get_contents($mu_plugin) === $source, 'activation copies the packaged MU-plugin into WordPress');
    test_assert(strpos($source, WP_Awesome_Lifecycle::OWNERSHIP_MARKER) !== false, 'the installed MU-plugin carries its ownership marker');

    file_put_contents($mu_plugin, 'foreign file');
    $install_result = WP_Awesome_Lifecycle::install_mu_plugin();
    test_assert(is_wp_error($install_result) && file_get_contents($mu_plugin) === 'foreign file', 'installation preserves an unrelated file at the destination');
    file_put_contents($mu_plugin, $source);

    require $mu_plugin;
    run_test_action('admin_init');
    test_assert(isset($GLOBALS['test_filters']['manage_posts_columns']), 'the post list receives a build column');
    test_assert(isset($GLOBALS['test_filters']['manage_pages_columns']), 'the page list receives a build column');
    test_assert(isset($GLOBALS['test_filters']['manage_book_posts_columns']), 'public custom post types receive a build column');
    test_assert(isset($GLOBALS['test_filters']['manage_media_columns']), 'the media list receives a build column');
    test_assert(isset($GLOBALS['test_actions']['manage_pages_custom_column'])
        && count($GLOBALS['test_actions']['manage_pages_custom_column']) === 1, 'hierarchical custom types share the page-row renderer without duplicate output');

    $columns = apply_test_filters('manage_pages_columns', array('title' => 'Title'));
    test_assert(isset($columns['wp_awesome_build']) && $columns['wp_awesome_build'] === 'Build', 'the English-default build column is appended to existing columns');
    $GLOBALS['test_translations']['Build'] = 'Mise à jour';
    $french_columns = apply_test_filters('manage_pages_columns', array('title' => 'Title'));
    test_assert($french_columns['wp_awesome_build'] === 'Mise à jour', 'the build column can render its French translation');
    $GLOBALS['test_translations'] = array();
    ob_start();
    WP_Awesome_MU_Build_Controls::render_admin_page();
    $page_html = ob_get_clean();
    test_assert(strpos($page_html, 'Build the entire site') !== false, 'English is the default text for the global build button');
    $GLOBALS['test_translations']['Build the entire site'] = 'Mettre à jour tout le site';
    ob_start();
    WP_Awesome_MU_Build_Controls::render_admin_page();
    $french_page_html = ob_get_clean();
    test_assert(strpos($french_page_html, 'Mettre à jour tout le site') !== false, 'the global build button can render its French translation');
    $GLOBALS['test_translations'] = array();
    test_assert(strpos($page_html, 'outbox') === false && strpos($page_html, 'GitHub Actions') === false, 'the tools page has no queue or diagnostics controls');

    $_REQUEST = array('_wpnonce' => 'nonce:wp_awesome_build_site');
    $_POST = $_REQUEST;
    try {
        WP_Awesome_MU_Build_Controls::handle_site_build();
    } catch (Test_Redirect $redirect) {
        // The normal handler returns through a WordPress admin redirect.
    }
    $site_request = end($GLOBALS['test_requests']);
    $site_payload = json_decode($site_request['args']['body'], true);
    test_assert($site_payload['event_type'] === 'beautiful_content', 'the global button dispatches the configured GitHub event');
    test_assert($site_payload['client_payload']['scope'] === 'site', 'the global event requests a full-site build');
    test_assert(strpos($site_request['args']['body'], 'test-token') === false, 'the GitHub token is sent only in the authorization header');

    $record = new WP_Post();
    $record->ID = 41;
    $record->post_type = 'page';
    $record->post_status = 'publish';
    $record->post_title = 'Current title';
    $record->post_content = 'Current content';
    $record->post_excerpt = '';
    $record->post_name = 'current-title';
    $record->post_parent = 0;
    $record->menu_order = 0;
    $GLOBALS['test_posts'][41] = $record;
    $GLOBALS['test_capabilities']['edit_post'][41] = true;

    ob_start();
    WP_Awesome_MU_Build_Controls::render_build_column('wp_awesome_build', 41);
    $row_html = ob_get_clean();
    test_assert(strpos($row_html, 'record_id=41') !== false && strpos($row_html, 'Build this item') !== false, 'the English row action identifies the selected record');
    $GLOBALS['test_translations']['Build this item'] = 'Mettre à jour cet élément';
    ob_start();
    WP_Awesome_MU_Build_Controls::render_build_column('wp_awesome_build', 41);
    $french_row_html = ob_get_clean();
    test_assert(strpos($french_row_html, 'Mettre à jour cet élément') !== false, 'the row action can render its French translation');
    $GLOBALS['test_translations'] = array();
    $_REQUEST = array('record_id' => '41', '_wpnonce' => 'nonce:wp_awesome_build_record_41');
    try {
        WP_Awesome_MU_Build_Controls::handle_record_build();
    } catch (Test_Redirect $redirect) {
        // The normal handler returns to the content list after dispatch.
    }
    $record_request = end($GLOBALS['test_requests']);
    $record_payload = json_decode($record_request['args']['body'], true)['client_payload'];
    test_assert($record_payload['scope'] === 'record' && $record_payload['record_id'] === 41, 'a row action requests only its selected record');
    test_assert($record_payload['record_type'] === 'page' && $record_payload['record_url'] === 'https://wordpress.example/page/41/', 'the record event identifies its type and public URL');
    test_assert($record_payload['record_status'] === 'publish' && $record_payload['changed_fields'] === array('manual'), 'manual record events carry a complete record state');

    $GLOBALS['test_requests'] = array();
    $GLOBALS['test_redirect_url'] = '';
    $previous = clone $record;
    $previous->post_title = 'Previous title';
    $changed = clone $record;
    $changed->post_title = 'Current title';
    run_test_action('wp_after_insert_post', 41, $changed, true, $previous);
    run_test_action('updated_post_meta', 1, 41, 'subtitle', 'Changed subtitle');
    run_test_action('updated_post_meta', 2, 41, '_edit_lock', 'ignored');
    run_test_action('set_object_terms', 41, array(3), array(3), 'category', false, array());
    test_assert(count(WP_Awesome_MU_Build_Controls::$pending_records) === 1, 'post, metadata, and taxonomy edits are deduplicated in memory');
    run_test_action('shutdown');
    test_assert(count($GLOBALS['test_requests']) === 1, 'one automatic dispatch is sent for the changed record');
    $automatic_payload = json_decode($GLOBALS['test_requests'][0]['args']['body'], true)['client_payload'];
    test_assert($automatic_payload['scope'] === 'record' && $automatic_payload['source'] === 'wordpress-save', 'saving a post triggers its own automatic build');
    test_assert($automatic_payload['record_id'] === 41 && $automatic_payload['record_type'] === 'page', 'the automatic event identifies the changed page');
    test_assert(in_array('title', $automatic_payload['changed_fields'], true)
        && in_array('subtitle', $automatic_payload['changed_fields'], true)
        && in_array('category', $automatic_payload['changed_fields'], true)
        && !in_array('edit_lock', $automatic_payload['changed_fields'], true), 'only meaningful content changes enter the request');

    $draft = clone $record;
    $draft->post_status = 'draft';
    $old_draft = clone $draft;
    $old_draft->post_title = 'Old draft title';
    run_test_action('wp_after_insert_post', 42, $draft, true, $old_draft);
    run_test_action('shutdown');
    test_assert(count($GLOBALS['test_requests']) === 1, 'draft-only edits do not rebuild public output');

    run_test_action('before_delete_post', 41, $record);
    run_test_action('shutdown');
    $deleted_payload = json_decode(end($GLOBALS['test_requests'])['args']['body'], true)['client_payload'];
    test_assert($deleted_payload['record_status'] === 'deleted', 'deleting a published record requests its removal from the build');

    $unrelated = WPMU_PLUGIN_DIR . '/unrelated.php';
    file_put_contents($unrelated, 'unrelated MU-plugin');
    file_put_contents($mu_plugin, 'foreign file');
    try {
        include dirname(__DIR__) . '/uninstall.php';
        test_assert(false, 'uninstall refuses to remove a file without its ownership marker');
    } catch (RuntimeException $error) {
        test_assert(strpos($error->getMessage(), 'ownership marker') !== false, 'uninstall reports a foreign MU-plugin path');
    }
    test_assert(file_get_contents($mu_plugin) === 'foreign file', 'uninstall preserves a foreign MU-plugin file');
    file_put_contents($mu_plugin, $source);
    include dirname(__DIR__) . '/uninstall.php';
    test_assert(!file_exists($mu_plugin), 'plugin uninstall removes the installed WP Awesome MU-plugin');
    test_assert(file_get_contents($unrelated) === 'unrelated MU-plugin', 'plugin uninstall preserves other MU-plugins');

    echo "WP Awesome MU-plugin checks passed.\n";
} finally {
    test_remove_tree($GLOBALS['test_root']);
}
