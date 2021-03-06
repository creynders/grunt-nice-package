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
var verify = check.verify;
var fs = require('fs');
var join = require('path').join;

var taskName = 'nice-package';
var taskDescription = 'Opinionated package.json validator';

function unary(fn) {
  return function (first) {
    return fn(first);
  };
}

function initValidators(grunt) {
  console.assert(grunt, 'missing grunt object');

  var is = function (type, name, value) {
    if (!check[type](value)) {
      grunt.log.error('expected', name, 'to be', type, 'not', value);
      return false;
    }
    return true;
  };

  var validators = {
    name: is.bind(null, 'string', 'name'),
    version: is.bind(null, 'string', 'version'),
    description: is.bind(null, 'string', 'description'),

    engines: function (value) {
      if (typeof value !== 'object') {
        grunt.log.error('need an object for engines property');
        return false;
      }
      if (!check.string(value.node)) {
        grunt.log.error('engines object missing node record, has ' +
          JSON.stringify(value, null, 2));
        return false;
      }
      return true;
    },

    keywords: function (values) {
      if (!check.array(values)) {
        grunt.log.error('expected keywords to be an Array');
        return false;
      }

      return values.every(function (keyword) {
        if (!check.string(keyword)) {
          grunt.log.error('every keyword should be a string, found', keyword);
          return false;
        }
        return true;
      });
    },
    author: function (value) {
      if (!check.object(value) &&
        !check.string(value)) {
        grunt.log.error('invalid author value', value);
        return false;
      }
      return true;
    },
    repository: function (value) {
      if (!check.object(value)) {
        grunt.log.error('expected repository to be an object, not', value);
        return false;
      }
      if (!check.string(value.type)) {
        grunt.log.error('expected repository type to be a string, not', value.type);
        return false;
      }
      if (!check.string(value.url)) {
        grunt.log.error('expected repository url to be a string, not', value.url);
        return false;
      }
      return true;
    }
  };
  return validators;
}

function sortPackageProperties(grunt, done, blankLine, valid) {
  var fixpack = join(__dirname, '../node_modules/fixpack');
  var exec = require('child_process').exec;

  exec('node ' + fixpack, function (error, stdout, stderr) {
    if (error) {
      grunt.log.error(error);
      done(false);
    } else {
      grunt.log.writeln(stdout);
      if (stderr) {
        grunt.log.warn(stderr);
      }

      if (blankLine) {
        var txt = fs.readFileSync('package.json');
        if (!/\n\n$/.test(txt)) {
          txt += '\n';
          fs.writeFileSync('package.json', txt);
        }
      }
      done(valid);
    }
  });
}

function checkProperties(options, grunt, pkg) {
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
  return every;
}

function makePackageNicer(grunt, options, done, blankLine) {
  options = options || {};
  verify.fn(done, 'expected done to be a function');

  var pkg = grunt.file.readJSON('package.json');
  var every = checkProperties(options, grunt, pkg);

  // advanced checking
  if (!check.string(pkg.license) &&
    !check.array(pkg.licenses)) {
    grunt.log.error('missing license information');
    return false;
  }

  var pkgText = JSON.stringify(pkg, null, 2);
  pkgText = pkgText.replace(/\^/g, '');
  var result = every && PJV.validate(pkgText);
  if (!result.valid) {
    grunt.log.subhead('Errors:');
    result.errors.forEach(unary(grunt.log.error));
  }
  if (check.array(result.warnings) &&
    result.warnings.length) {
    grunt.log.subhead('Warnings:');
    result.warnings.forEach(unary(grunt.log.warn));
  }

  sortPackageProperties(grunt, done, blankLine, !!result.valid);
}

module.exports = function(grunt) {
  var defaultValidators = initValidators(grunt);

  if (grunt.config.data[taskName]) {
    grunt.verbose.writeln('Using', taskName, 'multi task');

    grunt.registerMultiTask(taskName, taskDescription, function() {
      // Merge custom validation functions with default ones
      var options = this.options(defaultValidators);
      var blankLine = !!options.blankLine;
      delete options.blankLine;
      makePackageNicer(grunt, options, this.async(), blankLine);
    });
  } else {
    grunt.verbose.writeln('Using', taskName, 'task');

    grunt.registerTask(taskName, taskDescription, function () {
      makePackageNicer(grunt, defaultValidators, this.async());
    });
  }
};
