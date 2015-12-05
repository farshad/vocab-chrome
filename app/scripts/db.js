'use strict';
var db;
var databaseOpen = function () {
  // Open a database, specify the name and version
  var version = 1;
  //indexedDB.deleteDatabase('vocab');
  var request = indexedDB.open('vocab', version);

  request.onupgradeneeded = function(e) {
    db = e.target.result;
    e.target.transaction.onerror = databaseError;
    var category = db.createObjectStore('category', { autoIncrement: true });
    category.createIndex('id', 'key', { unique: true });
    category.createIndex('name', 'name', { unique: true });
    category.createIndex('wordCount', 'wordCount', { unique: false });
  };

  request.onsuccess = function(e) {
    db = e.target.result;
  };
  request.onerror = databaseError;
}
function databaseError(e) {
  console.error('An IndexedDB Error has occurred', e);
}
//initial database
databaseOpen();