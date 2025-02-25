/*
  Copyright 2014, Marten de Vries

  Licensed under the Apache License, Version 2.0 (the "License");
  you may not use this file except in compliance with the License.
  You may obtain a copy of the License at

  http://www.apache.org/licenses/LICENSE-2.0

  Unless required by applicable law or agreed to in writing, software
  distributed under the License is distributed on an "AS IS" BASIS,
  WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
  See the License for the specific language governing permissions and
  limitations under the License.
*/

"use strict";

var wrappers = require('pouchdb-wrappers');
var nodify = require('promise-nodify');
var Promise = require('bluebird');
var getSize = Promise.promisify(require('get-folder-size'));
var fileBytes = require('file-bytes');

exports.installSizeWrapper = function () {
  var db = this;

  wrappers.installWrapperMethods(db, {
    info: function (orig, args) {
      return orig().then(function (info) {
        return exports.getDiskSize.call(db)
          .then(function (diskSize) {
            info.disk_size = diskSize;
            return info;
          }).catch(function () {
            //surpress - .info() should keep functioning if for some reason
            //it's impossible to get the disk_size.
            return info;
          });
      });
    }
  });
};

exports.getDiskSize = function (callback) {
  var db = this;
  var promise;
  var prefix = db.__opts.prefix || '';
  var path = prefix + db.name;

  // wait until the database is ready. Necessary for at least sqldown,
  // which doesn't write anything to disk sooner.
  var then = db.then || function (cb) {
    return cb();
  };

  if (db.type() === 'leveldb') {

    promise = then.call(db, function () {
      return getSize(path);
    });
  } else if (db.type() === 'websql') {
    promise = then.call(db, function () {
      return fileBytes(`${path}.db`);
    });
  } else {
    var msg = "Can't get the database size for database type '" + db.type() + "'!";
    promise = Promise.reject(new Error(msg));
  }

  nodify(promise, callback);
  return promise;
};
