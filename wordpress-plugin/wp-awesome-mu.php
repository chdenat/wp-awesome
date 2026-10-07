<?php
/******************************************************************************
 * This file is part of the wp-awesome package.
 *
 * File: wordpress-plugin/wp-awesome-mu.php
 *
 * Author: Christian Denat
 *
 * Created on: 2026-10-07
 * Last modified: 2026-10-07
 *
 * Copyright © 2026 Christian Denat
 ******************************************************************************/

/**
 * WP Awesome managed MU-plugin.
 *
 * Plugin Name: WP Awesome Build Controls
 * Description: Adds manual site and content build requests to WordPress.
 * Version: 0.1.0
 * Requires at least: 5.6
 * Requires PHP: 7.2
 * Text Domain: wp-awesome
 */

defined('ABSPATH') || exit;

/** Provides the manual build page, content-list buttons, and GitHub dispatch. */
final class WP_Awesome_MU_Build_Controls {
    const PAGE_SLUG = 'wp-awesome';
    const SITE_ACTION = 'wp_awesome_build_site';
    const RECORD_ACTION = 'wp_awesome_build_record';
    const COLUMN = 'wp_awesome_build';
    const MAX_CHANGED_FIELDS = 100;

    /** @var array<int, array<string, mixed>> Records changed during this request. */
    public static $pending_records = array();

    /** Registers the single admin page and build actions. */
    public static function boot() {
        add_action('admin_menu', array(__CLASS__, 'register_admin_page'));
        add_action('admin_post_' . self::SITE_ACTION, array(__CLASS__, 'handle_site_build'));
        add_action('admin_post_' . self::RECORD_ACTION, array(__CLASS__, 'handle_record_build'));
        add_action('admin_notices', array(__CLASS__, 'render_notice'));
        add_action('admin_init', array(__CLASS__, 'register_content_columns'), 20);
        add_action('wp_after_insert_post', array(__CLASS__, 'capture_post_change'), 20, 4);
        add_action('before_delete_post', array(__CLASS__, 'capture_post_deletion'), 10, 2);
        add_action('added_post_meta', array(__CLASS__, 'capture_post_meta_change'), 10, 4);
        add_action('updated_post_meta', array(__CLASS__, 'capture_post_meta_change'), 10, 4);
        add_action('deleted_post_meta', array(__CLASS__, 'capture_post_meta_change'), 10, 4);
        add_action('set_object_terms', array(__CLASS__, 'capture_taxonomy_change'), 10, 6);
        add_action('shutdown', array(__CLASS__, 'dispatch_captured_records'));
    }

    /** Adds the one-page global build control under Tools. */
    public static function register_admin_page() {
        add_management_page(
            __('WP Awesome', 'wp-awesome'),
            __('WP Awesome', 'wp-awesome'),
            'manage_options',
            self::PAGE_SLUG,
            array(__CLASS__, 'render_admin_page')
        );
    }

    /** Renders only the global update button and the result notice. */
    public static function render_admin_page() {
        if (!current_user_can('manage_options')) {
            wp_die(esc_html__('You do not have permission to perform this action.', 'wp-awesome'));
        }

        echo '<div class="wrap">';
        echo '<h1>' . esc_html__('WP Awesome', 'wp-awesome') . '</h1>';
        echo '<form method="post" action="' . esc_url(admin_url('admin-post.php')) . '">';
        echo '<input type="hidden" name="action" value="' . esc_attr(self::SITE_ACTION) . '">';
        wp_nonce_field(self::SITE_ACTION);
        submit_button(__('Build the entire site', 'wp-awesome'), 'primary', 'submit', false);
        echo '</form></div>';
    }

    /** Registers a build column for every public post type with an admin list. */
    public static function register_content_columns() {
        $post_types = get_post_types(array('public' => true, 'show_ui' => true), 'names');
        $registered_render_hooks = array();
        foreach ($post_types as $post_type) {
            $hooks = self::column_hooks($post_type);
            add_filter($hooks['columns'], array(__CLASS__, 'add_build_column'));
            if (!isset($registered_render_hooks[$hooks['render']])) {
                add_action($hooks['render'], array(__CLASS__, 'render_build_column'), 10, 2);
                $registered_render_hooks[$hooks['render']] = true;
            }
        }
    }

