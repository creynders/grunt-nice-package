/*
 * grunt-nice-package
 * https://github.com/bahmutov/grunt-nice-package
 *
 * Copyright (c) 2013 Gleb Bahmutov
 * Licensed under the MIT license.
 */

'use strict';

var PJV = require('package-json-validator').PJV;
var check = require('check-types');

module.exports = function(grunt) {

  var is = function (type, name, value) {
    if (!check['is' + type](value)) {
      grunt.log.error('expected', name, 'to be', type, 'not', value);
      return false;
    }
    return true;
  };

  var defaultValidators = {
    name: is.bind(null, 'String', 'name'),
    version: is.bind(null, 'String', 'version'),
    description: is.bind(null, 'String', 'description'),
    keywords: function (values) {
      if (!check.isArray(values)) {
        grunt.log.error('expected keywords to be an Array');
        return false;
      }

      return values.every(function (keyword) {
        if (!check.isString(keyword)) {
          grunt.log.error('every keyword should be a string, found', keyword);
          return false;
        }
        return true;
      });
    },
    author: function (value) {
      if (!check.isObject(value) &&
        !check.iString(value)) {
        grunt.log.error('invalid author value', value);
        return false;
      }
      return true;
    },
    repository: function (value) {
      if (!check.isObject(value)) {
        grunt.log.error('expected repository to be an object, not', value);
        return false;
      }
      if (!check.isString(value.type)) {
        grunt.log.error('expected repository type to be a string, not', value.type);
        return false;
      }
      if (!check.isString(value.url)) {
        grunt.log.error('expected repository url to be a string, not', value.url);
        return false;
      }
      return true;
    }
  };

  grunt.registerMultiTask('nice-package', 'Opinionated package.json validator', function() {
    // Merge custom validation functions with default ones
    var options = this.options(defaultValidators);

    var pkg = grunt.file.readJSON('package.json');

    var every = Object.keys(options).every(function (key) {
      grunt.verbose.writeln('checking property', key);

      var property = pkg[key];
      if (!property) {
        grunt.log.error('package.json missing', key);
        return false;
      }
      if (typeof options[key] === 'function') {
        if (!options[key](property)) {
          grunt.log.error('failed check for property', key);
          return false;
        }
      }

      return true;
    });

    if (!every) {
      // return false;
    }

    // advanced checking
    if (!check.isString(pkg.license) &&
      !check.isArray(pkg.licenses)) {
      grunt.log.error('missing license information');
      return false;
    }
    // todo: use package validator
    var result = PJV.validate(JSON.stringify(pkg, null, 2));
    if (!result.valid) {
      grunt.log.error(result.errors);
      return false;
    }
    if (check.isArray(result.warnings) &&
      result.warnings.length) {
      grunt.log.warn(result.warnings);
    }

    return true;
  });

};
