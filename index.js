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

const wrappers = require('pouchdb-wrappers');
const nodify = require('promise-nodify');
const Promise = require('bluebird');
const getSize = Promise.promisify(require('get-folder-size'));
const fileBytes = require('file-bytes');

exports.installSizeWrapper = function () {
  const db = this;

  wrappers.installWrapperMethods(db, {
    info: function (orig, args) {
      let resp;
      return orig().then(function (info) {
        resp = info;

        return exports.getDiskSize.call(db);
      }).then(function (diskSize) {
        resp.disk_size = diskSize;

        return resp;
      }).catch(function () {
        //surpress - .info() should keep functioning if for some reason
        //it's impossible to get the disk_size.
        return resp;
      });
    }
  });
};

exports.getDiskSize = function (callback) {
  const db = this;
  let promise;

  if (db.type() === 'leveldb') {
    const prefix = db.__opts.prefix || '';
    const path = prefix + db._db_name;

    // wait until the database is ready. Necessary for at least sqldown,
    // which doesn't write anything to disk sooner.
    const then = db.then || function (cb) {
      return cb();
    };
    promise = then.call(db, function () {
      return getSize(path);
    });
  } else if (db.type() === 'webSQL') {
    const prefix = db.__opts.prefix || '';
    const path = prefix + db._db_name;

    // wait until the database is ready. Necessary for at least sqldown,
    // which doesn't write anything to disk sooner.
    const then = db.then || function (cb) {
      return cb();
    };
    promise = then.call(db, function () {
      return fileBytes(path + '.db');
    });
  } else {
    const msg = "Can't get the database size for database type '" + db.type() + "'!";
    promise = Promise.reject(new Error(msg));
  }

  nodify(promise, callback);
  return promise;
};
