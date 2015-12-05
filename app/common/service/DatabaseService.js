'use strict';

angular.module('vocab')
  .service('DatabaseService', function($q) {

    //open database
    this.connect = function(){
      var db = openDatabase('vocab', '1.1', 'vocab local database', 50 * 1024 * 1024);

      db.transaction(function (tx) {
        tx.executeSql('CREATE TABLE IF NOT EXISTS category (id integer primary key autoincrement, name unique)');
      });

      db.transaction(function (tx) {
        tx.executeSql('CREATE TABLE IF NOT EXISTS word (id integer primary key autoincrement, name, phonetically,  meaning,  example,  translate,  category_id integer, view_count integer default 0, favorite integer  default 0)');
      });

      //option table
      db.transaction(function (tx) {
        tx.executeSql('CREATE TABLE IF NOT EXISTS options (id integer primary key autoincrement, key, value)');
      });

      //db.transaction(function(tx) {
      //  tx.executeSql("DROP TABLE category");
      //});
      //
      //db.transaction(function(tx) {
      //  tx.executeSql("DROP TABLE word");
      //});
      //
      //db.transaction(function(tx) {
      //  tx.executeSql("DROP TABLE options");
      //});

      return db;
    };

    //select record(s)
    this.find = function(q) {
      var db = this.connect();
      var deferred = $q.defer();

      db.transaction(function(tx) {
        tx.executeSql(q.query, q.attr, function(tx, results){
          deferred.resolve(results);
        });
      });

      return deferred.promise;
    };

    //get api token
    this.token = function () {
      var db = this.connect();
      var deferred = $q.defer();
      var q = {
        query: 'SELECT value FROM options where key="token"',
        attr: []
      }

      db.transaction(function(tx) {
        tx.executeSql(q.query, q.attr, function(tx, results){
          if(results.rows.length > 0)
            deferred.resolve(results.rows[0].value);
        });
      });

      return deferred.promise;
    }

    //export words and categories
    this.export = function() {
      var db = this.connect();
      var deferred = $q.defer();
      var data = {
        categories: [],
        words: []
      };

      db.transaction(function(tx) {

        //get all categories
        tx.executeSql("SELECT * FROM category", [], function(tx, resC){
          if (resC.rows.length > 0) {
            var i, row, count = resC.rows.length;
            for (i = 0; i < count; i++) {
              row = resC.rows.item(i);
              data.categories.push({
                client_id: row.id,
                name: row.name
              });
            }
          }
          deferred.resolve(data);
        });

        //get all words
        tx.executeSql("SELECT * FROM word", [], function(tx, resW){
          if (resW.rows.length > 0) {
            var i, row, count = resW.rows.length;
            for (i = 0; i < count; i++) {
              row = resW.rows.item(i);
              data.words.push({
                category_id: row.category_id,
                name: row.name,
                phonetically: row.phonetically,
                meaning: row.meaning,
                example: !row.example ? null : row.example.split(".").filter(function(n){return n}),
                translate: row.translate,
                favorite: row.favorite
              });
            }
          }
          deferred.resolve(data);
        });

      });
      return deferred.promise;
    };

  });