    /** Resolves the core list-table hooks for posts, pages, media, and custom types. */
    private static function column_hooks($post_type) {
        if ($post_type === 'post') {
            return array('columns' => 'manage_posts_columns', 'render' => 'manage_posts_custom_column');
        }
        if ($post_type === 'page') {
            return array('columns' => 'manage_pages_columns', 'render' => 'manage_pages_custom_column');
        }
        if ($post_type === 'attachment') {
            return array('columns' => 'manage_media_columns', 'render' => 'manage_media_custom_column');
        }

        $post_type_object = get_post_type_object($post_type);
        $render_hook = $post_type_object && !empty($post_type_object->hierarchical)
            ? 'manage_pages_custom_column'
            : 'manage_' . $post_type . '_posts_custom_column';

        return array(
            'columns' => 'manage_' . $post_type . '_posts_columns',
            'render' => $render_hook,
        );
    }

    /** Collects meaningful saves of published public content without writing to the database. */
    public static function capture_post_change($record_id, $record, $update, $record_before) {
        if (!($record instanceof WP_Post)
            || wp_is_post_revision($record_id)
            || wp_is_post_autosave($record_id)
            || !self::is_public_record($record)) {
            return;
        }

        $was_public = $record_before instanceof WP_Post && self::is_publicly_visible($record_before);
        if (!self::is_publicly_visible($record) && !$was_public) {
            return;
        }

        $changed_fields = array();
        if (!$update || !($record_before instanceof WP_Post)) {
            $changed_fields[] = 'created';
        } else {
            foreach (array(
                'post_title' => 'title',
                'post_content' => 'content',
                'post_excerpt' => 'excerpt',
                'post_status' => 'status',
                'post_name' => 'slug',
                'post_parent' => 'parent',
                'menu_order' => 'order',
            ) as $property => $field) {
                if (isset($record_before->$property, $record->$property)
                    && $record_before->$property !== $record->$property) {
                    $changed_fields[] = $field;
                }
            }
        }

        if ($changed_fields) {
            self::remember_record_change($record, $record->post_status, $changed_fields);
        }
    }

    /** Collects a published record deletion before WordPress removes the post row. */
    public static function capture_post_deletion($record_id, $record) {
        if ($record instanceof WP_Post && self::is_publicly_visible($record) && self::is_public_record($record)) {
            self::remember_record_change($record, 'deleted', array('deleted'));
        }
    }

    /** Collects meaningful metadata changes attached to a published public record. */
    public static function capture_post_meta_change($meta_id, $record_id, $meta_key, $meta_value) {
        $ignored_keys = array('_edit_lock', '_edit_last', '_wp_old_date', '_encloseme', '_pingme');
        $meta_key = is_scalar($meta_key) ? (string) $meta_key : '';
        if (in_array($meta_key, $ignored_keys, true)
            || strpos($meta_key, '_oembed_') === 0
            || strpos($meta_key, '_transient_') === 0) {
            return;
        }

        $record = get_post($record_id);
        if ($record instanceof WP_Post && self::is_publicly_visible($record) && self::is_public_record($record)) {
            self::remember_record_change($record, $record->post_status, array('metadata', $meta_key));
        }
    }

    /** Collects public taxonomy relationship changes for their published content record. */
    public static function capture_taxonomy_change($record_id, $terms, $term_taxonomy_ids, $taxonomy, $append, $old_term_taxonomy_ids) {
        $taxonomy_object = get_taxonomy($taxonomy);
        $record = get_post($record_id);
        if ($taxonomy_object && !empty($taxonomy_object->public)
            && $record instanceof WP_Post && self::is_publicly_visible($record) && self::is_public_record($record)) {
            self::remember_record_change($record, $record->post_status, array('taxonomy', $taxonomy));
        }
    }

    /** Dispatches each distinct changed record after WordPress finishes the current request. */
    public static function dispatch_captured_records() {
        foreach (self::$pending_records as $record) {
            $result = self::dispatch_build('record', $record, 'wordpress-save');
            if ($result !== 'build_queued') {
                error_log('WP Awesome could not dispatch an automatic content build (' . $result . ').');
            }
        }
        self::$pending_records = array();
    }

    /** Returns whether a record belongs to a public content type shown in WordPress admin. */
    private static function is_public_record($record) {
        $post_type = get_post_type_object($record->post_type);
        return $post_type && !empty($post_type->public) && !empty($post_type->show_ui);
    }

    /** Includes publicly served attachments whose standard WordPress status is inherit. */
    private static function is_publicly_visible($record) {
        return $record->post_status === 'publish'
            || ($record->post_type === 'attachment' && $record->post_status === 'inherit');
    }

