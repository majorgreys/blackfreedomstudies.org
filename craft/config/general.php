<?php

/**
 * General Configuration
 *
 * All of your system's general configuration settings go in here.
 * You can see a list of the default settings in craft/app/etc/config/defaults/general.php
 */

// Ensure our URLs have the right scheme.
define('URI_SCHEME', (isset($_SERVER['HTTPS'])) ? 'https://' : 'http://');

// The site URL.
define('SITE_URL', URI_SCHEME . $_SERVER['SERVER_NAME'] . '/');

// The site basepath.
define('BASEPATH', realpath(CRAFT_BASE_PATH . '/../') . '/');

return array(
  '*' => array(
    'omitScriptNameInUrls' => true,

    'environmentVariables' => array(
      'siteUrl'  => SITE_URL,
      'baseUrl'  => SITE_URL,
      'basePath' => BASEPATH
    )
  ),

  'blackfreedomstudiesorg.craft.dev' => array(
    'devMode' => true,
    'cacheDuration' => 'PT30S',
    'environmentVariables' => array(
      'siteUrl'  => 'http://blackfreedomstudiesorg.craft.dev/',
      'baseUrl'  => 'http://blackfreedomstudiesorg.craft.dev/',
      'basePath' => BASEPATH
    )
  ),
);