    /** Merges one record change into this request's in-memory dispatch list. */
    private static function remember_record_change($record, $status, $changed_fields) {
        $record_id = absint($record->ID);
        $record_type = sanitize_key($record->post_type);
        if ($record_id < 1 || $record_type === '') {
            return;
        }

        if (!isset(self::$pending_records[$record_id])) {
            self::$pending_records[$record_id] = array(
                'record_type' => $record_type,
                'record_id' => $record_id,
                'record_url' => esc_url_raw(get_permalink($record)),
                'record_status' => sanitize_key($status),
                'changed_fields' => array(),
            );
        }

        $fields = self::$pending_records[$record_id]['changed_fields'];
        foreach ($changed_fields as $field) {
            if (is_scalar($field)) {
                $field = sanitize_key((string) $field);
                if ($field !== '') {
                    $fields[] = $field;
                }
            }
        }
        self::$pending_records[$record_id]['changed_fields'] = array_slice(array_values(array_unique($fields)), 0, self::MAX_CHANGED_FIELDS);
        self::$pending_records[$record_id]['record_status'] = sanitize_key($status);
    }

    /** Appends the WP Awesome build column to one WordPress content list. */
    public static function add_build_column($columns) {
        unset($columns[self::COLUMN]);
        $columns[self::COLUMN] = __('Build', 'wp-awesome');
        return $columns;
    }

    /** Renders a nonce-protected request for the published row being displayed. */
    public static function render_build_column($column, $record_id) {
        if ($column !== self::COLUMN) {
            return;
        }

        $record_id = absint($record_id);
        $record = get_post($record_id);
        if (!$record || !self::is_publicly_visible($record) || !current_user_can('edit_post', $record_id)) {
            echo '—';
            return;
        }

        $url = add_query_arg(
            array('action' => self::RECORD_ACTION, 'record_id' => $record_id),
            admin_url('admin-post.php')
        );
        $url = wp_nonce_url($url, self::RECORD_ACTION . '_' . $record_id);
        echo '<a class="button button-small" href="' . esc_url($url) . '">' . esc_html__('Build this item', 'wp-awesome') . '</a>';
    }

    /** Handles an administrator request to rebuild the whole site. */
    public static function handle_site_build() {
        self::require_capability('manage_options');
        check_admin_referer(self::SITE_ACTION);

        $notice = self::dispatch_build('site');
        self::redirect_with_notice(admin_url('tools.php?page=' . self::PAGE_SLUG), $notice);
    }

    /** Handles an editor request to rebuild one published public content record. */
    public static function handle_record_build() {
        $raw_record_id = isset($_REQUEST['record_id']) ? wp_unslash($_REQUEST['record_id']) : '';
        $record_id = is_scalar($raw_record_id) ? absint($raw_record_id) : 0;
        check_admin_referer(self::RECORD_ACTION . '_' . $record_id);

        $record = get_post($record_id);
        if (!$record || !current_user_can('edit_post', $record_id)) {
            wp_die(esc_html__('You do not have permission to update this content.', 'wp-awesome'));
        }

        $post_type = get_post_type_object($record->post_type);
        if (!$post_type || empty($post_type->public) || empty($post_type->show_ui) || !self::is_publicly_visible($record)) {
            wp_die(esc_html__('Only published public content can trigger a build.', 'wp-awesome'));
        }

        $notice = self::dispatch_build('record', array(
            'record_type' => sanitize_key($record->post_type),
            'record_id' => $record_id,
            'record_url' => esc_url_raw(get_permalink($record)),
            'record_status' => sanitize_key($record->post_status),
            'changed_fields' => array('manual'),
        ));
        $list_url = add_query_arg('post_type', sanitize_key($record->post_type), admin_url('edit.php'));
        self::redirect_with_notice($list_url, $notice);
    }

    /** Sends a site-wide or single-record request to the configured GitHub event. */
    private static function dispatch_build($scope, $record = array(), $source = 'wordpress-admin') {
        $configuration = self::build_configuration();
        if (isset($configuration['error'])) {
            return $configuration['error'];
        }

        $payload = array(
            'target' => $configuration['target'],
            'source' => $source,
            'requested_at' => gmdate(DATE_ATOM),
            'scope' => $scope,
        );
        if ($scope === 'record') {
            $payload = array_merge($payload, $record);
        }

        $repo_parts = explode('/', $configuration['repository'], 2);
        $url = 'https://api.github.com/repos/'
            . rawurlencode($repo_parts[0]) . '/' . rawurlencode($repo_parts[1]) . '/dispatches';
        $body = wp_json_encode(array(
            'event_type' => $configuration['event_type'],
            'client_payload' => $payload,
        ));
        if (!is_string($body)) {
            return 'github_dispatch_failed';
        }

        $response = wp_remote_request($url, array(
            'method' => 'POST',
            'timeout' => 15,
            'redirection' => 0,
            'headers' => array(
                'Accept' => 'application/vnd.github+json',
                'Authorization' => 'Bearer ' . $configuration['token'],
                'Content-Type' => 'application/json',
                'User-Agent' => 'wp-awesome-build-controls',
                'X-GitHub-Api-Version' => '2022-11-28',
            ),
            'body' => $body,
        ));

        if (is_wp_error($response)) {
            return 'github_unreachable';
        }

        return wp_remote_retrieve_response_code($response) === 204
            ? 'build_queued'
            : 'github_dispatch_failed';
    }

    /** Validates server-side GitHub and target settings without exposing credentials. */
    private static function build_configuration() {
        $token = defined('WPEC_CONNECTOR_GITHUB_TOKEN') && is_string(WPEC_CONNECTOR_GITHUB_TOKEN)
            ? trim(WPEC_CONNECTOR_GITHUB_TOKEN) : '';
        $repository = defined('WPEC_CONNECTOR_REPOSITORY') && is_string(WPEC_CONNECTOR_REPOSITORY)
            ? trim(WPEC_CONNECTOR_REPOSITORY) : '';
        if ($token === '' || !preg_match('/^[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+$/D', $repository)) {
            return array('error' => 'configuration_missing');
        }

        $target = defined('WPEC_CONNECTOR_DEFAULT_TARGET') && is_string(WPEC_CONNECTOR_DEFAULT_TARGET)
            ? sanitize_key(WPEC_CONNECTOR_DEFAULT_TARGET) : 'staging';
        $targets = defined('WPEC_CONNECTOR_TARGETS') && is_array(WPEC_CONNECTOR_TARGETS)
            ? WPEC_CONNECTOR_TARGETS : array();
        $configured = isset($targets[$target]) && is_array($targets[$target]) ? $targets[$target] : array();
        $event_type = isset($configured['event_type']) ? trim((string) $configured['event_type']) : '';
        $enabled = isset($configured['enabled']) && in_array($configured['enabled'], array(true, 1, '1', 'true'), true);

        if (!in_array($target, array('staging', 'production'), true)
            || !preg_match('/^[A-Za-z0-9_-]{1,100}$/D', $event_type)) {
            return array('error' => 'configuration_missing');
        }
        if (!$enabled) {
            return array('error' => 'target_unavailable');
        }

        return array(
            'repository' => $repository,
            'token' => $token,
            'target' => $target,
            'event_type' => $event_type,
        );
    }

    /** Displays a fixed notice after a build request returns to WordPress. */
    public static function render_notice() {
        if (!isset($_GET['wp_awesome_notice'])) {
            return;
        }

        $notice = sanitize_key(wp_unslash($_GET['wp_awesome_notice']));
        $messages = array(
            'build_queued' => array(true, __('GitHub accepted the build request. Check the workflow result.', 'wp-awesome')),
            'configuration_missing' => array(false, __('Configure the GitHub repository, token, and build event in wp-config.php.', 'wp-awesome')),
            'target_unavailable' => array(false, __('The configured build target is disabled.', 'wp-awesome')),
            'github_unreachable' => array(false, __('WordPress could not reach the GitHub API.', 'wp-awesome')),
            'github_dispatch_failed' => array(false, __('GitHub did not accept the build request.', 'wp-awesome')),
        );
        if (!isset($messages[$notice])) {
            return;
        }

        $class = $messages[$notice][0] ? 'notice-success' : 'notice-error';
        echo '<div class="notice ' . esc_attr($class) . ' is-dismissible"><p>'
            . esc_html($messages[$notice][1]) . '</p></div>';
    }

    /** Checks one WordPress capability and stops unauthorized requests. */
    private static function require_capability($capability) {
        if (!current_user_can($capability)) {
            wp_die(esc_html__('You do not have permission to perform this action.', 'wp-awesome'));
        }
    }

    /** Redirects to a fixed WordPress admin screen with a safe notice code. */
    private static function redirect_with_notice($url, $notice) {
        $url = add_query_arg('wp_awesome_notice', sanitize_key($notice), $url);
        wp_safe_redirect($url);
        exit;
    }
}

WP_Awesome_MU_Build_Controls::boot();
